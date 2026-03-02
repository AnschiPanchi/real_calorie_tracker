const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB max client upload size
});

router.post('/', upload.single('image'), async (req, res) => {
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

module.exports = router;
