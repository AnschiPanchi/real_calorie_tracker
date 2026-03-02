import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, User, Ruler, Activity, Target, RefreshCw, ExternalLink, Salad } from 'lucide-react';

// ─── Food suggestions per BMI x Diet ─────────────────────────────────
const FOOD_MAP = {
    underweight: {
        veg: ['Avocado', 'Banana', 'Sweet potato', 'Peanut butter', 'Almonds', 'Brown rice', 'Greek yogurt', 'Oats', 'Cheese', 'Chickpeas'],
        nonveg: ['Salmon', 'Eggs', 'Chicken thighs', 'Whole milk', 'Tuna', 'Cottage cheese', 'Beef', 'Shrimp', 'Turkey', 'Greek yogurt'],
        vegan: ['Avocado', 'Banana', 'Peanut butter', 'Almonds', 'Brown rice', 'Quinoa', 'Tofu', 'Chickpeas', 'Coconut milk', 'Dates'],
    },
    normal: {
        veg: ['Spinach', 'Oats', 'Blueberries', 'Lentils', 'Broccoli', 'Apple', 'Tofu', 'Mixed nuts', 'Paneer', 'Quinoa'],
        nonveg: ['Chicken breast', 'Tuna', 'Eggs', 'Salmon', 'Turkey', 'Lentils', 'Spinach', 'Blueberries', 'Oats', 'Mixed nuts'],
        vegan: ['Oats', 'Blueberries', 'Lentils', 'Quinoa', 'Tofu', 'Spinach', 'Chia seeds', 'Hemp seeds', 'Edamame', 'Tempeh'],
    },
    overweight: {
        veg: ['Cucumber', 'Celery', 'Broccoli', 'Kale', 'Cauliflower', 'Lentils', 'Grapefruit', 'Edamame', 'Zucchini', 'Cottage cheese'],
        nonveg: ['Grilled chicken', 'Egg whites', 'Tuna in water', 'Turkey breast', 'White fish', 'Shrimp', 'Broccoli', 'Kale', 'Cucumber', 'Cauliflower'],
        vegan: ['Cucumber', 'Zucchini', 'Kale', 'Broccoli', 'Edamame', 'Lentils', 'Cauliflower', 'Celery', 'Mushrooms', 'Grapefruit'],
    },
    obese: {
        veg: ['Lettuce', 'Tomato', 'Cucumber', 'Spinach soup', 'Mushrooms', 'Moong dal', 'Buttermilk', 'Watermelon', 'Black beans', 'Asparagus'],
        nonveg: ['Turkey breast', 'Grilled fish', 'Egg whites', 'Chicken soup', 'Shrimp', 'Tuna', 'Lettuce', 'Spinach', 'Cucumber', 'Celery'],
        vegan: ['Lettuce', 'Spinach', 'Cucumber', 'Mushrooms', 'Tomato', 'Black beans', 'Celery', 'Watermelon', 'Asparagus', 'Zucchini soup'],
    },
};

const BMI_META = {
    underweight: { label: 'Underweight', color: '#60a5fa', goal: 'Gain healthy weight with nutrient-dense, calorie-rich foods' },
    normal: { label: 'Normal Weight', color: '#00e896', goal: 'Maintain your weight with a balanced, varied diet' },
    overweight: { label: 'Overweight', color: '#fbbf24', goal: 'Prioritise low-calorie, high-fibre and protein-rich foods' },
    obese: { label: 'Obese', color: '#ff4d6d', goal: 'Focus on high-volume, low-calorie whole foods and stay hydrated' },
};

const DIET_OPTIONS = [
    { key: 'veg', icon: '🥦', label: 'Vegetarian', desc: 'No meat — includes dairy & eggs' },
    { key: 'nonveg', icon: '🍗', label: 'Non-Vegetarian', desc: 'Includes meat, fish, poultry' },
    { key: 'vegan', icon: '🌱', label: 'Vegan', desc: 'No animal products at all' },
];

// ─── Helpers ──────────────────────────────────────────────────
const getBMICategory = (bmi) => { if (bmi < 18.5) return 'underweight'; if (bmi < 25) return 'normal'; if (bmi < 30) return 'overweight'; return 'obese'; };
const calcBMR = (w, h, a, g) => g === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
const ACTIVITY_MULT = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
const ACTIVITY_LABELS = {
    sedentary: 'Sedentary (desk job, no exercise)',
    light: 'Lightly active (1–3 days/week)',
    moderate: 'Moderately active (3–5 days/week)',
    active: 'Very active (6–7 days/week)',
    very_active: 'Extra active (physical job + daily gym)',
};

const STEPS = ['Personal', 'Body', 'Activity', 'Diet & Goal'];

const BMICalculator = ({ user, onSuggestSearch }) => {
    const [profile, setProfile] = useState(() => { try { return JSON.parse(localStorage.getItem('healthProfile')) || null; } catch { return null; } });
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        name: user?.name || '',
        age: user?.age || '',
        gender: user?.gender && user.gender !== 'unspecified' ? user.gender : 'male',
        heightCm: user?.height || '',
        weightKg: user?.weight || '',
        activity: user?.activityLevel || 'moderate',
        goal: 'maintain',
        diet: 'veg'
    });
    const [result, setResult] = useState(null);

    useEffect(() => { if (profile) computeResult(profile); }, [profile]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const canNext = () => { if (step === 0) return form.name.trim() && form.age; if (step === 1) return form.heightCm && form.weightKg; return true; };

    const handleFinish = () => { localStorage.setItem('healthProfile', JSON.stringify(form)); setProfile(form); computeResult(form); };

    const computeResult = (d) => {
        const bmi = Number(d.weightKg) / ((Number(d.heightCm) / 100) ** 2);
        const bmr = calcBMR(Number(d.weightKg), Number(d.heightCm), Number(d.age), d.gender);
        const tdee = bmr * ACTIVITY_MULT[d.activity];
        const calTarget = d.goal === 'lose' ? tdee - 500 : d.goal === 'gain' ? tdee + 300 : tdee;
        setResult({ bmi, bmr, tdee, calTarget, category: getBMICategory(bmi) });
    };

    const handleReset = () => {
        localStorage.removeItem('healthProfile');
        setProfile(null);
        setResult(null);
        setStep(0);
        setForm({
            name: user?.name || '',
            age: user?.age || '',
            gender: user?.gender && user.gender !== 'unspecified' ? user.gender : 'male',
            heightCm: user?.height || '',
            weightKg: user?.weight || '',
            activity: user?.activityLevel || 'moderate',
            goal: 'maintain',
            diet: 'veg'
        });
    };

    // ── Results ─────────────────────────────────────────────────
    if (result && profile) {
        const meta = BMI_META[result.category];
        const foods = FOOD_MAP[result.category][profile.diet] || FOOD_MAP[result.category].veg;
        const dietLabel = DIET_OPTIONS.find(d => d.key === profile.diet)?.label || 'Vegetarian';

        return (
            <div className="bmi-results">
                <div className="bmi-results-header">
                    <h1 className="bmi-greeting">Hey, {profile.name}! 👋</h1>
                    <p className="bmi-sub">Your personalised health profile • {dietLabel} diet</p>
                    <button className="bmi-reset-btn" onClick={handleReset}><RefreshCw size={14} /> Recalculate</button>
                </div>

                <div className="bmi-cards-row">
                    {/* BMI Gauge */}
                    <div className="bmi-main-card" style={{ '--cat-color': meta.color }}>
                        <div className="bmi-value-label">BMI</div>
                        <div className="bmi-value">{result.bmi.toFixed(1)}</div>
                        <div className="bmi-category-badge" style={{ color: meta.color, background: meta.color + '18', borderColor: meta.color + '40' }}>
                            {meta.label}
                        </div>
                        <div className="bmi-bar-wrapper">
                            {[['< 18.5', '#60a5fa'], ['18.5 – 24.9', '#00e896'], ['25 – 29.9', '#fbbf24'], ['≥ 30', '#ff4d6d']].map(([lbl, c]) => (
                                <div key={lbl} className="bmi-bar-seg" style={{ background: c + '30', flexGrow: 1 }}>
                                    <span style={{ color: c }}>{lbl}</span>
                                </div>
                            ))}
                            <div className="bmi-bar-pointer" style={{ left: `${Math.min(Math.max(((result.bmi - 10) / 30) * 100, 2), 98)}%`, background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
                        </div>
                    </div>

                    {/* Calorie Card */}
                    <div className="bmi-cal-card">
                        <div className="bmi-cal-item">
                            <span className="bmi-cal-label">Maintenance Calories</span>
                            <span className="bmi-cal-value">{Math.round(result.tdee)} kcal</span>
                        </div>
                        <div className="bmi-cal-divider" />
                        <div className="bmi-cal-item highlight">
                            <span className="bmi-cal-label">
                                {profile.goal === 'lose' ? '🔥 Target to Lose Weight' : profile.goal === 'gain' ? '💪 Target to Gain Weight' : '⚖️ Target to Maintain'}
                            </span>
                            <span className="bmi-cal-value-big">{Math.round(result.calTarget)} kcal</span>
                            <span className="bmi-cal-sub">{profile.goal === 'lose' ? '−500 kcal deficit' : profile.goal === 'gain' ? '+300 kcal surplus' : 'Balanced intake'}</span>
                        </div>
                    </div>
                </div>

                {/* Food Suggestions */}
                <div className="bmi-food-section">
                    <div className="bmi-food-header">
                        <h2 className="bmi-food-title">Recommended Foods for You
                            <span className="bmi-diet-badge">{DIET_OPTIONS.find(d => d.key === profile.diet)?.icon} {dietLabel}</span>
                        </h2>
                        <p className="bmi-food-sub">{meta.goal}</p>
                    </div>
                    <div className="bmi-food-chips">
                        {foods.map(food => (
                            <button key={food} className="bmi-food-chip" onClick={() => onSuggestSearch(food)} title={`Search "${food}"`}>
                                {food} <ExternalLink size={12} style={{ marginLeft: 6, opacity: 0.6 }} />
                            </button>
                        ))}
                    </div>
                    <p className="bmi-chip-hint">Click any food to search its calories in the Dashboard</p>
                </div>
            </div>
        );
    }

    // ── Questionnaire ───────────────────────────────────────────
    return (
        <div className="bmi-form-wrapper">
            <div className="bmi-form-card">
                <div className="bmi-steps">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`bmi-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                            <div className="bmi-step-dot">{i < step ? '✓' : i + 1}</div>
                            <span>{s}</span>
                        </div>
                    ))}
                </div>

                <div className="bmi-form-body">
                    {step === 0 && (
                        <div className="bmi-form-step">
                            <div className="bmi-step-icon"><User size={28} /></div>
                            <h2>Personal Info</h2>
                            <p>Let's start with a few basics</p>
                            <div className="bmi-field"><label>Your Name</label><input className="bmi-input" placeholder="e.g. Ansh" value={form.name} onChange={e => set('name', e.target.value)} /></div>
                            <div className="bmi-field"><label>Age</label><input className="bmi-input" type="number" placeholder="e.g. 20" value={form.age} onChange={e => set('age', e.target.value)} /></div>
                            <div className="bmi-field"><label>Gender</label>
                                <div className="bmi-toggle-group">
                                    {['male', 'female'].map(g => <button key={g} className={`bmi-toggle-btn ${form.gender === g ? 'active' : ''}`} onClick={() => set('gender', g)}>{g === 'male' ? '♂ Male' : '♀ Female'}</button>)}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="bmi-form-step">
                            <div className="bmi-step-icon"><Ruler size={28} /></div>
                            <h2>Body Measurements</h2>
                            <p>Used to calculate your BMI accurately</p>
                            <div className="bmi-field"><label>Height (cm)</label><input className="bmi-input" type="number" placeholder="e.g. 175" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} /></div>
                            <div className="bmi-field"><label>Weight (kg)</label><input className="bmi-input" type="number" placeholder="e.g. 70" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} /></div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="bmi-form-step">
                            <div className="bmi-step-icon"><Activity size={28} /></div>
                            <h2>Activity Level</h2>
                            <p>How active are you during the week?</p>
                            <div className="bmi-activity-list">
                                {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                                    <button key={key} className={`bmi-activity-btn ${form.activity === key ? 'active' : ''}`} onClick={() => set('activity', key)}>{label}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="bmi-form-step">
                            <div className="bmi-step-icon"><Salad size={28} /></div>
                            <h2>Diet & Goal</h2>
                            <p>Tell us about your eating habits and what you want to achieve</p>

                            <div className="bmi-field">
                                <label>Diet Preference</label>
                                <div className="bmi-diet-grid">
                                    {DIET_OPTIONS.map(d => (
                                        <button key={d.key} className={`bmi-diet-card ${form.diet === d.key ? 'active' : ''}`} onClick={() => set('diet', d.key)}>
                                            <span className="bmi-diet-icon">{d.icon}</span>
                                            <strong>{d.label}</strong>
                                            <span>{d.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bmi-field" style={{ marginTop: 20 }}>
                                <label>Your Goal</label>
                                <div className="bmi-goal-cards">
                                    {[
                                        { key: 'lose', icon: '🔥', label: 'Lose Weight', desc: '−500 kcal daily' },
                                        { key: 'maintain', icon: '⚖️', label: 'Maintain', desc: 'Current weight' },
                                        { key: 'gain', icon: '💪', label: 'Gain Muscle', desc: '+300 kcal daily' },
                                    ].map(g => (
                                        <button key={g.key} className={`bmi-goal-card ${form.goal === g.key ? 'active' : ''}`} onClick={() => set('goal', g.key)}>
                                            <span className="bmi-goal-icon">{g.icon}</span>
                                            <strong>{g.label}</strong>
                                            <span>{g.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bmi-form-nav">
                    {step > 0 && <button className="bmi-nav-btn secondary" onClick={() => setStep(s => s - 1)}><ChevronLeft size={16} /> Back</button>}
                    <div style={{ flex: 1 }} />
                    {step < STEPS.length - 1
                        ? <button className="bmi-nav-btn primary" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>Next <ChevronRight size={16} /></button>
                        : <button className="bmi-nav-btn primary" onClick={handleFinish}>See My Results ✓</button>
                    }
                </div>
            </div>
        </div>
    );
};

export default BMICalculator;
