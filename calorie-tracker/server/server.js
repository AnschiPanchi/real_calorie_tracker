const dns = require('node:dns/promises');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Keep this for your Windows DNS issues

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const logRoutes = require('./routes/logs.js');

const app = express();

// --- 1. FIXED CORS CONFIGURATION ---
const allowedOrigins = [
  'http://localhost:5173', 
  'https://calorie-tracker-dv42.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps/Postman) or if in whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));