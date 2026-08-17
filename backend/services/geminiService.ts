import { GoogleGenAI } from '@google/genai';
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
  suggestedType: string;
  dangerLevel: number;
  suggestedDescription: string;
  detectedHazardsFromImage?: string[];
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
あなたは子供たちの安全を守るキャラクター「あんぜん博士」です。
以下の危険場所の報告について、2つの視点からアドバイスを作成してください。

1. **子供向けアドバイス (forKids)**:
   - ひらがなメイン（漢字は小学1年生レベルのみ、わかりやすく）
   - 親しみやすく優しく教える口調（例: 「〜しようね！」「〜にきをつけてね！」）
   - 40〜80文字程度

2. **保護者・地域大人向けアドバイス (forAdults)**:
   - 具体的な注意点や避けるべき行動、見守りのポイント
   - 60〜120文字程度

【危険情報】
- カテゴリ: ${type}
- 詳しい説明: ${description}

出力形式は必ず以下のJSON形式のみで返してください (Markdown記法は含めないでください):
{
  "forKids": "...",
  "forAdults": "..."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
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
 * ユーザーの簡易入力（テキストおよび添付画像）から投稿内容を補完・マルチモーダル解析する
 */
export async function assistHazardInput(
  userText: string,
  imagePath?: string
): Promise<AssistInputResult> {
  if (!ai) {
    return {
      suggestedType: 'その他',
      dangerLevel: 3,
      suggestedDescription: userText || '危険な場所があります。気をつけて通りましょう。',
      reason: 'Gemini APIキーが未設定のため、初期値を提供しています。',
      isMock: true
    };
  }

  try {
    const contents: any[] = [];

    let promptText = `
あなたは地域の安全マップ投稿アシスタントです。
ユーザーの入力テキスト${imagePath ? 'および添付画像' : ''}を分析し、以下の情報をJSON形式で返してください。

利用可能なカテゴリ一覧:
- 工事中
- 不審者
- 事故多発
- 暗い道
- 急な坂・階段
- その他

危険度レベル (dangerLevel): 1(軽微) 〜 5(非常に危険)

ユーザー入力テキスト: "${userText || '（入力なし）'}"
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
      promptText += '\n※添付画像からも危険物や状況（工事フェンス、街灯のなさ、見通しの悪い交差点等）を自動分析してください。';
    }

    promptText += `

出力形式は必ず以下のJSON形式のみで返してください:
{
  "suggestedType": "上記カテゴリのいずれか",
  "dangerLevel": 3,
  "suggestedDescription": "整理され子供・保護者にもわかりやすい説明文",
  "detectedHazardsFromImage": ["画像から見つかった危険要素1", "危険要素2"],
  "reason": "分類・危険度の根拠"
}
`;

    contents.push(promptText);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return {
      suggestedType: parsed.suggestedType || 'その他',
      dangerLevel: typeof parsed.dangerLevel === 'number' ? Math.min(Math.max(parsed.dangerLevel, 1), 5) : 3,
      suggestedDescription: parsed.suggestedDescription || userText || '危険な場所があります。',
      detectedHazardsFromImage: parsed.detectedHazardsFromImage || [],
      reason: parsed.reason || 'AI判定に基づく入力補助です。',
      isMock: false
    };
  } catch (error) {
    console.error('[GeminiService] Assist Input Error:', error);
    return {
      suggestedType: 'その他',
      dangerLevel: 3,
      suggestedDescription: userText || '危険な場所があります。',
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

出力形式は以下のJSONのみにしてください:
{
  "summaryTitle": "全体を表す分かりやすいタイトル",
  "forKidsSummary": "子供向けのひらがなまとめメッセージ（50文字前後）",
  "forAdultsSummary": "保護者向けの地域安全注意点（100文字前後）",
  "keyPoints": ["重要なポイント1", "重要なポイント2", "重要なポイント3"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
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
export async function askSafetyQuestion(question: string, contextHazards?: any[]): Promise<{ answerForKids: string; answerForAdults: string; isMock: boolean }> {
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

出力形式 (JSON):
{
  "answerForKids": "ひらがな多め・親切で短い回答",
  "answerForAdults": "保護者・地域のおとな向けの具体的なアドバイス"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
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
