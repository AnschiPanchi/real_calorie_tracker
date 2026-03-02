const dns = require('node:dns/promises');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Keep this for your Windows DNS issues

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const logRoutes = require('./routes/logs.js');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB max client upload size
});

// --- 1. CORS CONFIGURATION (supports local dev + production via env) ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  // Production frontend URL — set CLIENT_URL in your hosting provider's env vars
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile) or if in whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// --- 2. DATABASE & ROUTES ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err));

app.use('/api/logs', logRoutes);

// --- 3. AUTH ROUTES ---
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}));

app.post('/api/auth/signup', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: "Signup failed" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (user) res.json(user);
    else res.status(401).json({ error: "Invalid credentials" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- 4. USDA SEARCH ROUTE ---
app.get('/api/search', async (req, res) => {
  const { foodName } = req.query;
  const apiKey = process.env.USDA_API_KEY;

  if (!foodName) return res.status(400).json({ error: "Search query required" });

  try {
    const response = await axios.get(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${foodName}`
    );

    const foods = response.data.foods || [];
    res.json(foods);
  } catch (error) {
    console.error("❌ USDA API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch from USDA" });
  }
});

// --- 5. IMAGE RECOGNITION ROUTE (Using Gemini with Compression) ---
app.post('/api/recognize-food', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = "Identify the single main food item in this picture. Reply with ONLY the name of the food and absolutely nothing else. Keep it very concise (1-3 words max). For example: 'Apple', 'Pizza', 'Grilled Chicken'. Do not include markdown or punctuation.";

    const imageParts = [
      {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().trim().replace(/['"]/g, '').replace(/\.$/, '');

    res.json({ foodName: text });
  } catch (error) {
    console.error("❌ Gemini API Error Details:", error);
    res.status(500).json({
      error: "Failed to recognize food from image",
      details: error.message
    });
  }
});

// --- 6. AI NUTRITION CHATBOT ROUTE ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Inject system persona as the very first exchange in history
    const systemHistory = [
      {
        role: 'user',
        parts: [{ text: 'You are NutriBot, a friendly AI nutrition assistant in the NutriTrack app. Help users with calorie counts, diet tips, food suggestions, macros and meal planning. Keep replies short (2-4 sentences or a brief list). Use emojis, be encouraging. Only answer food/nutrition topics.' }]
      },
      {
        role: 'model',
        parts: [{ text: "Got it! I'm NutriBot 🌿 — ready to help with all things nutrition. Ask me anything about food, calories, or your diet goals!" }]
      }
    ];

    // Convert prior conversation history
    const chatHistory = [
      ...systemHistory,
      ...(history || []).map(m => ({
        role: m.role === 'bot' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }))
    ];

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error('❌ Chat Error:', error.message);
    // Friendly rate limit message
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('retry')) {
      return res.status(429).json({ error: 'RATE_LIMIT' });
    }
    res.status(500).json({ error: 'Failed to get response', details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));