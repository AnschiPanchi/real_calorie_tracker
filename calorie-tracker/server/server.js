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

// --- 4b. BARCODE LOOKUP via Open Food Facts (free, no key needed) ---
app.get('/api/barcode/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,brands,nutriments,image_url,quantity`,
      { timeout: 8000 }
    );

    const product = response.data?.product;
    if (!product || response.data?.status === 0) {
      return res.status(404).json({ error: 'Product not found in database' });
    }

    const n = product.nutriments || {};
    res.json({
      name: product.product_name || 'Unknown Product',
      brand: product.brands || '',
      quantity: product.quantity || '',
      imageUrl: product.image_url || null,
      calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
      protein: Math.round((n.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
      fat: Math.round((n.fat_100g || 0) * 10) / 10,
    });
  } catch (error) {
    console.error('❌ Barcode lookup error:', error.message);
    res.status(500).json({ error: 'Failed to look up barcode' });
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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Local fallback answers for common nutrition questions when API is rate-limited
const LOCAL_ANSWERS = [
  { k: ['hi', 'hello', 'hey', 'hiya', 'sup', 'helo', 'hii'], a: "Hey there! 👋 I'm NutriBot — your AI health assistant. Ask me about nutrition, calories, diet tips, or anything else on your mind! 😊" },
  { k: ['how are you', 'how r u', 'how are u', 'hows it'], a: "Doing great, thanks for asking! 😄 Ready to help you with anything — nutrition advice, calorie info, or just a chat. What can I do for you?" },
  { k: ['who are you', 'what are you', 'your name', 'what is nutribot'], a: "I'm **NutriBot** 🌿 — a friendly AI assistant built into NutriTrack! I specialise in nutrition and health, but I'm happy to chat about anything. How can I help?" },
  { k: ['what can you do', 'help me', 'what do you do'], a: "I can help with:\n• Calorie counts for any food 🍎\n• Weight loss / muscle gain tips 💪\n• Protein, carbs & fat guidance\n• Meal planning ideas 🥗\n• BMI and TDEE explanations\n\nJust ask away!" },
  { k: ['thank', 'thanks', 'thx', 'ty'], a: "You're welcome! 😊 Feel free to ask me anything else — I'm always here!" },
  { k: ['bye', 'goodbye', 'see you', 'cya', 'take care'], a: "See you later! 👋 Keep eating well and stay healthy! 💪" },
  { k: ['good morning'], a: "Good morning! ☀️ A great day starts with a good breakfast — try oats with fruits or eggs with toast for an energising start!" },
  { k: ['good night', 'good evening'], a: "Good night! 🌙 A light dinner and quality sleep are key parts of a healthy lifestyle. Rest well!" },
  { k: ['calorie deficit', 'deficit'], a: "A calorie deficit means eating fewer calories than your body burns. Typically a 500 kcal/day deficit leads to ~0.5 kg of fat loss per week! 🔥" },

  { k: ['banana'], a: "A medium banana has about **89–100 kcal** 🍌 It's rich in potassium and natural sugars — great for a pre-workout snack!" },
  { k: ['apple'], a: "A medium apple has about **80–95 kcal** 🍎 Apples are high in fibre and vitamin C — a perfect low-calorie snack!" },
  { k: ['protein', 'vegetarian', 'veg'], a: "Top high-protein vegetarian foods: lentils (18g/cup), Greek yogurt (17g), tofu (15g), chickpeas (15g), edamame (17g), paneer (14g), and quinoa (8g)! 💪" },
  { k: ['lose weight', 'weight loss'], a: "To lose weight, focus on a 300–500 kcal daily deficit, prioritise protein (it keeps you full), eat lots of veggies, and stay hydrated. Consistency beats perfection! 💪🥗" },
  { k: ['gain weight', 'gain muscle'], a: "To gain muscle, eat a 250–300 kcal surplus, get 1.6–2g of protein per kg of bodyweight, and do progressive resistance training. Foods like eggs, rice, chicken, oats, and nuts are great! 💪" },
  { k: ['maintain', 'maintenance'], a: "To maintain weight, eat at your TDEE (Total Daily Energy Expenditure). Use the Health tab to calculate yours! Balance carbs, protein, and healthy fats across your meals. ⚖️" },
  { k: ['egg', 'eggs'], a: "One large egg has about **78 kcal** 🥚 Eggs are packed with protein (6g each), healthy fats, and vitamins B12 and D — one of the best whole foods!" },
  { k: ['chicken', 'breast'], a: "100g of grilled chicken breast contains ~**165 kcal** and ~31g of protein 🍗 It's the gold standard for lean, high-protein eating!" },
  { k: ['rice'], a: "1 cup of cooked white rice = **~200 kcal**; brown rice = ~**215 kcal** 🍚 Brown rice has more fibre. Both are great energy sources as part of a balanced meal." },
  { k: ['protein'], a: "Aim for **1.6–2g of protein per kg of bodyweight** for muscle building, or 1.2g for maintenance 💪 Great sources: chicken, fish, eggs, paneer, lentils, tofu, Greek yogurt." },
  { k: ['carb', 'carbs', 'carbohydrate'], a: "Carbs are your body's primary energy source! Focus on complex carbs like oats, brown rice, sweet potato, and quinoa. They digest slowly and keep you full longer 🌾" },
  { k: ['fat', 'fats'], a: "Healthy fats are essential! Avocado, olive oil, nuts, and salmon are great sources of unsaturated fats that support hormones and brain health 🥑 Aim for 20-35% of calories from fat." },
  { k: ['water', 'hydrat'], a: "Aim for at least **2–3 litres of water per day** 💧 Staying hydrated boosts metabolism, reduces hunger, and improves workout performance!" },
  { k: ['breakfast'], a: "A great breakfast includes protein + complex carbs: e.g. eggs with whole-grain toast, oatmeal with nuts and banana, or Greek yogurt with berries. Aim for 300–500 kcal 🌅" },
  { k: ['lunch'], a: "A balanced lunch = lean protein + whole grains + veggies: grilled chicken with brown rice and salad, or a lentil bowl with roti. Aim for 400–600 kcal 🥗" },
  { k: ['dinner'], a: "A lighter dinner is ideal: grilled fish or tofu with steamed vegetables and a small portion of carbs. Keep it around 400–500 kcal if you're watching your weight 🌙" },
  { k: ['snack'], a: "Healthy snacks: apple with peanut butter (~200 kcal), Greek yogurt (~100 kcal), a handful of almonds (~160 kcal), or hummus with carrots (~150 kcal) 😋" },
  { k: ['bmi'], a: "BMI (Body Mass Index) = weight(kg) / height(m)². Under 18.5 = underweight, 18.5–24.9 = normal, 25–29.9 = overweight, 30+ = obese. Check your exact BMI in the Health tab! 📊" },
  { k: ['tdee', 'maintenance calories'], a: "TDEE is Total Daily Energy Expenditure — the total calories you burn per day including exercise. Eat at TDEE to maintain, below to lose, above to gain. Check the Health tab for yours! 📊" },
];

function getLocalAnswer(message) {
  const lower = message.toLowerCase().trim();
  const match = LOCAL_ANSWERS.find(entry => entry.k.some(k => lower.includes(k)));
  return match ? match.a : `I'd love to help! 😊 While I specialise in nutrition and health, feel free to ask me about food, calories, diet tips, or anything else on your mind — I'll do my best!`;
}

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.GEMINI_API_KEY;

  // Try Gemini first
  if (apiKey) {
    const systemHistory = [
      { role: 'user', parts: [{ text: 'You are NutriBot, a friendly and helpful AI assistant inside the NutriTrack app. You can chat about anything, but you specialise in nutrition, health, diet, calories, and fitness. Be conversational, warm, and helpful. Use emojis occasionally. Keep replies concise (2-4 sentences or a short list).' }] },
      { role: 'model', parts: [{ text: "Hey! I'm NutriBot 🌿 — your friendly AI assistant. I can help with nutrition, fitness, or just have a chat. What's up?" }] }
    ];

    const chatHistory = [
      ...systemHistory,
      ...(history || []).map(m => ({
        role: m.role === 'bot' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }))
    ];

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(message);
        const reply = result.response.text();
        return res.json({ reply, source: 'gemini' });
      } catch (error) {
        const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('retry') || error.status === 429;
        console.error(`❌ Chat attempt ${attempt + 1}:`, error.message?.slice(0, 100));
        if (isRateLimit && attempt === 0) {
          await sleep(3000);
          continue;
        }
        // Any error (rate limit or otherwise) — fall through to local fallback
        break;
      }
    }
  }

  // Local fallback — always works, no API needed
  const reply = getLocalAnswer(message);
  return res.json({ reply, source: 'local' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
