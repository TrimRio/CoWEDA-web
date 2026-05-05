import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'coweda-dev-secret-change-in-production';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coweda';

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ── Mongoose schemas ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
}, { timestamps: true });

const ensembleSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true },
  items:     { type: mongoose.Schema.Types.Mixed, required: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

ensembleSchema.index({ userId: 1, name: 1 }, { unique: true });

const User     = mongoose.model('User',     userSchema);
const Ensemble = mongoose.model('Ensemble', ensembleSchema);

// ── DB connection ─────────────────────────────────────────────────────────────
async function connectDb() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected: ' + MONGO_URI);
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Auth routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed });

    const defaults = [
      { name: 'Default Ensemble', items: { head: ['1-2'], torso_arms: ['2-8', '2-5'], hands: ['3-2'], legs: ['4-5', '4-6'], feet: ['5-3', '5-4'] } },
      { name: 'Arctic Kit',       items: { head: ['1-3', '1-2'], torso_arms: ['2-8', '2-7', '2-1'], hands: ['3-2', '3-1'], legs: ['4-5', '4-4', '4-1'], feet: ['5-1', '5-5'] } },
      { name: 'Light Layer',      items: { head: [], torso_arms: ['2-9', '2-5'], hands: [], legs: ['4-6', '4-2'], feet: ['5-3', '5-4'] } },
    ];
    await Ensemble.insertMany(defaults.map(e => ({ ...e, userId: user._id, isDefault: true })));

    const token = jwt.sign({ userId: user._id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ userId: user._id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Ensemble routes ───────────────────────────────────────────────────────────
app.get('/api/ensembles', requireAuth, async (req, res) => {
  try {
    const ensembles = await Ensemble
      .find({ userId: req.user.userId })
      .sort({ isDefault: -1, createdAt: 1 })
      .lean();
    res.json(ensembles.map(e => ({ ...e, id: e._id })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ensembles' });
  }
});

app.post('/api/ensembles', requireAuth, async (req, res) => {
  const { name, items } = req.body;
  if (!name || !items) return res.status(400).json({ error: 'Name and items required' });

  try {
    const ensemble = await Ensemble.create({ userId: req.user.userId, name, items });
    res.status(201).json({ ...ensemble.toObject(), id: ensemble._id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An ensemble with that name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create ensemble' });
  }
});

app.put('/api/ensembles/:id', requireAuth, async (req, res) => {
  const { name, items } = req.body;
  try {
    const ensemble = await Ensemble.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { name, items },
      { new: true }
    );
    if (!ensemble) return res.status(404).json({ error: 'Ensemble not found' });
    res.json({ ...ensemble.toObject(), id: ensemble._id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An ensemble with that name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update ensemble' });
  }
});

app.delete('/api/ensembles/:id', requireAuth, async (req, res) => {
  try {
    const ensemble = await Ensemble.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!ensemble) return res.status(404).json({ error: 'Ensemble not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete ensemble' });
  }
});

// ── CIE clothing data route ───────────────────────────────────────────────────
app.get('/api/clothing-data', requireAuth, (req, res) => {
  const csvPath = path.join(__dirname, 'CIEdata.csv');
  if (!fs.existsSync(csvPath)) return res.status(404).json({ error: 'CIEdata.csv not found' });
  res.setHeader('Content-Type', 'text/csv');
  res.sendFile(csvPath);
});

// ── Start ─────────────────────────────────────────────────────────────────────
connectDb().then(() => {
  app.listen(PORT, () => console.log('CoWEDA backend running on http://localhost:' + PORT));
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
