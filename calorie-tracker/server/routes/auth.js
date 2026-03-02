const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/signup', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ error: "Signup failed" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (user) {
            // Don't send password back to client
            const { password, ...userData } = user.toObject();
            res.json(userData);
        }
        else res.status(401).json({ error: "Invalid credentials" });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const { email, ...updates } = req.body;
        const user = await User.findOneAndUpdate(
            { email },
            { $set: updates },
            { new: true } // Return updated document
        );

        if (user) {
            const { password, ...userData } = user.toObject();
            res.json(userData);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

module.exports = router;
