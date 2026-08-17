import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Gemini SDK 初期化
const apiKey = process.env.GEMINI_API_KEY;
const isApiKeyConfigured = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here');
const ai = isApiKeyConfigured ? new GoogleGenAI({ apiKey: apiKey! }) : null;

export function getGeminiStatus() {
  return {
    configured: isApiKeyConfigured,
    model: 'gemini-2.5-flash',
    mode: isApiKeyConfigured ? 'live' : 'mock'
  };
}

export interface SafetyAdviceResult {
  forKids: string;
  forAdults: string;
  isMock: boolean;
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
}

export interface AreaSummaryResult {
  summaryTitle: string;
  forKidsSummary: string;
  forAdultsSummary: string;
  keyPoints: string[];
  isMock: boolean;
}

// 構造化出力用スキーマ定義: 投稿アシスト・危険度解析
const hazardAssistSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ['Traffic', 'Crime', 'Disaster', 'Lighting', 'Other'],
      description: '最も適切なハザードカテゴリ (Traffic: 交通・工事, Crime: 不審者・防犯, Disaster: 災害・急坂・段差, Lighting: 暗い道・街灯, Other: その他)',
    },
    categoryJapanese: {
      type: Type.STRING,
      description: 'カテゴリの日本語ラベル（例: くるま・こうつう、ふしんしゃ・ぼうはん、くらみち・でんき、じしん・かじ・きけん、そのほか）',
    },
    dangerLevel: {
      type: Type.INTEGER,
      description: '危険度レベル（1:軽微 〜 5:極めて危険）',
    },
    suggestedDescription: {
      type: Type.STRING,
      description: '曖昧な投稿を整理・要約した分かりやすい状況説明文（50〜100文字）',
    },
    forKidsSummary: {
      type: Type.STRING,
      description: '子供向けのアドバイス・注意点（ひらがな中心、やさしい口調、30〜60文字）',
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '投稿から抽出された主要な危険キーワード（2〜4個）',
    },
    detectedHazardsFromImage: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '画像が提供された場合に検出された具体的な危険要素（画像がない場合は空配列）',
    },
    reason: {
      type: Type.STRING,
      description: 'カテゴリおよび危険度レベルを判定した根拠（30〜80文字）',
    },
  },
  required: ['category', 'categoryJapanese', 'dangerLevel', 'suggestedDescription', 'forKidsSummary', 'keywords', 'reason'],
};

// 構造化出力用スキーマ定義: 安全アドバイス生成
const safetyAdviceSchema = {
  type: Type.OBJECT,
  properties: {
    forKids: {
      type: Type.STRING,
      description: '子供向けのひらがな中心の安全アドバイス（40〜80文字）',
    },
    forAdults: {
      type: Type.STRING,
      description: '保護者・地域大人向けの具体的な注意点（60〜120文字）',
    },
  },
  required: ['forKids', 'forAdults'],
};

/**
 * 危険場所の情報から、子供向け・保護者向けのアドバイスを生成する
 */
export async function generateSafetyAdvice(
  description: string,
  type: string
): Promise<SafetyAdviceResult> {
  if (!ai) {
    return {
      forKids: '⚠️ きをつけて とおってね！ まわりを よく みて あるこう。',
      forAdults: '周辺を通行する際は十分にご注意ください。お子様にも声をかけて通らせてください。',
      isMock: true
    };
  }

  try {
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: safetyAdviceSchema,
        temperature: 0.3,
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return {
      forKids: parsed.forKids || 'きをつけて とおってね！',
      forAdults: parsed.forAdults || '周辺を通行する際はご注意ください。',
      isMock: false
    };
  } catch (error) {
    console.error('[GeminiService] Safety Advice Error:', error);
    return {
      forKids: '⚠️ きをつけて とおってね！ まわりを よく みて あるこう。',
      forAdults: '周辺を通行する際は十分にご注意ください。',
      isMock: true
    };
  }
}

/**
 * ユーザーの簡易・曖昧な入力テキスト（および添付画像）から
 * 「カテゴリ」「危険度(1〜5)」「状況要約」「キーワード」「子供向けアドバイス」を高精度抽出する
 */
export async function assistHazardInput(
  userText: string,
  imagePath?: string
): Promise<AssistInputResult> {
  if (!ai) {
    return {
      suggestedType: 'Other',
      categoryJapanese: 'そのほか',
      dangerLevel: 3,
      suggestedDescription: userText || '危険な場所があります。気をつけて通りましょう。',
      forKidsSummary: 'あぶない ばしょが あるよ。きをつけて とおってね！',
      keywords: ['注意'],
      reason: 'Gemini APIキーが未設定のため、初期値を提供しています。',
      isMock: true
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
- レベル 5 (極めて危険): 直ちに生命や身体に重大な危険がある（例: 不審者によるつきまとい・声かけ、大きな道路陥没、崩落の危険）
- レベル 4 (危険): 事故や被害のリスクが高い（例: 交通量の多い見通しの悪い丁字路、完全に真っ暗で逃げ場のない小道）
- レベル 3 (注意): 日常的に注意が必要（例: 工事で歩道が塞がれている、街灯が一部切れている、急な坂道や段差）
- レベル 2 (やや注意): 軽微な危険（例: 雨の日に滑りやすいマンホール、少し狭い路地）
- レベル 1 (低危険度): 念のための情報共有（例: 見通しは悪くないが注意喚起したい場所）

【Few-Shot 学習例】
入力: "昨日夜ここ通ったら街灯消えてて真っ暗で変な男の人がずっと立っててマジで怖かった"
出力:
{
  "category": "Crime",
  "categoryJapanese": "ふしんしゃ・ぼうはん 👮",
  "dangerLevel": 4,
  "suggestedDescription": "夜間に街灯が消えており視界が悪く、不審者が長時間滞留していたとの目撃情報があります。",
  "forKidsSummary": "よるは まっくらで あぶないよ。ひとりであるかず、ちがう みちを とおろう！",
  "keywords": ["街灯切れ", "暗い道", "不審者目撃"],
  "detectedHazardsFromImage": [],
  "reason": "不審者の目撃と街灯消灯による暗闇が重複しており、防犯上の危険性が高いためCrime・危険度4と判定。"
}

入力: "水道工事やってて通学路なのに歩道歩けない"
出力:
{
  "category": "Traffic",
  "categoryJapanese": "くるま・こうつう 🚗",
  "dangerLevel": 3,
  "suggestedDescription": "水道工事のため歩道が封鎖されており、車道側を通行する必要があります。車の往来に注意してください。",
  "forKidsSummary": "こうじで みちが せまいよ。くるまが きていないか よく みて あるこう！",
  "keywords": ["水道工事", "歩道封鎖", "通学路"],
  "detectedHazardsFromImage": [],
  "reason": "通学路で歩行者が車道に出る必要があり、交通危険が高まるためTraffic・危険度3と判定。"
}

---
【分析対象のユーザー入力】
テキスト: "${userText || '（テキスト入力なし・写真から状況を判定してください）'}"
`;

    if (imagePath && fs.existsSync(imagePath)) {
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
    }

    contents.push(promptText);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: hazardAssistSchema,
        temperature: 0.2, // ブレを抑えて一貫した判定を行う
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return {
      suggestedType: parsed.category || 'Other',
      categoryJapanese: parsed.categoryJapanese || 'そのほか',
      dangerLevel: typeof parsed.dangerLevel === 'number' ? Math.min(Math.max(parsed.dangerLevel, 1), 5) : 3,
      suggestedDescription: parsed.suggestedDescription || userText || '危険な場所があります。',
      forKidsSummary: parsed.forKidsSummary || 'きをつけて とおってね！',
      detectedHazardsFromImage: parsed.detectedHazardsFromImage || [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      reason: parsed.reason || 'AI判定に基づく状況解析です。',
      isMock: false
    };
  } catch (error) {
    console.error('[GeminiService] Assist Input Error:', error);
    return {
      suggestedType: 'Other',
      categoryJapanese: 'そのほか',
      dangerLevel: 3,
      suggestedDescription: userText || '危険な場所があります。',
      forKidsSummary: 'あぶない ところには きをつけてね！',
      keywords: ['注意'],
      reason: 'AI判定処理でエラーが発生したため、デフォルト値を返します。',
      isMock: true
    };
  }
}

/**
 * 周辺の複数の危険情報を集約し、エリア全体の安全サマリーを生成する
 */
export async function generateAreaSummary(
  hazards: Array<{ type: string; description: string; lat?: number; lng?: number }>
): Promise<AreaSummaryResult> {
  if (!ai || hazards.length === 0) {
    return {
      summaryTitle: '地域安全サマリー',
      forKidsSummary: 'みんなで あんぜんに きをつけて あるこうね！',
      forAdultsSummary: '周辺には複数の注意箇所があります。登下校時や夜間の見守りをおすすめします。',
      keyPoints: ['交通量の多い場所に注意', '暗い道は保護者と一緒に'],
      isMock: true
    };
  }

  try {
    const hazardListText = hazards
      .slice(0, 10)
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: areaSummarySchema,
        temperature: 0.3
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      summaryTitle: parsed.summaryTitle || '地域安全サマリー',
      forKidsSummary: parsed.forKidsSummary || 'みんなで あんぜんに きをつけて あるこうね！',
      forAdultsSummary: parsed.forAdultsSummary || '周辺の危険箇所に留意し通学路等の見守りをお願いします。',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ['交通安全の徹底', '夜間の一人歩き回避'],
      isMock: false
    };
  } catch (error) {
    console.error('[GeminiService] Area Summary Error:', error);
    return {
      summaryTitle: '地域安全サマリー',
      forKidsSummary: 'みんなで あんぜんに きをつけて あるこうね！',
      forAdultsSummary: '周辺には注意すべき場所があります。',
      keyPoints: ['交通安全の徹底', '防犯への配慮'],
      isMock: true
    };
  }
}

/**
 * あんぜん博士とのQ&Aチャット
 */
export async function askSafetyQuestion(
  question: string,
  contextHazards?: any[]
): Promise<{ answerForKids: string; answerForAdults: string; isMock: boolean }> {
  if (!ai) {
    return {
      answerForKids: 'みぎ ひだりを よくみて、あぶない ところには ちかづかないように しようね！',
      answerForAdults: '安全なルートを選択し、交通ルールを守って行動するようお子様とお話し合いください。',
      isMock: true
    };
  }

  try {
    const contextText = contextHazards && contextHazards.length > 0
      ? `\n【近くの危険箇所情報】\n` + contextHazards.map(h => `- [${h.type}] ${h.description}`).join('\n')
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: chatSchema,
        temperature: 0.4
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      answerForKids: parsed.answerForKids || 'きをつけて とおろうね！',
      answerForAdults: parsed.answerForAdults || '安全の確保にご配慮ください。',
      isMock: false
    };
  } catch (error) {
    console.error('[GeminiService] Q&A Error:', error);
    return {
      answerForKids: 'あぶない ところには ちかづかないで、大人のひとと いっしょに あるこうね！',
      answerForAdults: '安全第一で行動いただくようお願いします。',
      isMock: true
    };
  }
}
