import express from 'express';
import type { Response, Request } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';

import { pool, isDbConnected, initializeDatabase, calculateHaversineDistanceMeters } from './db.js';
import type { HazardData } from './db.js';
import { buildChildFriendlyAlert } from './alerts.js';
import type { AlertNotification, LocationTriggerResponse } from './alerts.js';
import { generateHazardStatistics } from './stats.js';
import { uploadImage } from './services/storageService.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const DATA_FILE = process.env.HAZARDS_DATA_FILE || path.join(__dirname, 'data', 'hazards.json');
const FEEDBACK_FILE = path.join(__dirname, 'data', 'feedback.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// アップロードディレクトリの作成
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer 設定
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WEBP images are allowed.'));
    }
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// SSE (Server-Sent Events) クライアント接続の管理
const sseClients = new Set<Response>();

function broadcastAlert(responsePayload: LocationTriggerResponse) {
  const data = `data: ${JSON.stringify(responsePayload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// 補助関数: 画像URLの生成
const getImageUrl = (req: Request, filename: string) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${filename}`;
};

// 補助関数: hazards.json の読み書き（フォールバック用）
function readLocalHazards(): any[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

function writeLocalHazards(hazards: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(hazards, null, 2), 'utf8');
}

// Gemini AI モジュールルーター
app.use('/api/ai', aiRoutes);

/**
 * 📍 全ての危険箇所を取得 (DB or hazards.json)
 * GET /api/hazards
 */
app.get('/api/hazards', async (_req, res) => {
  try {
    if (isDbConnected()) {
      const result = await pool.query(`
        SELECT 
          id,
          type,
          description,
          image_url AS "imageUrl",
          ST_Y(geom) AS lat,
          ST_X(geom) AS lng,
          COALESCE(comments, '[]'::jsonb) AS comments,
          created_at AS "createdAt"
        FROM hazards
        ORDER BY id ASC;
      `);
      return res.json(result.rows);
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    res.json(hazards);
  } catch (err: any) {
    console.error('Error reading hazards:', err);
    res.status(500).json({ error: 'Error reading data', details: err.message });
  }
});

/**
 * 📍 新規危険箇所の投稿
 * POST /api/hazards
 */
app.post('/api/hazards', upload.single('image'), async (req, res) => {
  try {
    const { lat, lng, type, description, level, timeOfDay, dangerLevel } = req.body;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    let imageUrl: string | null = null;
    if (req.file) {
      const uploadResult = await uploadImage(req.file, PORT);
      imageUrl = uploadResult.url;
    }

    const hazardLevel = level ? parseInt(level) : (dangerLevel ? parseInt(dangerLevel) : 3);
    const hazardTime = timeOfDay || 'all';

    if (isDbConnected()) {
      const result = await pool.query(
        `INSERT INTO hazards (type, description, image_url, comments, geom)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
         RETURNING id, type, description, image_url AS "imageUrl", ST_Y(geom) AS lat, ST_X(geom) AS lng, comments;`,
        [type, description, imageUrl, JSON.stringify([]), parsedLng, parsedLat]
      );
      const newHazard = {
        ...result.rows[0],
        level: hazardLevel,
        timeOfDay: hazardTime
      };

      // hazards.json もバックアップ同期
      const localHazards = readLocalHazards();
      localHazards.push(newHazard);
      writeLocalHazards(localHazards);

      return res.status(201).json(newHazard);
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    const newId = hazards.length > 0 ? Math.max(...hazards.map((h: any) => h.id || 0)) + 1 : 1;
    const newHazard = {
      id: newId,
      lat: parsedLat,
      lng: parsedLng,
      type,
      description,
      level: hazardLevel,
      timeOfDay: hazardTime,
      imageUrl,
      comments: []
    };

    hazards.push(newHazard);
    writeLocalHazards(hazards);
    res.status(201).json(newHazard);
  } catch (err: any) {
    console.error('Error creating hazard:', err);
    res.status(500).json({ error: 'Error saving data', details: err.message });
  }
});

/**
 * 📍 危険箇所の更新
 * PUT /api/hazards/:id
 */
app.put('/api/hazards/:id', upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { type, description, level, timeOfDay, dangerLevel } = req.body;

    let imageUrl: string | null = req.body.imageUrl === 'null' ? null : req.body.imageUrl;
    if (req.file) {
      const uploadResult = await uploadImage(req.file, PORT);
      imageUrl = uploadResult.url;
    }

    const hazardLevel = level ? parseInt(level) : (dangerLevel ? parseInt(dangerLevel) : 3);
    const hazardTime = timeOfDay || 'all';

    if (isDbConnected()) {
      const result = await pool.query(
        `UPDATE hazards 
         SET type = $1, description = $2, image_url = $3
         WHERE id = $4
         RETURNING id, type, description, image_url AS "imageUrl", ST_Y(geom) AS lat, ST_X(geom) AS lng, comments;`,
        [type, description, imageUrl, id]
      );

      if (result.rowCount === 0) return res.status(404).json({ error: 'Hazard not found' });

      const updated = {
        ...result.rows[0],
        level: hazardLevel,
        timeOfDay: hazardTime
      };

      // hazards.json 同期
      const hazards = readLocalHazards();
      const index = hazards.findIndex((h: any) => h.id === id);
      if (index !== -1) {
        hazards[index] = { ...hazards[index], ...updated };
        writeLocalHazards(hazards);
      }

      return res.json(updated);
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    const index = hazards.findIndex((h: any) => h.id === id);
    if (index === -1) return res.status(404).json({ error: 'Hazard not found' });

    hazards[index] = {
      ...hazards[index],
      type: type || hazards[index].type,
      description: description || hazards[index].description,
      level: hazardLevel || hazards[index].level,
      timeOfDay: hazardTime || hazards[index].timeOfDay,
      imageUrl: imageUrl !== undefined ? imageUrl : hazards[index].imageUrl
    };

    writeLocalHazards(hazards);
    res.json(hazards[index]);
  } catch (err: any) {
    console.error('Error updating hazard:', err);
    res.status(500).json({ error: 'Error updating data', details: err.message });
  }
});

/**
 * 📍 危険箇所の削除（解決済み）
 * DELETE /api/hazards/:id
 */
app.delete('/api/hazards/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (isDbConnected()) {
      const result = await pool.query(`DELETE FROM hazards WHERE id = $1`, [id]);
      if (result.rowCount === 0) return res.status(404).send('Hazard not found');

      const hazards = readLocalHazards();
      const filtered = hazards.filter((h: any) => h.id !== id);
      writeLocalHazards(filtered);

      return res.status(200).send('Hazard resolved');
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    const filteredHazards = hazards.filter((h: any) => h.id !== id);
    writeLocalHazards(filteredHazards);
    res.status(200).send('Hazard resolved');
  } catch (err: any) {
    console.error('Error deleting hazard:', err);
    res.status(500).json({ error: 'Error deleting data', details: err.message });
  }
});

/**
 * 📍 コメントの投稿
 * POST /api/hazards/:id/comments
 */
app.post('/api/hazards/:id/comments', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { text } = req.body;

    if (!text) return res.status(400).send('Comment text is required');

    const newComment = {
      id: Date.now(),
      text,
      createdAt: new Date().toISOString()
    };

    if (isDbConnected()) {
      const result = await pool.query(
        `UPDATE hazards 
         SET comments = COALESCE(comments, '[]'::jsonb) || $1::jsonb
         WHERE id = $2
         RETURNING id;`,
        [JSON.stringify([newComment]), id]
      );

      if (result.rowCount === 0) return res.status(404).send('Hazard not found');

      const hazards = readLocalHazards();
      const index = hazards.findIndex((h: any) => h.id === id);
      if (index !== -1) {
        if (!hazards[index].comments) hazards[index].comments = [];
        hazards[index].comments.push(newComment);
        writeLocalHazards(hazards);
      }

      return res.status(201).json(newComment);
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    const index = hazards.findIndex((h: any) => h.id === id);
    if (index === -1) return res.status(404).send('Hazard not found');

    if (!hazards[index].comments) {
      hazards[index].comments = [];
    }
    hazards[index].comments.push(newComment);
    writeLocalHazards(hazards);

    res.status(201).json(newComment);
  } catch (err: any) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Error adding comment', details: err.message });
  }
});

/**
 * 📍 PostGIS空間演算 & 近傍検索API: 半径Xm以内の危険箇所・避難所を取得
 * GET /api/hazards/nearby?lat=35.6895&lng=139.6917&radius=500&type=Shelter
 */
app.get('/api/hazards/nearby', async (req, res) => {
  try {
    const latStr = req.query.lat as string | undefined;
    const lngStr = req.query.lng as string | undefined;
    const radiusStr = req.query.radius as string | undefined;
    const type = req.query.type as string | undefined;
    const limitStr = req.query.limit as string | undefined;

    const lat = latStr !== undefined ? parseFloat(latStr) : NaN;
    const lng = lngStr !== undefined ? parseFloat(lngStr) : NaN;
    const radius = radiusStr !== undefined ? parseFloat(radiusStr) : 5000;
    const limit = limitStr !== undefined ? parseInt(limitStr, 10) : 50;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: 'lat (緯度) と lng (経度) の数値を指定してください。'
      });
    }

    // 1. PostGIS 空間演算 (ST_DWithin)
    if (isDbConnected()) {
      let querySql = `
        SELECT 
          id,
          type,
          description,
          image_url AS "imageUrl",
          ST_Y(geom) AS lat,
          ST_X(geom) AS lng,
          COALESCE(comments, '[]'::jsonb) AS comments,
          ROUND(
            ST_Distance(
              geom::geography, 
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            )::numeric, 1
          ) AS "distanceMeters"
        FROM hazards
        WHERE ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      `;
      const params: any[] = [lng, lat, radius];

      if (type) {
        querySql += ` AND type = $4`;
        params.push(type);
      }

      querySql += ` ORDER BY "distanceMeters" ASC LIMIT ${limit};`;

      const result = await pool.query(querySql, params);

      const hazards = result.rows.map((h: any) => ({
        ...h,
        walkTimeMinutes: Math.max(1, Math.round(h.distanceMeters / 80))
      }));

      return res.json({
        center: { lat, lng },
        radiusMeters: radius,
        count: hazards.length,
        engine: 'PostGIS (ST_DWithin)',
        hazards
      });
    }

    // 2. PostGIS 未接続時のフォールバック (Haversine球面距離計算)
    const allHazards = readLocalHazards();
    let nearbyHazards = allHazards
      .filter((h: any) => !type || h.type === type)
      .map((h: any) => {
        const distanceMeters = calculateHaversineDistanceMeters(lat, lng, h.lat, h.lng);
        return {
          ...h,
          distanceMeters,
          walkTimeMinutes: Math.max(1, Math.round(distanceMeters / 80))
        };
      })
      .filter((h: any) => h.distanceMeters <= radius)
      .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters)
      .slice(0, limit);

    return res.json({
      center: { lat, lng },
      radiusMeters: radius,
      count: nearbyHazards.length,
      engine: 'Fallback (Haversine Formula)',
      hazards: nearbyHazards
    });
  } catch (error: any) {
    console.error('Error in /api/hazards/nearby:', error);
    res.status(500).json({ error: '周辺データの取得に失敗しました', details: error.message });
  }
});

/**
 * 🔔 接近通知トリガーAPI: 現在位置を受け取り接近アラートを発火
 * POST /api/alerts/trigger または POST /api/alerts/check
 */
const handleLocationTrigger = async (req: Request, res: Response) => {
  try {
    const { lat, lng, alertRadius, deviceId } = req.body;
    const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
    const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);
    const radius = typeof alertRadius === 'number' ? alertRadius : (parseFloat(alertRadius) || 50);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({
        error: 'lat (緯度) と lng (経度) を正しく指定してください。'
      });
    }

    let nearbyHazards: HazardData[] = [];

    if (isDbConnected()) {
      const querySql = `
        SELECT 
          id,
          type,
          description,
          image_url AS "imageUrl",
          ST_Y(geom) AS lat,
          ST_X(geom) AS lng,
          COALESCE(comments, '[]'::jsonb) AS comments,
          ROUND(
            ST_Distance(
              geom::geography, 
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            )::numeric, 1
          ) AS "distanceMeters"
        FROM hazards
        WHERE ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        ORDER BY "distanceMeters" ASC;
      `;
      const result = await pool.query(querySql, [parsedLng, parsedLat, radius]);
      nearbyHazards = result.rows;
    } else {
      const allHazards = readLocalHazards();
      nearbyHazards = allHazards
        .map((h: any) => ({
          ...h,
          distanceMeters: calculateHaversineDistanceMeters(parsedLat, parsedLng, h.lat, h.lng)
        }))
        .filter((h: any) => (h.distanceMeters ?? Infinity) <= radius)
        .sort((a: any, b: any) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
    }

    const alerts: AlertNotification[] = nearbyHazards.map(h =>
      buildChildFriendlyAlert(h, h.distanceMeters ?? 0)
    );

    let highestLevel: 'danger' | 'warning' | 'info' | 'none' = 'none';
    if (alerts.some(a => a.level === 'danger')) {
      highestLevel = 'danger';
    } else if (alerts.some(a => a.level === 'warning')) {
      highestLevel = 'warning';
    } else if (alerts.length > 0) {
      highestLevel = 'info';
    }

    const payload: LocationTriggerResponse = {
      timestamp: new Date().toISOString(),
      currentLocation: {
        lat: parsedLat,
        lng: parsedLng
      },
      alertRadiusMeters: radius,
      hasAlert: alerts.length > 0,
      alertCount: alerts.length,
      alerts,
      highestLevel
    };

    if (payload.hasAlert) {
      broadcastAlert(payload);
    }

    return res.json({
      success: true,
      deviceId: deviceId || null,
      ...payload
    });
  } catch (error: any) {
    console.error('Error in handleLocationTrigger:', error);
    res.status(500).json({ error: '接近アラートの判定に失敗しました', details: error.message });
  }
};

app.post('/api/alerts/trigger', handleLocationTrigger);
app.post('/api/alerts/check', handleLocationTrigger);

/**
 * 📡 接近アラート受信用 Server-Sent Events (SSE) ストリーム
 * GET /api/alerts/stream
 */
app.get('/api/alerts/stream', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', message: '接近アラート通知ストリームに接続しました' })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  _req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

/**
 * 📊 エリアごとの危険度統計データ取得API
 * GET /api/hazards/stats
 */
app.get('/api/hazards/stats', async (req, res) => {
  try {
    const latStr = req.query.lat as string | undefined;
    const lngStr = req.query.lng as string | undefined;
    const radiusStr = req.query.radius as string | undefined;
    const gridSizeStr = req.query.gridSize as string | undefined;

    const lat = latStr !== undefined ? parseFloat(latStr) : undefined;
    const lng = lngStr !== undefined ? parseFloat(lngStr) : undefined;
    const radius = radiusStr !== undefined ? parseFloat(radiusStr) : undefined;
    const gridSize = gridSizeStr !== undefined ? parseFloat(gridSizeStr) : undefined;

    let allHazards: any[] = [];
    if (isDbConnected()) {
      const result = await pool.query(`
        SELECT 
          id,
          type,
          description,
          image_url AS "imageUrl",
          ST_Y(geom) AS lat,
          ST_X(geom) AS lng,
          COALESCE(comments, '[]'::jsonb) AS comments
        FROM hazards
        ORDER BY id ASC;
      `);
      allHazards = result.rows;
    } else {
      allHazards = readLocalHazards();
    }

    const stats = generateHazardStatistics(allHazards, { lat, lng, radius, gridSize });
    return res.json(stats);
  } catch (error: any) {
    console.error('Error in /api/hazards/stats:', error);
    res.status(500).json({ error: '統計データの取得に失敗しました', details: error.message });
  }
});

app.get('/api/hazards/statistics', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(307, `/api/hazards/stats${query}`);
});

/**
 * 💌 ユーザーテスト・フィードバック API
 */
app.get('/api/feedback', (_req, res) => {
  if (!fs.existsSync(FEEDBACK_FILE)) {
    return res.json([]);
  }
  try {
    const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
    res.json(JSON.parse(data || '[]'));
  } catch {
    res.json([]);
  }
});

app.post('/api/feedback', (req, res) => {
  const feedbackData = req.body;
  const newFeedback = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    ...feedbackData
  };

  let feedbacks: any[] = [];
  if (fs.existsSync(FEEDBACK_FILE)) {
    try {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
      feedbacks = JSON.parse(data || '[]');
    } catch {
      feedbacks = [];
    }
  }

  feedbacks.push(newFeedback);
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf8');
  res.status(201).json(newFeedback);
});

// サーバー起動およびDB初期化
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    await initializeDatabase(DATA_FILE);
  });
}

export { app, getImageUrl };
export default app;
