import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { pool, isDbConnected, initializeDatabase, calculateHaversineDistanceMeters } from './db.js';
import type { HazardData } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'hazards.json');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
});
