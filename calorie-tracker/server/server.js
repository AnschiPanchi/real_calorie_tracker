const dns = require('node:dns/promises');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Keep this for your Windows DNS issues

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import modular routes
const logRoutes = require('./routes/logs.js');
const authRoutes = require('./routes/auth.js');
const searchRoutes = require('./routes/search.js');
const barcodeRoutes = require('./routes/barcode.js');
const visionRoutes = require('./routes/vision.js');
const chatRoutes = require('./routes/chat.js');

const app = express();

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
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// --- 2. DATABASE ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err));

// --- 3. MOUNT ROUTES ---
app.use('/api/logs', logRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/recognize-food', visionRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
