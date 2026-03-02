const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/:code', async (req, res) => {
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

module.exports = router;
