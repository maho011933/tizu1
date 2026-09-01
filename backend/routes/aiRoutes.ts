import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getGeminiStatus,
  generateSafetyAdvice,
  assistHazardInput,
  generateAreaSummary,
  askSafetyQuestion
} from '../services/geminiService.js';

const router = Router();

// 画像アップロード設定（入力アシスト機能用）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `ai_assist_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

/**
 * GET /api/ai/status
 * Gemini APIの動作ステータス（実APIキー動作中かモック動作中か）を取得
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = getGeminiStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'ステータスの取得に失敗しました' });
  }
});

/**
 * POST /api/ai/advice
 * 個別の危険情報に対するAI安全アドバイス（子供向け/保護者向け）の生成
 * Body: { description: string, type: string }
 */
router.post('/advice', async (req: Request, res: Response) => {
  const { description, type } = req.body;
  if (!description || !type) {
    return res.status(400).json({ error: 'description と type は必須項目です。' });
  }

  try {
    const result = await generateSafetyAdvice(description, type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'AIアドバイスの生成処理に失敗しました。' });
  }
});

/**
 * POST /api/ai/assist
 * 新規危険投稿の自動分類・詳細補完・画像認識（マルチモーダル）
 * Form-Data: text (string), image (file)
 */
router.post('/assist', upload.single('image'), async (req: Request, res: Response) => {
  const { text } = req.body;
  const imagePath = req.file ? req.file.path : undefined;

  try {
    const result = await assistHazardInput(text || '', imagePath);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '入力アシスト・AI解析処理に失敗しました。' });
  }
});

/**
 * POST /api/ai/summary
 * 指定されたエリア内の複数危険情報からエリア全体の安全サマリーを生成
 * Body: { hazards: Array<{ type: string, description: string }> }
 */
router.post('/summary', async (req: Request, res: Response) => {
  const { hazards } = req.body;
  if (!Array.isArray(hazards)) {
    return res.status(400).json({ error: 'hazards 配列は必須項目です。' });
  }

  try {
    const summary = await generateAreaSummary(hazards);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'エリアサマリーの生成に失敗しました。' });
  }
});

/**
 * POST /api/ai/chat
 * あんぜん博士に対する質問応答（Q&A機能）
 * Body: { question: string, contextHazards?: Array<any> }
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { question, contextHazards } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'question は必須項目です。' });
  }

  try {
    const answer = await askSafetyQuestion(question, contextHazards);
    res.json(answer);
  } catch (error) {
    res.status(500).json({ error: 'Q&A処理に失敗しました。' });
  }
});

export default router;
