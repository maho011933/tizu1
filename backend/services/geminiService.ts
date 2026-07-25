import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Gemini SDK 初期化
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * 危険場所の情報から、子供向けのひらがなアドバイスと保護者向けのアドバイスを生成する
 */
export async function generateSafetyAdvice(description: string, type: string) {
  if (!ai || !apiKey || apiKey === 'your_gemini_api_key_here') {
    return {
      forKids: '⚠️ きをつけて とおってね！',
      forAdults: '周辺を通行する際は十分にご注意ください。',
      isMock: true
    };
  }

  try {
    const prompt = `
あなたは子供たちの安全を守るキャラクター「あんぜん博士」です。
以下の危険場所の報告について、2つの視点からアドバイスを作成してください。

1. **子供向けアドバイス (forKids)**:
   - ひらがなメイン（漢字は小学1年生レベルのみ、もしくはルビ風）
   - 親しみやすく優しく教える口調（例: 「〜しようね！」「〜にきをつけてね！」）
   - 40〜70文字程度

2. **保護者・地域大人向けアドバイス (forAdults)**:
   - 具体的な注意点や避けるべき行動、見守りのポイント
   - 60〜100文字程度

【危険情報】
- カテゴリ: ${type}
- 詳しい説明: ${description}

出力形式は必ず以下のJSON形式のみで返してください:
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
    console.error('Gemini Safety Advice Error:', error);
    return {
      forKids: '⚠️ きをつけて とおってね！',
      forAdults: '周辺を通行する際は十分にご注意ください。',
      isMock: true
    };
  }
}

/**
 * ユーザーの簡易入力（テキストや画像）から投稿内容をサポート・補完する
 */
export async function assistHazardInput(userText: string, imagePath?: string) {
  if (!ai || !apiKey || apiKey === 'your_gemini_api_key_here') {
    return {
      suggestedType: 'その他',
      suggestedDescription: userText || '危険な場所があります。',
      isMock: true
    };
  }

  try {
    const contents: any[] = [];

    let prompt = `
地域の危険マップ投稿アシスタントです。ユーザーが入力した内容から、最も適したカテゴリと整理された説明文を生成してください。

利用可能なカテゴリ一覧:
- 工事中
- 不審者
- 事故多発
- 暗い道
- 急な坂・階段
- その他

ユーザーの入力: "${userText}"
`;

    if (imagePath && fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      contents.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      });
      prompt += '\n添付された画像も参考にしてください。';
    }

    contents.push(prompt + `\n\n出力形式は必ず以下のJSON形式のみで返してください:
{
  "suggestedType": "カテゴリ名",
  "suggestedDescription": "分かりやすく整理した説明文"
}`);

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
      suggestedDescription: parsed.suggestedDescription || userText,
      isMock: false
    };
  } catch (error) {
    console.error('Gemini Assist Input Error:', error);
    return {
      suggestedType: 'その他',
      suggestedDescription: userText || '危険な場所があります。',
      isMock: true
    };
  }
}
