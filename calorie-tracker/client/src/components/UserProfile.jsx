import React, { useState } from 'react';
import { X, User, Activity, Ruler, Weight, UserCircle2 } from 'lucide-react';
import api from '../api';

const UserProfile = ({ user, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        age: user.age || '',
        height: user.height || '',
        weight: user.weight || '',
        gender: user.gender || 'unspecified',
        activityLevel: user.activityLevel || 'moderate',
        goal: user.goal || 2000
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['age', 'height', 'weight', 'goal'].includes(name) ? Number(value) : value
        }));
    };

    const calculateSuggestedGoal = () => {
        // Very basic BMR calculation (Mifflin-St Jeor)
        if (!formData.age || !formData.height || !formData.weight || formData.gender === 'unspecified') {
            setMessage({ text: 'Please fill out age, height, weight, and gender to calculate suggestions.', type: 'error' });
            return;
        }

        let bmr = 10 * formData.weight + 6.25 * formData.height - 5 * formData.age;
        bmr += formData.gender === 'male' ? +5 : -161;

        // Activity Multiplier
        const multipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };

        const tdee = Math.round(bmr * (multipliers[formData.activityLevel] || 1.2));

        setFormData(prev => ({ ...prev, goal: tdee }));
        setMessage({ text: `Suggested goal updated to ${tdee} kcal based on your profile!`, type: 'success' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const res = await api.put('/api/auth/profile', {
                email: user.email,
                ...formData
            });

            onUpdate(res.data);
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            setTimeout(onClose, 1500);
        } catch (error) {
            setMessage({ text: 'Failed to update profile.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="profile-modal">
                <div className="profile-header">
                    <div className="profile-title">
                        <UserCircle2 size={24} className="text-primary" />
                        <h2>User Profile</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-grid">
                        {/* Personal Details */}
                        <div className="form-group">
                            <label><User size={14} /> Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Age (years)</label>
                            <input
                                type="number"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                min="1"
                            />
                        </div>

                        <div className="form-group">
                            <label><Ruler size={14} /> Height (cm)</label>
                            <input
                                type="number"
                                name="height"
                                value={formData.height}
                                onChange={handleChange}
                                min="50"
                            />
                        </div>

                        <div className="form-group">
                            <label><Weight size={14} /> Weight (kg)</label>
                            <input
                                type="number"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                min="20"
                            />
                        </div>

                        <div className="form-group">
                            <label>Biological Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange}>
                                <option value="unspecified">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label><Activity size={14} /> Activity Level</label>
                            <select name="activityLevel" value={formData.activityLevel} onChange={handleChange}>
                                <option value="sedentary">Sedentary (Little to no exercise)</option>
                                <option value="light">Light (Exercise 1-3 days/wk)</option>
                                <option value="moderate">Moderate (Exercise 3-5 days/wk)</option>
                                <option value="active">Active (Exercise 6-7 days/wk)</option>
                                <option value="very_active">Very Active (Hard exercise daily)</option>
                            </select>
                        </div>
                    </div>

                    {/* Goal Setting */}
                    <div className="form-group goal-group mt-4">
                        <label>Daily Calorie Goal (kcal)</label>
                        <div className="goal-input-row">
                            <input
                                type="number"
                                name="goal"
                                value={formData.goal}
                                onChange={handleChange}
                                className="goal-input"
                                required
                            />
                            <button type="button" className="btn secondary" onClick={calculateSuggestedGoal}>
                                Auto-Calculate
                            </button>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`form-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="form-actions mt-4">
                        <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;
