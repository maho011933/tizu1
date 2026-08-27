import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'hazards.json');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Haversine formula for calculating distance in meters between two lat/lng points
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Get all hazards
app.get('/api/hazards', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading data file');
    }
    res.json(JSON.parse(data));
  });
});

// Get nearby hazards sorted by distance (GIS Spatial Query)
app.get('/api/hazards/nearby', (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const type = req.query.type as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const maxDistance = req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : null;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
  }

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data file');
    let hazards = JSON.parse(data);

    if (type) {
      hazards = hazards.filter((h: any) => h.type === type);
    }

    const withDistance = hazards.map((h: any) => {
      const distanceMeters = calculateDistanceMeters(lat, lng, h.lat, h.lng);
      return {
        ...h,
        distanceMeters,
        walkTimeMinutes: Math.max(1, Math.round(distanceMeters / 80)) // 80m/min as standard walking speed
      };
    });

    let filtered = withDistance;
    if (maxDistance !== null) {
      filtered = filtered.filter((h: any) => h.distanceMeters <= maxDistance);
    }

    filtered.sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);
    res.json(filtered.slice(0, limit));
  });
});

// Post a new hazard with image
app.post('/api/hazards', upload.single('image'), (req, res) => {
  const { lat, lng, type, description } = req.body;
  const imageUrl = req.file ? `http://localhost:3001/uploads/${req.file.filename}` : null;

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data file');
    const hazards = JSON.parse(data);
    const newId = hazards.length > 0 ? hazards[hazards.length - 1].id + 1 : 1;
    
    const newHazard = {
      id: newId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      type,
      description,
      imageUrl,
      comments: []
    };

    hazards.push(newHazard);
    fs.writeFile(DATA_FILE, JSON.stringify(hazards, null, 2), (err) => {
      if (err) return res.status(500).send('Error saving data');
      res.status(201).json(newHazard);
    });
  });
});

// Post a comment to a hazard
app.post('/api/hazards/:id/comments', (req, res) => {
  const id = parseInt(req.params.id);
  const { text } = req.body;

  if (!text) return res.status(400).send('Comment text is required');

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data file');
    let hazards = JSON.parse(data);
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

    fs.writeFile(DATA_FILE, JSON.stringify(hazards, null, 2), (err) => {
      if (err) return res.status(500).send('Error saving data');
      res.status(201).json(newComment);
    });
  });
});

// Delete a hazard (Resolve)
app.delete('/api/hazards/:id', (req, res) => {
  const id = parseInt(req.params.id);
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data file');
    const hazards = JSON.parse(data);
    const filteredHazards = hazards.filter((h: any) => h.id !== id);
    fs.writeFile(DATA_FILE, JSON.stringify(filteredHazards, null, 2), (err) => {
      if (err) return res.status(500).send('Error saving data');
      res.status(200).send('Hazard resolved');
    });
  });
});

// Update a hazard
app.put('/api/hazards/:id', upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id);
  const { type, description } = req.body;
  const imageUrl = req.file ? `http://localhost:3001/uploads/${req.file.filename}` : req.body.imageUrl;

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data file');
    let hazards = JSON.parse(data);
    const index = hazards.findIndex((h: any) => h.id === id);
    
    if (index === -1) return res.status(404).send('Hazard not found');

    hazards[index] = {
      ...hazards[index],
      type,
      description,
      imageUrl: imageUrl === 'null' ? null : imageUrl
    };

    fs.writeFile(DATA_FILE, JSON.stringify(hazards, null, 2), (err) => {
      if (err) return res.status(500).send('Error saving data');
      res.json(hazards[index]);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
