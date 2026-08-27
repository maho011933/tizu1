import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// ========================================================
// 1. セキュアな API キー管理 & バリデーション
// ========================================================

/**
 * 環境変数から API キーを検証・サニタイズして取得
 */
function getValidatedApiKey(): string | null {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey) return null;
  const trimmed = rawKey.trim();

  // プレースホルダーや不正な値の除外
  const invalidPlaceholders = [
    'your_gemini_api_key_here',
    'todo',
    'example',
    'xxx',
    'undefined',
    'null'
  ];
  if (invalidPlaceholders.includes(trimmed.toLowerCase())) {
    return null;
  }

  // 最小文字数チェック（通常のGoogle APIキーは39文字前後）
  if (trimmed.length < 10) {
    return null;
  }

  return trimmed;
}

/**
 * ログ出力用: APIキーの機密部分をマスクする（情報漏洩防止）
 */
function maskApiKey(key: string | null): string {
  if (!key) return '(未設定)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

const validatedApiKey = getValidatedApiKey();
const isApiKeyConfigured = Boolean(validatedApiKey);

// Google GenAI クライアント初期化
const ai = isApiKeyConfigured ? new GoogleGenAI({ apiKey: validatedApiKey! }) : null;

// モデル定義（プライマリ & クォータ超過時のフォールバック先）
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';

/**
 * APIキー設定状態・稼働ステータス取得
 */
export function getGeminiStatus() {
  return {
    configured: isApiKeyConfigured,
    primaryModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
    maskedApiKey: maskApiKey(validatedApiKey),
    mode: isApiKeyConfigured ? 'live' : 'smart-fallback',
    features: {
      exponentialBackoff: true,
      modelFallbackCascade: true,
      smartHeuristicFallback: true,
      inMemoryCache: true
    }
  };
}

// ========================================================
// 2. インメモリ キャッシュ機構（API消費削減・レート制限対策）
// ========================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleTtlCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = 10 * 60 * 1000): void {
    // 100件以上の場合は古いものをクリーンアップ
    if (this.cache.size > 200) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now > v.expiresAt) this.cache.delete(k);
      }
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }
}

const memoryCache = new SimpleTtlCache();

// ========================================================
// 3. レジリエンス（再試行・バックオフ・フォールバック）ユーティリティ
// ========================================================

/**
 * 指定ミリ秒スリープ
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * エラーがレート制限 (429 / Quota) または一時的障害 (503 / 500) か判定
 */
function isTransientOrQuotaError(error: any): boolean {
  if (!error) return false;
  const errorMsg = String(error.message || error.statusText || error);
  const status = error.status || error.statusCode || error.httpStatus;
  
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    errorMsg.includes('429') ||
    errorMsg.includes('RESOURCE_EXHAUSTED') ||
    errorMsg.includes('quota') ||
    errorMsg.includes('Rate limit') ||
    errorMsg.includes('overloaded') ||
    errorMsg.includes('fetch failed')
  );
}

/**
 * 安全な JSON パース（Markdownの ```json ... ``` も自動除去）
 */
function safeExtractJson<T>(rawText: string | undefined): T | null {
  if (!rawText) return null;
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return JSON.parse(clean) as T;
  } catch (err) {
    // 正規表現で最初の JSON オブジェクトを探す
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * 指数バックオフ付き Gemini API 実行ラッパー
 */
async function generateWithRetryAndFallback(params: {
  contents: any[];
  schema?: any;
  temperature?: number;
  maxRetries?: number;
}): Promise<string | null> {
  if (!ai) return null;

  const { contents, schema, temperature = 0.3, maxRetries = 2 } = params;
  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];

  for (const model of modelsToTry) {
    let delay = 800; // 初回待機 800ms
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: 'application/json',
            ...(schema ? { responseSchema: schema } : {}),
            temperature,
          }
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (error: any) {
        const isQuotaOrTransient = isTransientOrQuotaError(error);
        console.warn(
          `[GeminiService] Model ${model} Attempt ${attempt + 1}/${maxRetries + 1} failed:`,
          error?.message || error
        );

        if (attempt < maxRetries && isQuotaOrTransient) {
          // ジッター（ランダム要素）を加えた指数バックオフ
          const jitter = Math.floor(Math.random() * 300);
          await sleep(delay + jitter);
          delay *= 2; // 800ms -> 1600ms
        } else {
          // このモデルでの試行終了、次のモデル（FALLBACK_MODEL）へ移行
          break;
        }
      }
    }
  }

  // 全モデル・リトライ失敗
  return null;
}

// ========================================================
// 4. スマート・ヒューリスティック フォールバック エンジン
// （完全オフライン・API制限時でも高精度な解析結果を生成）
// ========================================================

interface HeuristicResult {
  category: 'Traffic' | 'Crime' | 'Disaster' | 'Lighting' | 'Other';
  categoryJapanese: string;
  dangerLevel: number;
  suggestedDescription: string;
  forKidsSummary: string;
  keywords: string[];
  reason: string;
}

function heuristicAnalyzeHazard(text: string): HeuristicResult {
  const lower = (text || '').toLowerCase();

  // 1. Crime (不審者・防犯)
  const crimeKeywords = ['不審者', '知らない人', '声かけ', 'つきまとい', '変な人', '男', '待ち伏せ', '痴漢', '後をつけられた', '怖い人'];
  const matchedCrime = crimeKeywords.filter(k => lower.includes(k.toLowerCase()));
  if (matchedCrime.length > 0) {
    const isUrgent = lower.includes('つきまとい') || lower.includes('後') || lower.includes('声かけ') || lower.includes('触');
    return {
      category: 'Crime',
      categoryJapanese: 'ふしんしゃ・ぼうはん 👮',
      dangerLevel: isUrgent ? 5 : 4,
      suggestedDescription: text.trim() || '不審者の目撃情報があります。通行時は周囲に十分警戒してください。',
      forKidsSummary: 'しらない ひとに こえをかけられても ついていかないで、すぐに おとなに おしえよう！',
      keywords: matchedCrime.length > 0 ? matchedCrime : ['不審者情報', '防犯注意'],
      reason: '防犯・不審者に関連するキーワードが検出されたため、高危険度として判定しました（自動フォールバック）。'
    };
  }

  // 2. Lighting (暗い道・街灯)
  const lightingKeywords = ['暗い', '街灯', 'まっくら', '電灯', '消えてる', 'つかない', '夜道', '薄暗い'];
  const matchedLighting = lightingKeywords.filter(k => lower.includes(k.toLowerCase()));
  if (matchedLighting.length > 0) {
    return {
      category: 'Lighting',
      categoryJapanese: 'くらみち・でんき 💡',
      dangerLevel: 3,
      suggestedDescription: text.trim() || '街灯が暗く、夜間の視界が悪い道路です。反射材等の着用を推奨します。',
      forKidsSummary: 'よるは まっくらで あぶないよ。ひとりであるかず、あかるい みちを とおろう！',
      keywords: matchedLighting.length > 0 ? matchedLighting : ['街灯不点灯', '暗い夜道'],
      reason: '街灯切れや夜間の暗道に関するキーワードが検出されたため判定しました（自動フォールバック）。'
    };
  }

  // 3. Disaster (自然災害・段差・急坂・ブロック塀)
  const disasterKeywords = ['崖', 'がけ', '崩れ', '冠水', '水没', '水たまり', '陥没', '穴', 'ブロック塀', '倒れそう', '段差', '急坂', '階段', '地震', '火事'];
  const matchedDisaster = disasterKeywords.filter(k => lower.includes(k.toLowerCase()));
  if (matchedDisaster.length > 0) {
    const isUrgent = lower.includes('陥没') || lower.includes('崩れ') || lower.includes('倒れそう');
    return {
      category: 'Disaster',
      categoryJapanese: 'じしん・かじ・きけん ⚠️',
      dangerLevel: isUrgent ? 4 : 3,
      suggestedDescription: text.trim() || '道路の破損や自然災害による危険箇所があります。足元に注意してください。',
      forKidsSummary: 'あしもとが あぶないよ！ はしらないで、ゆっくり きをつけて あるこうね。',
      keywords: matchedDisaster.length > 0 ? matchedDisaster : ['足元注意', '道路破損'],
      reason: '路面破損や地形・災害要因のキーワードが検出されたため判定しました（自動フォールバック）。'
    };
  }

  // 4. Traffic (交通・車・工事)
  const trafficKeywords = ['車', 'くるま', 'トラック', 'スピード', '信号', '交差点', '横断歩道', '歩道', '工事', '事故', '自転車', '飛び出し', '見通し'];
  const matchedTraffic = trafficKeywords.filter(k => lower.includes(k.toLowerCase()));
  if (matchedTraffic.length > 0) {
    const isUrgent = lower.includes('事故') || lower.includes('スピード') || lower.includes('飛び出し');
    return {
      category: 'Traffic',
      categoryJapanese: 'くるま・こうつう 🚗',
      dangerLevel: isUrgent ? 4 : 3,
      suggestedDescription: text.trim() || '交通量が多いか工事中のため、車両の往来に十分注意が必要です。',
      forKidsSummary: 'くるまや バイクが たくさん とおるよ。みぎ ひだりを よくみて わたろうね！',
      keywords: matchedTraffic.length > 0 ? matchedTraffic : ['交通安全', '車両注意'],
      reason: '車両・歩道・交通関連のキーワードが検出されたため判定しました（自動フォールバック）。'
    };
  }

  // 5. Other (その他)
  return {
    category: 'Other',
    categoryJapanese: 'そのほか 🎒',
    dangerLevel: 2,
    suggestedDescription: text.trim() || '注意が必要な場所です。周辺に気を配りながら通行してください。',
    forKidsSummary: 'あぶない ばしょが あるよ。まわりを よく みて あるこうね！',
    keywords: ['注意喚起', '地域安全'],
    reason: '一般の注意箇所として安全情報を構成しました（自動フォールバック）。'
  };
}

// ========================================================
// 5. 型定義 & スキーマ定義
// ========================================================

export interface SafetyAdviceResult {
  forKids: string;
  forAdults: string;
  isMock: boolean;
  fallbackReason?: 'rate_limit' | 'no_api_key' | 'error' | 'none';
}

export interface AssistInputResult {
  suggestedType: 'Traffic' | 'Crime' | 'Disaster' | 'Lighting' | 'Other' | string;
  categoryJapanese: string;
  dangerLevel: number;
  suggestedDescription: string;
  forKidsSummary: string;
  detectedHazardsFromImage?: string[];
  keywords: string[];
  reason: string;
  isMock: boolean;
  fallbackReason?: 'rate_limit' | 'no_api_key' | 'error' | 'none';
}

export interface AreaSummaryResult {
  summaryTitle: string;
  forKidsSummary: string;
  forAdultsSummary: string;
  keyPoints: string[];
  isMock: boolean;
  fallbackReason?: 'rate_limit' | 'no_api_key' | 'error' | 'none';
}

// 構造化出力スキーマ: 投稿アシスト
const hazardAssistSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ['Traffic', 'Crime', 'Disaster', 'Lighting', 'Other'],
      description: '最も適切なハザードカテゴリ',
    },
    categoryJapanese: {
      type: Type.STRING,
      description: 'カテゴリの日本語表記',
    },
    dangerLevel: {
      type: Type.INTEGER,
      description: '危険度レベル（1:軽微 〜 5:極めて危険）',
    },
    suggestedDescription: {
      type: Type.STRING,
      description: '整理・要約した分かりやすい状況説明文（50〜100文字）',
    },
    forKidsSummary: {
      type: Type.STRING,
      description: '子供向けのアドバイス（ひらがな中心、30〜60文字）',
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '主要な危険キーワード（2〜4個）',
    },
    detectedHazardsFromImage: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '画像から検出された具体的な危険要素',
    },
    reason: {
      type: Type.STRING,
      description: '判定理由（30〜80文字）',
    },
  },
  required: ['category', 'categoryJapanese', 'dangerLevel', 'suggestedDescription', 'forKidsSummary', 'keywords', 'reason'],
};

// 構造化出力スキーマ: 安全アドバイス
const safetyAdviceSchema = {
  type: Type.OBJECT,
  properties: {
    forKids: {
      type: Type.STRING,
      description: '子供向けのひらがな安全アドバイス（40〜80文字）',
    },
    forAdults: {
      type: Type.STRING,
      description: '保護者・地域大人向けの具体的な注意点（60〜120文字）',
    },
  },
  required: ['forKids', 'forAdults'],
};

// ========================================================
// 6. 公開 API メソッド
// ========================================================

/**
 * 危険場所の情報から、子供向け・保護者向けのアドバイスを生成する
 */
export async function generateSafetyAdvice(
  description: string,
  type: string
): Promise<SafetyAdviceResult> {
  const cacheKey = `advice_${type}_${description.slice(0, 50)}`;
  const cached = memoryCache.get<SafetyAdviceResult>(cacheKey);
  if (cached) return cached;

  if (!isApiKeyConfigured || !ai) {
    const heuristic = heuristicAnalyzeHazard(`${type} ${description}`);
    const result: SafetyAdviceResult = {
      forKids: heuristic.forKidsSummary,
      forAdults: `${description || '危険箇所'}の周辺を通行する際はご注意ください。お子様への見守りをお願いします。`,
      isMock: true,
      fallbackReason: 'no_api_key'
    };
    memoryCache.set(cacheKey, result);
    return result;
  }

  const prompt = `
あなたは子供たちの安全を守る地域安全キャラクター「あんぜん博士」です。
以下の危険場所の報告について、子供と大人の2つの視点から的確で温かいアドバイスを作成してください。

1. **子供向けアドバイス (forKids)**:
   - ひらがなメイン（漢字は小学1年生レベルのみ）
   - 優しく教える口調（例: 「〜しようね！」「〜にきをつけてね！」）
   - 40〜80文字程度

2. **保護者・地域大人向けアドバイス (forAdults)**:
   - 具体的な注意点や避けるべき行動、見守りのポイント
   - 60〜120文字程度

【危険情報】
- カテゴリ: ${type}
- 詳しい説明: ${description}
`;

  const rawJson = await generateWithRetryAndFallback({
    contents: [prompt],
    schema: safetyAdviceSchema,
    temperature: 0.3
  });

  if (rawJson) {
    const parsed = safeExtractJson<{ forKids: string; forAdults: string }>(rawJson);
    if (parsed && parsed.forKids && parsed.forAdults) {
      const result: SafetyAdviceResult = {
        forKids: parsed.forKids,
        forAdults: parsed.forAdults,
        isMock: false,
        fallbackReason: 'none'
      };
      memoryCache.set(cacheKey, result);
      return result;
    }
  }

  // API 制限・エラー時のスマートフォールバック
  const heuristic = heuristicAnalyzeHazard(`${type} ${description}`);
  const fallbackResult: SafetyAdviceResult = {
    forKids: heuristic.forKidsSummary,
    forAdults: `${description || '周辺'}を通行する際は十分にご注意ください。`,
    isMock: true,
    fallbackReason: 'rate_limit'
  };
  memoryCache.set(cacheKey, fallbackResult, 2 * 60 * 1000); // 制限時は2分間キャッシュ
  return fallbackResult;
}

/**
 * ユーザーの簡易・曖昧な入力テキスト（および添付画像）から
 * 「カテゴリ」「危険度(1〜5)」「状況要約」「キーワード」「子供向けアドバイス」を高精度抽出する
 */
export async function assistHazardInput(
  userText: string,
  imagePath?: string
): Promise<AssistInputResult> {
  // APIキー未設定時はスマートヒューリスティックを即返却
  if (!isApiKeyConfigured || !ai) {
    const heuristic = heuristicAnalyzeHazard(userText);
    return {
      suggestedType: heuristic.category,
      categoryJapanese: heuristic.categoryJapanese,
      dangerLevel: heuristic.dangerLevel,
      suggestedDescription: heuristic.suggestedDescription,
      forKidsSummary: heuristic.forKidsSummary,
      keywords: heuristic.keywords,
      reason: heuristic.reason,
      isMock: true,
      fallbackReason: 'no_api_key'
    };
  }

  try {
    const contents: any[] = [];

    let promptText = `
あなたは地域安全マップの投稿解析アシスタントです。
ユーザーから寄せられた曖昧・断片的な投稿テキスト${imagePath ? 'および添付写真' : ''}を分析し、
正確な「カテゴリ」「危険度レベル」「状況要約」「子供向けアドバイス」「キーワード」「判定理由」をJSON形式で抽出してください。

【利用可能なカテゴリ】
- "Traffic" : くるま・こうつう（車・バイクのスピード超過、見通しの悪い交差点、歩道なし、道路工事、事故多発）
- "Crime" : ふしんしゃ・ぼうはん（不審者、声かけ、つきまとい、痴漢、のぞき、危険な集まり）
- "Lighting" : くらみち・でんき（街灯切れ、極端に暗い夜道、死角が多い路地）
- "Disaster" : じしん・かじ・きけん（崖崩れ、冠水、倒木、道路の陥没、壊れかけたブロック塀、急な坂・階段）
- "Other" : そのほか（スズメバチ・カラス・野良犬、悪臭、ゴミの散乱など）

【危険度判定基準 (dangerLevel: 1〜5)】
- レベル 5 (極めて危険): 直ちに生命や身体に重大な危険がある
- レベル 4 (危険): 事故や被害のリスクが高い
- レベル 3 (注意): 日常的に注意が必要
- レベル 2 (やや注意): 軽微な危険
- レベル 1 (低危険度): 念のための情報共有

【分析対象のユーザー入力】
テキスト: "${userText || '（テキスト入力なし・写真から状況を判定してください）'}"
`;

    if (imagePath && fs.existsSync(imagePath)) {
      try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const ext = imagePath.toLowerCase();
        const mimeType = ext.endsWith('.png') ? 'image/png' : ext.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

        contents.push({
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        });
        promptText += '\n※添付写真も視覚的に精査し、道路状況、工事用具、照明設備、障害物などの危険要素を detectedHazardsFromImage に抽出し、カテゴリと危険度判定に反映してください。';
      } catch (err) {
        console.warn('[GeminiService] Image load warning:', err);
      }
    }

    contents.push(promptText);

    const rawJson = await generateWithRetryAndFallback({
      contents,
      schema: hazardAssistSchema,
      temperature: 0.2
    });

    if (rawJson) {
      const parsed = safeExtractJson<any>(rawJson);
      if (parsed && parsed.category) {
        return {
          suggestedType: parsed.category || 'Other',
          categoryJapanese: parsed.categoryJapanese || 'そのほか',
          dangerLevel: typeof parsed.dangerLevel === 'number' ? Math.min(Math.max(parsed.dangerLevel, 1), 5) : 3,
          suggestedDescription: parsed.suggestedDescription || userText || '危険な場所があります。',
          forKidsSummary: parsed.forKidsSummary || 'きをつけて とおってね！',
          detectedHazardsFromImage: parsed.detectedHazardsFromImage || [],
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          reason: parsed.reason || 'Gemini AI判定に基づく状況解析です。',
          isMock: false,
          fallbackReason: 'none'
        };
      }
    }
  } catch (error) {
    console.error('[GeminiService] Assist Input Pipeline Error:', error);
  }

  // 障害・レート制限時のフォールバック
  const heuristic = heuristicAnalyzeHazard(userText);
  return {
    suggestedType: heuristic.category,
    categoryJapanese: heuristic.categoryJapanese,
    dangerLevel: heuristic.dangerLevel,
    suggestedDescription: heuristic.suggestedDescription,
    forKidsSummary: heuristic.forKidsSummary,
    keywords: heuristic.keywords,
    reason: `${heuristic.reason}（AI制限時の自動解析）`,
    isMock: true,
    fallbackReason: 'rate_limit'
  };
}

/**
 * 周辺の複数の危険情報を集約し、エリア全体の安全サマリーを生成する
 */
export async function generateAreaSummary(
  hazards: Array<{ type: string; description: string; lat?: number; lng?: number }>
): Promise<AreaSummaryResult> {
  const cacheKey = `summary_${hazards.length}_${hazards.map(h => h.type).sort().join('_')}`;
  const cached = memoryCache.get<AreaSummaryResult>(cacheKey);
  if (cached) return cached;

  if (!isApiKeyConfigured || !ai || hazards.length === 0) {
    const result: AreaSummaryResult = {
      summaryTitle: '地域あんぜんサマリー',
      forKidsSummary: 'みんなで あんぜんに きをつけて あるこうね！',
      forAdultsSummary: '周辺には複数の注意箇所があります。登下校時や夜間の見守りをお願いします。',
      keyPoints: ['交通量の多い場所に注意', '暗い道は保護者と一緒に歩く', '防犯ブザーを身につける'],
      isMock: true,
      fallbackReason: isApiKeyConfigured ? 'none' : 'no_api_key'
    };
    memoryCache.set(cacheKey, result);
    return result;
  }

  const hazardListText = hazards
    .slice(0, 12)
    .map((h, i) => `${i + 1}. [${h.type}] ${h.description}`)
    .join('\n');

  const prompt = `
地域安全アドバイザーとして、以下の近隣危険情報をまとめ、地域全体の安全ガイドラインを作成してください。

【周辺の危険情報一覧】
${hazardListText}
`;

  const areaSummarySchema = {
    type: Type.OBJECT,
    properties: {
      summaryTitle: { type: Type.STRING, description: 'エリアの全体傾向を表す親しみやすいタイトル' },
      forKidsSummary: { type: Type.STRING, description: '子供向けのひらがなまとめメッセージ（50文字前後）' },
      forAdultsSummary: { type: Type.STRING, description: '保護者・地域大人向けの具体的な注意点（80〜120文字）' },
      keyPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '特に注意すべきポイント（2〜3箇条）'
      }
    },
    required: ['summaryTitle', 'forKidsSummary', 'forAdultsSummary', 'keyPoints']
  };

  const rawJson = await generateWithRetryAndFallback({
    contents: [prompt],
    schema: areaSummarySchema,
    temperature: 0.3
  });

  if (rawJson) {
    const parsed = safeExtractJson<any>(rawJson);
    if (parsed && parsed.summaryTitle) {
      const result: AreaSummaryResult = {
        summaryTitle: parsed.summaryTitle,
        forKidsSummary: parsed.forKidsSummary || 'みんなで あんぜんに あるこう！',
        forAdultsSummary: parsed.forAdultsSummary || '周辺の危険箇所に留意してください。',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ['交通安全の徹底', '夜間の見守り'],
        isMock: false,
        fallbackReason: 'none'
      };
      memoryCache.set(cacheKey, result, 15 * 60 * 1000); // 15分キャッシュ
      return result;
    }
  }

  // フォールバック
  const fallback: AreaSummaryResult = {
    summaryTitle: '地域あんぜんサマリー（注意喚起）',
    forKidsSummary: 'まわりを よく みて、あぶない ところには ちかづかないように しようね！',
    forAdultsSummary: '周辺エリアに危険報告があります。通学路等の安全確認と見守りをお願いします。',
    keyPoints: ['通学路の安全確認', '見通しの悪い交差点での一時停止', '暗い道の迂回'],
    isMock: true,
    fallbackReason: 'rate_limit'
  };
  memoryCache.set(cacheKey, fallback, 3 * 60 * 1000);
  return fallback;
}

/**
 * あんぜん博士とのQ&Aチャット
 */
export async function askSafetyQuestion(
  question: string,
  contextHazards?: any[]
): Promise<{ answerForKids: string; answerForAdults: string; isMock: boolean; fallbackReason?: string }> {
  const cacheKey = `chat_${question.trim().toLowerCase()}`;
  const cached = memoryCache.get<any>(cacheKey);
  if (cached) return cached;

  if (!isApiKeyConfigured || !ai) {
    const result = {
      answerForKids: 'みぎ ひだりを よくみて、あぶない ところには ちかづかないように しようね！ 🎒',
      answerForAdults: '交通ルールと防犯マナーを守り、お子様と一緒に安全な通学ルートをご確認ください。',
      isMock: true,
      fallbackReason: 'no_api_key'
    };
    memoryCache.set(cacheKey, result);
    return result;
  }

  const contextText = contextHazards && contextHazards.length > 0
    ? `\n【近くの危険箇所情報】\n` + contextHazards.slice(0, 5).map(h => `- [${h.type}] ${h.description}`).join('\n')
    : '';

  const prompt = `
あなたは子供たちの安全を守る「あんぜん博士」です。
ユーザーからの質問に対して、子供向け回答と保護者向け回答を作成してください。
${contextText}

質問: "${question}"
`;

  const chatSchema = {
    type: Type.OBJECT,
    properties: {
      answerForKids: { type: Type.STRING, description: 'ひらがな多め・親切で分かりやすい子供向け回答（50〜80文字）' },
      answerForAdults: { type: Type.STRING, description: '保護者・地域のおとな向けの具体的アドバイス（80〜120文字）' }
    },
    required: ['answerForKids', 'answerForAdults']
  };

  const rawJson = await generateWithRetryAndFallback({
    contents: [prompt],
    schema: chatSchema,
    temperature: 0.4
  });

  if (rawJson) {
    const parsed = safeExtractJson<any>(rawJson);
    if (parsed && parsed.answerForKids && parsed.answerForAdults) {
      const result = {
        answerForKids: parsed.answerForKids,
        answerForAdults: parsed.answerForAdults,
        isMock: false,
        fallbackReason: 'none'
      };
      memoryCache.set(cacheKey, result, 10 * 60 * 1000);
      return result;
    }
  }

  // フォールバック
  const fallback = {
    answerForKids: 'あぶない ところには ちかづかないで、大人のひとと いっしょに あるこうね！ 🎒',
    answerForAdults: '安全第一で行動いただくようお願いします。危険を感じたら速やかに大人や警察・110番へ相談してください。',
    isMock: true,
    fallbackReason: 'rate_limit'
  };
  memoryCache.set(cacheKey, fallback, 2 * 60 * 1000);
  return fallback;
}

