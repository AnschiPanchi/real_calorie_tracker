const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
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

module.exports = router;
