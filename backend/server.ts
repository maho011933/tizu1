import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { pool, query } from './db/index.js';
import { uploadImage } from './services/storageService.js';

import dotenv from 'dotenv';
import { generateSafetyAdvice } from './services/geminiService.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'hazards.json');
const FEEDBACK_FILE = path.join(__dirname, 'data', 'feedback.json');

const PORT = process.env.PORT || 3001;
const DATA_FILE = process.env.HAZARDS_DATA_FILE || path.join(__dirname, 'data', 'hazards.json');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}


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
      ...hazards[index],
      type,
      description,
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

