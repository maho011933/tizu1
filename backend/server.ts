import express from 'express';
import type { Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { pool, isDbConnected, initializeDatabase, calculateHaversineDistanceMeters } from './db.js';
import type { HazardData } from './db.js';
import { buildChildFriendlyAlert } from './alerts.js';
import type { AlertNotification, LocationTriggerResponse } from './alerts.js';
import { generateHazardStatistics } from './stats.js';

import { pool, query } from './db/index.js';
import { uploadImage } from './services/storageService.js';

import dotenv from 'dotenv';
import { generateSafetyAdvice } from './services/geminiService.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3001;


const PORT = 3001;

const DATA_FILE = path.join(__dirname, 'data', 'hazards.json');
const FEEDBACK_FILE = path.join(__dirname, 'data', 'feedback.json');

const PORT = process.env.PORT || 3001;
const DATA_FILE = process.env.HAZARDS_DATA_FILE || path.join(__dirname, 'data', 'hazards.json');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}



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

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));

// Multer setup with strict file type and size validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);

  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
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

// Helper: Check DB connectivity
let isDbConnected = false;
async function checkDbConnection() {
  try {
    await query('SELECT 1');
    isDbConnected = true;
    console.log('✅ Connected to PostgreSQL + PostGIS Database successfully.');
  } catch (err) {
    isDbConnected = false;
    console.warn('⚠️ Could not connect to PostgreSQL DB. Falling back to hazards.json mode.', (err as Error).message);
  }
}


// 補助関数: hazards.json の読み書き（バックアップ・フォールバック用）
function readLocalHazards(): HazardData[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

function writeLocalHazards(hazards: HazardData[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(hazards, null, 2), 'utf8');
}

/**
 * 📍 PostGIS空間演算API: 半径Xm以内の危険箇所を取得
 * GET /api/hazards/nearby?lat=35.6895&lng=139.6917&radius=500
 */
app.get('/api/hazards/nearby', async (req, res) => {
  try {
    const latStr = req.query.lat as string | undefined;
    const lngStr = req.query.lng as string | undefined;
    const radiusStr = req.query.radius as string | undefined;

    const lat = latStr !== undefined ? parseFloat(latStr) : NaN;
    const lng = lngStr !== undefined ? parseFloat(lngStr) : NaN;
    // デフォルト半径500m
    const radius = radiusStr !== undefined ? parseFloat(radiusStr) : 500;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: 'lat (緯度) と lng (経度) の数値を指定してください。'
      });
    }

    if (radius <= 0 || radius > 50000) {
      return res.status(400).json({
        error: 'radius (半径m) は 1m 〜 50,000m の範囲で指定してください。'
      });
    }

    // 1. PostGIS が接続されている場合 (ST_DWithin による高速空間検索)
    if (isDbConnected()) {
      const query = `
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
        FROM 
          hazards
        WHERE 
          ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        ORDER BY 
          "distanceMeters" ASC;
      `;

      const result = await pool.query(query, [lng, lat, radius]);

      return res.json({
        center: { lat, lng },
        radiusMeters: radius,
        count: result.rows.length,
        engine: 'PostGIS (ST_DWithin)',
        hazards: result.rows
      });
    }

    // 2. PostGIS 未接続時のフォールバック (Haversine球面距離計算)
    const allHazards = readLocalHazards();
    const nearbyHazards = allHazards
      .map(h => {
        const distanceMeters = calculateHaversineDistanceMeters(lat, lng, h.lat, h.lng);
        return {
          ...h,
          distanceMeters
        };
      })
      .filter(h => h.distanceMeters <= radius)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

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
 * 🔔 接近通知トリガーAPI: 現在位置を受け取り、接近中の危険箇所アラートを発火
 * POST /api/alerts/trigger または POST /api/alerts/check
 * Body: { "lat": 35.6895, "lng": 139.6917, "alertRadius": 50, "deviceId": "user-123" }
 */
const handleLocationTrigger = async (req: express.Request, res: express.Response) => {
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
      const query = `
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
        FROM 
          hazards
        WHERE 
          ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        ORDER BY 
          "distanceMeters" ASC;
      `;
      const result = await pool.query(query, [parsedLng, parsedLat, radius]);
      nearbyHazards = result.rows;
    } else {
      // Fallback: Haversine
      const allHazards = readLocalHazards();
      nearbyHazards = allHazards
        .map(h => ({
          ...h,
          distanceMeters: calculateHaversineDistanceMeters(parsedLat, parsedLng, h.lat, h.lng)
        }))
        .filter(h => (h.distanceMeters ?? Infinity) <= radius)
        .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
    }

    // 子供向け親しみやすいアラート文の構築
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

    // リアルタイム接続中のリスナー（保護者画面や他端末）へSSEブロードキャスト
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
app.get('/api/alerts/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // 初期接続確認メッセージ
  res.write(`data: ${JSON.stringify({ type: 'connected', message: '接近アラート通知ストリームに接続しました' })}\n\n`);

  // キープアライブ (25秒毎)
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

/**
 * 📊 エリアごとの危険度統計データ取得API
 * GET /api/hazards/stats
 * クエリパラメータ:
 *   lat, lng, radius (任意: 指定位置の半径内のみ集計)
 *   gridSize (任意: ホットスポット分割のメッシュ解像度、度単位)
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

// Helper for JSON Fallback read
function readJsonData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

// Helper for JSON Fallback write
function writeJsonData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Get all hazards (DB with JSON fallback)
app.get('/api/hazards', async (req, res) => {
  if (isDbConnected) {
    try {
      const sql = `
        SELECT 
          h.id, 
          h.lat, 
          h.lng, 
          h.type, 
          h.description, 
          h.image_url AS "imageUrl", 
          h.danger_level AS "dangerLevel",
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT('id', c.id, 'text', c.text, 'createdAt', c.created_at)
            ) FILTER (WHERE c.id IS NOT NULL), '[]'
          ) AS comments
        FROM hazards h
        LEFT JOIN comments c ON h.id = c.hazard_id
        GROUP BY h.id
        ORDER BY h.id ASC;
      `;
      const result = await query(sql);
      return res.json(result.rows);
    } catch (err) {
      console.error('Error fetching hazards from DB:', err);
    }
  }

  // Fallback to hazards.json
  try {
    const hazards = readJsonData();
    res.json(hazards);
  } catch (err) {
    res.status(500).send('Error reading hazard data');
  }
});

// Gemini AI モジュールルーターのマウント
app.use('/api/ai', aiRoutes);
app.get('/api/hazards', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading data file');
    }
  }

  // DB未接続時の簡易距離計算フォールバック
  try {
    const hazards = readJsonData();
    const filtered = hazards.filter((h: any) => {
      // 簡易的な距離計算 (Haversine formula 相当)
      const R = 6371000; // 地球の半径 (m)
      const dLat = (h.lat - latitude) * Math.PI / 180;
      const dLng = (h.lng - longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(h.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      h.distanceMeters = Math.round(dist * 10) / 10;
      return dist <= searchRadius;
    });
    res.json(filtered);
  } catch (err) {
    res.status(500).send('Error computing nearby hazards');
  }
});

const getImageUrl = (req: express.Request, filename: string) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${filename}`;
};

// Post a new hazard with image
app.post('/api/hazards', upload.single('image'), (req, res) => {
  const { lat, lng, type, description, level, timeOfDay } = req.body;
  const imageUrl = req.file ？ getImageUrl(req, req.file.filename) :null;

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data file');
    const hazards = JSON.parse(data);
    const newId = hazards.length > 0 ? Math.max(...hazards.map((h: any) => h.id || 0)) + 1 : 1;
    
    const newHazard = {
      id: newId,
      lat: latitude,
      lng: longitude,
      type,
      description,
      level: level ? parseInt(level) : 3,
      timeOfDay: timeOfDay || 'all',
      imageUrl,
      dangerLevel: danger,
      comments: []
    };
    hazards.push(newHazard);
    fs.writeFile(DATA_FILE, JSON.stringify(hazards, null, 2), (err) => {
      if (err) return res.status(500).send('Error saving data');
      res.status(201).json(newHazard);
    });
  } catch (error) {
    console.error('Error adding hazard:', error);
    res.status(500).send('Error processing hazard registration');
  }
});

// Post a comment to a hazard
app.post('/api/hazards/:id/comments', (req, res) => {

  const id = parseInt(req.params.id as string, 10);

  const id = parseInt(req.params.id as string);

  const { text } = req.body;


    let allHazards: HazardData[] = [];


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

app.get('/api/hazards/statistics', async (req, res) => {
  // Alias for /api/hazards/stats
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(307, `/api/hazards/stats${query}`);
});

  if (isDbConnected) {
    try {
      const sql = `
        INSERT INTO comments (hazard_id, text)
        VALUES ($1, $2)
        RETURNING id, hazard_id AS "hazardId", text, created_at AS "createdAt";
      `;
      const result = await query(sql, [id, text]);
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error inserting comment into DB:', err);
    }
  }

  // Fallback to hazards.json
  try {
    const hazards = readJsonData();
    const index = hazards.findIndex((h: any) => h.id === id);
    if (index === -1) return res.status(404).send('Hazard not found');


/**
 * 全ての危険箇所を取得
 * GET /api/hazards
 */
app.get('/api/hazards', async (req, res) => {
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
          COALESCE(comments, '[]'::jsonb) AS comments
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
    res.status(500).send('Error reading data');
  }
});

/**
 * 新規危険箇所の投稿
 * POST /api/hazards
 */
app.post('/api/hazards', upload.single('image'), async (req, res) => {
  try {
    const { lat, lng, type, description } = req.body;
    const imageUrl = req.file ? `http://localhost:${PORT}/uploads/${req.file.filename}` : null;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).send('Invalid coordinates');
    }

    if (isDbConnected()) {
      const result = await pool.query(
        `INSERT INTO hazards (type, description, image_url, comments, geom)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
         RETURNING id, type, description, image_url AS "imageUrl", ST_Y(geom) AS lat, ST_X(geom) AS lng, comments;`,
        [type, description, imageUrl, JSON.stringify([]), parsedLng, parsedLat]
      );
      const newHazard: HazardData = result.rows[0];

      // hazards.json もバックアップ同期
      const localHazards = readLocalHazards();
      localHazards.push(newHazard);
      writeLocalHazards(localHazards);

      return res.status(201).json(newHazard);
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    const lastHazard = hazards.length > 0 ? hazards[hazards.length - 1] : undefined;
    const newId = lastHazard ? lastHazard.id + 1 : 1;
    const newHazard: HazardData = {
      id: newId,
      lat: parsedLat,
      lng: parsedLng,
      type,
      description,
      imageUrl: imageUrl ?? null,
      comments: []
    };

    hazards.push(newHazard);
    writeLocalHazards(hazards);
    res.status(201).json(newHazard);
  } catch (err: any) {
    console.error('Error creating hazard:', err);
    res.status(500).send('Error saving data');
  }
});

/**
 * コメントの投稿
 * POST /api/hazards/:id/comments
 */
app.post('/api/hazards/:id/comments', async (req, res) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam || '0', 10);
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

      // 同期
      const hazards = readLocalHazards();
      const index = hazards.findIndex(h => h.id === id);
      const targetHazard = index !== -1 ? hazards[index] : undefined;
      if (targetHazard) {
        if (!targetHazard.comments) targetHazard.comments = [];
        targetHazard.comments.push(newComment);
        writeLocalHazards(hazards);
      }

      return res.status(201).json(newComment);
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    const index = hazards.findIndex(h => h.id === id);
    const targetHazard = index !== -1 ? hazards[index] : undefined;
    if (!targetHazard) return res.status(404).send('Hazard not found');

    if (!targetHazard.comments) {
      targetHazard.comments = [];
    }
    targetHazard.comments.push(newComment);
    writeLocalHazards(hazards);

    res.status(201).json(newComment);
  } catch (err: any) {
    console.error('Error adding comment:', err);
    res.status(500).send('Error saving data');
  }
});

/**
 * 危険箇所の更新
 * PUT /api/hazards/:id
 */
app.put('/api/hazards/:id', upload.single('image'), async (req, res) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam || '0', 10);
    const { type, description } = req.body;
    const imageUrl = req.file ? `http://localhost:${PORT}/uploads/${req.file.filename}` : req.body.imageUrl;
    const finalImageUrl = imageUrl === 'null' ? null : (imageUrl || null);

    if (isDbConnected()) {
      const result = await pool.query(
        `UPDATE hazards 
         SET type = $1, description = $2, image_url = $3
         WHERE id = $4
         RETURNING id, type, description, image_url AS "imageUrl", ST_Y(geom) AS lat, ST_X(geom) AS lng, comments;`,
        [type, description, finalImageUrl, id]
      );

      if (result.rowCount === 0) return res.status(404).send('Hazard not found');

      const updated: HazardData = result.rows[0];
      // 同期
      const hazards = readLocalHazards();
      const index = hazards.findIndex(h => h.id === id);
      const targetHazard = index !== -1 ? hazards[index] : undefined;
      if (targetHazard) {
        hazards[index] = {
          ...targetHazard,
          type,
          description,
          imageUrl: finalImageUrl
        };
        writeLocalHazards(hazards);
      }

      return res.json(updated);
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    const index = hazards.findIndex(h => h.id === id);
    const targetHazard = index !== -1 ? hazards[index] : undefined;
    if (!targetHazard) return res.status(404).send('Hazard not found');

    hazards[index].comments.push(newComment);
    writeJsonData(hazards);
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).send('Error saving comment data');
  }
});

// Delete a hazard (Resolve)

app.delete('/api/hazards/:id', (req, res) => {

  const id = parseInt(req.params.id as string, 10);

  const id = parseInt(req.params.id as string);

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data file');
    const hazards = JSON.parse(data);
    const filteredHazards = hazards.filter((h: any) => h.id !== id);
    writeJsonData(filteredHazards);
    res.status(200).send('Hazard resolved');
  } catch (err) {
    res.status(500).send('Error deleting hazard data');
  }
});


// Update a hazard
app.put('/api/hazards/:id', upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  const { type, description } = req.body;
  const imageUrl = req.file ? `http://localhost:3001/uploads/${req.file.filename}` : req.body.imageUrl;



// Update

app.put('/api/hazards/:id', upload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { type, description, dangerLevel } = req.body;
  
  let imageUrl: string | null = req.body.imageUrl === 'null' ? null : req.body.imageUrl;
  if (req.file) {
    const uploadResult = await uploadImage(req.file, PORT);
    imageUrl = uploadResult.url;
  }

app.put('/api/hazards/:id', upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id as string);
  const { type, description, level, timeOfDay } =req.body;
  const imageUrl =req.file ? getImageUrl(req, req.file.filename) : req.body.imageUrl;


  if (isDbConnected) {
    try {
      const sql = `
        UPDATE hazards
        SET type = $1, description = $2, image_url = $3, danger_level = COALESCE($4, danger_level), updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, lat, lng, type, description, image_url AS "imageUrl", danger_level AS "dangerLevel";
      `;
      const result = await query(sql, [type, description, imageUrl === 'null' ? null : imageUrl, dangerLevel ? parseInt(dangerLevel) : null, id]);
      if (result.rowCount === 0) return res.status(404).send('Hazard not found');
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating hazard in DB:', err);
    }
  }

  // Fallback to hazards.json
  try {
    const hazards = readJsonData();
    const index = hazards.findIndex((h: any) => h.id === id);
    if (index === -1) return res.status(404).send('Hazard not found');


    hazards[index] = {
      ...targetHazard,
      type,
      description,

      imageUrl: finalImageUrl
    };

    writeLocalHazards(hazards);
    res.json(hazards[index]);
  } catch (err: any) {
    console.error('Error updating hazard:', err);
    res.status(500).send('Error saving data');
  }
});

/**
 * 危険箇所の削除（解決済み）
 * DELETE /api/hazards/:id
 */
app.delete('/api/hazards/:id', async (req, res) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(idParam || '0', 10);

    if (isDbConnected()) {
      const result = await pool.query(`DELETE FROM hazards WHERE id = $1`, [id]);
      if (result.rowCount === 0) return res.status(404).send('Hazard not found');

      // 同期
      const hazards = readLocalHazards();
      const filtered = hazards.filter(h => h.id !== id);
      writeLocalHazards(filtered);

      return res.status(200).send('Hazard resolved');
    }

    // Fallback: JSON
    const hazards = readLocalHazards();
    const filteredHazards = hazards.filter(h => h.id !== id);
    writeLocalHazards(filteredHazards);
    res.status(200).send('Hazard resolved');
  } catch (err: any) {
    console.error('Error deleting hazard:', err);
    res.status(500).send('Error saving data');
  }
});

// サーバー起動およびDB初期化
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  await initializeDatabase(DATA_FILE);

      level: level ? parseInt(level) : (hazards[index].level || 3),
      timeOfDay: timeOfDay || hazards[index].timeOfDay || 'all',
      imageUrl: imageUrl === 'null' ? null : imageUrl
    };

    writeJsonData(hazards);
    res.json(hazards[index]);
  } catch (err) {
    res.status(500).send('Error updating hazard data');
  }
});

// Get all feedbacks
app.get('/api/feedback', (req, res) => {
  if (!fs.existsSync(FEEDBACK_FILE)) {
    return res.json([]);
  }
  fs.readFile(FEEDBACK_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading feedback file');
    try {
      res.json(JSON.parse(data || '[]'));
    } catch {
      res.json([]);
    }
  });
});

// Post a feedback
app.post('/api/feedback', (req, res) => {
  const feedbackData = req.body;
  const newFeedback = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    ...feedbackData
  };

  fs.readFile(FEEDBACK_FILE, 'utf8', (err, data) => {
    let feedbacks = [];
    if (!err && data) {
      try {
        feedbacks = JSON.parse(data);
      } catch {
        feedbacks = [];
      }
    }
    feedbacks.push(newFeedback);
    fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).send('Error saving feedback');
      res.status(201).json(newFeedback);
    });
  });
});

app.listen(PORT, () => {

// Start Server & Check DB Connection
app.listen(PORT, async () => {

  console.log(`Server is running on http://localhost:${PORT}`);
  await checkDbConnection();

});


if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export { app, getImageUrl };
export default app;

