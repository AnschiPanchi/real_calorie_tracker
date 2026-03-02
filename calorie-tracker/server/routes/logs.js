const express = require('express');
const router = express.Router();
// Ensure 'Log' matches the exact capitalization of your file in the models folder
const Log = require('../models/Log');

// --- 1. STATISTICS ROUTE (FOR INSIGHTS PAGE) ---
router.get('/stats', async (req, res) => {
  const { email } = req.query;
  try {
    const logs = await Log.find({ userEmail: email });

    const now = new Date();

    // --- Build day-by-day calorie map for all time ---
    const dayMap = {};
    logs.forEach(log => {
      const date = new Date(log.createdAt || log.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
      dayMap[date] = (dayMap[date] || 0) + (Number(log.calories) || 0);
    });

    // --- TIMEFRAME CALCULATIONS ---
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    // --- PEAK INTAKE ---
    const allValues = Object.values(dayMap);
    const peakValue = allValues.length > 0 ? Math.max(...allValues) : 0;
    const peakDate = Object.keys(dayMap).find(d => dayMap[d] === peakValue) || 'No data';

    // --- LAST 7 DAYS (for Daily chart) ---
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString('en-CA');
      const label = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue"...
      dailyData.push({ label, date: key, calories: dayMap[key] || 0 });
    }

    // --- LAST 4 WEEKS (for Weekly chart) ---
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const total = logs
        .filter(l => {
          const d = new Date(l.createdAt || l.date);
          return d >= start && d <= end;
        })
        .reduce((s, l) => s + (Number(l.calories) || 0), 0);

      weeklyData.push({
        label: i === 0 ? 'This Week' : `${i}w ago`,
        calories: total
      });
    }

    // --- LAST 6 MONTHS (for Monthly chart) ---
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      const total = logs
        .filter(l => {
          const ld = new Date(l.createdAt || l.date);
          return ld.getFullYear() === year && ld.getMonth() === month;
        })
        .reduce((s, l) => s + (Number(l.calories) || 0), 0);

      monthlyData.push({ label: monthLabel, calories: total });
    }

    res.json({
      weekTotal: logs.filter(l => new Date(l.createdAt || l.date) >= startOfWeek).reduce((s, l) => s + (Number(l.calories) || 0), 0),
      monthTotal: logs.filter(l => new Date(l.createdAt || l.date) >= startOfMonth).reduce((s, l) => s + (Number(l.calories) || 0), 0),
      yearTotal: logs.filter(l => new Date(l.createdAt || l.date) >= startOfYear).reduce((s, l) => s + (Number(l.calories) || 0), 0),
      peakIntake: { calories: peakValue, date: peakDate },
      dailyData,
      weeklyData,
      monthlyData
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- 2. DAILY LOG ROUTES (FOR DASHBOARD) ---
router.get('/', async (req, res) => {
  try {
    // Only return logs from TODAY (midnight to now)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await Log.find({
      userEmail: req.query.email,
      createdAt: { $gte: startOfDay }
    }).sort({ createdAt: -1 });

    res.json(logs);
  } catch (err) { res.status(500).send(err); }
});

router.post('/', async (req, res) => {
  try {
    const log = new Log(req.body);
    await log.save();
    res.json(log);
  } catch (err) { res.status(500).send(err); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Log.findByIdAndDelete(req.params.id);
    res.send("Deleted");
  } catch (err) { res.status(500).send(err); }
});

module.exports = router;