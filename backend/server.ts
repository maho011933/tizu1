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

// Get all hazards
app.get('/api/hazards', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading data file');
    }
    res.json(JSON.parse(data));
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
