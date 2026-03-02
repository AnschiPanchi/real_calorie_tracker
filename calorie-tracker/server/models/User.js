const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    age: { type: Number, default: null },
    height: { type: Number, default: null },
    weight: { type: Number, default: null },
    gender: { type: String, default: 'unspecified' },
    activityLevel: { type: String, default: 'moderate' },
    goal: { type: Number, default: 2000 }
});

module.exports = mongoose.model('User', UserSchema);
