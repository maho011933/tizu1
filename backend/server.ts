import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { pool, query } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'hazards.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

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

// PostGIS 空間検索: 半径Xm以内の危険箇所取得API
app.get('/api/hazards/nearby', async (req, res) => {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude (lat) and Longitude (lng) are required.' });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const searchRadius = radius ? parseFloat(radius as string) : 500; // デフォルト500メートル

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
          ROUND(ST_DistanceSphere(h.location, ST_SetSRID(ST_MakePoint($2, $1), 4326))::numeric, 1) AS "distanceMeters",
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT('id', c.id, 'text', c.text, 'createdAt', c.created_at)
            ) FILTER (WHERE c.id IS NOT NULL), '[]'
          ) AS comments
        FROM hazards h
        LEFT JOIN comments c ON h.id = c.hazard_id
        WHERE ST_DWithin(h.location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
        GROUP BY h.id
        ORDER BY "distanceMeters" ASC;
      `;
      const result = await query(sql, [latitude, longitude, searchRadius]);
      return res.json(result.rows);
    } catch (err) {
      console.error('Error executing spatial query:', err);
      return res.status(500).json({ error: 'Database spatial query failed.' });
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

// Post a new hazard with image
app.post('/api/hazards', upload.single('image'), async (req, res) => {
  const { lat, lng, type, description, dangerLevel } = req.body;
  const imageUrl = req.file ? `http://localhost:${PORT}/uploads/${req.file.filename}` : null;
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const danger = dangerLevel ? parseInt(dangerLevel) : 3;

  if (isDbConnected) {
    try {
      const sql = `
        INSERT INTO hazards (lat, lng, location, type, description, image_url, danger_level)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($2, $1), 4326), $3, $4, $5, $6)
        RETURNING id, lat, lng, type, description, image_url AS "imageUrl", danger_level AS "dangerLevel", created_at AS "createdAt";
      `;
      const result = await query(sql, [latitude, longitude, type, description, imageUrl, danger]);
      const newHazard = { ...result.rows[0], comments: [] };
      return res.status(201).json(newHazard);
    } catch (err) {
      console.error('Error inserting hazard into DB:', err);
    }
  }

  // Fallback to hazards.json
  try {
    const hazards = readJsonData();
    const newId = hazards.length > 0 ? hazards[hazards.length - 1].id + 1 : 1;
    const newHazard = {
      id: newId,
      lat: latitude,
      lng: longitude,
      type,
      description,
      imageUrl,
      dangerLevel: danger,
      comments: []
    };
    hazards.push(newHazard);
    writeJsonData(hazards);
    res.status(201).json(newHazard);
  } catch (err) {
    res.status(500).send('Error saving hazard data');
  }
});

// Post a comment to a hazard
app.post('/api/hazards/:id/comments', async (req, res) => {
  const id = parseInt(req.params.id);
  const { text } = req.body;

  if (!text) return res.status(400).send('Comment text is required');

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

    if (!hazards[index].comments) {
      hazards[index].comments = [];
    }

    const newComment = {
      id: Date.now(),
      text,
      createdAt: new Date().toISOString()
    };
    hazards[index].comments.push(newComment);
    writeJsonData(hazards);
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).send('Error saving comment data');
  }
});

// Delete a hazard (Resolve)
app.delete('/api/hazards/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isDbConnected) {
    try {
      await query('DELETE FROM hazards WHERE id = $1', [id]);
      return res.status(200).send('Hazard resolved');
    } catch (err) {
      console.error('Error deleting hazard from DB:', err);
    }
  }

  // Fallback to hazards.json
  try {
    const hazards = readJsonData();
    const filteredHazards = hazards.filter((h: any) => h.id !== id);
    writeJsonData(filteredHazards);
    res.status(200).send('Hazard resolved');
  } catch (err) {
    res.status(500).send('Error deleting hazard data');
  }
});

// Update a hazard
app.put('/api/hazards/:id', upload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { type, description, dangerLevel } = req.body;
  const imageUrl = req.file ? `http://localhost:${PORT}/uploads/${req.file.filename}` : req.body.imageUrl;

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
      ...hazards[index],
      type,
      description,
      imageUrl: imageUrl === 'null' ? null : imageUrl
    };

    writeJsonData(hazards);
    res.json(hazards[index]);
  } catch (err) {
    res.status(500).send('Error updating hazard data');
  }
});

// Start Server & Check DB Connection
app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await checkDbConnection();
});

