const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/authMiddleware');
const EnergyLog = require('../models/EnergyLog');

// ── GET /api/energy/weather ───────────────────────────────────────────────────
/**
 * Fetch real-time weather from OpenWeatherMap API.
 * Uses the city stored in the user's profile.
 * Requires: Bearer JWT token
 * Returns: { temp, feelsLike, humidity, wind, description, icon, city }
 */
router.get('/weather', protect, async (req, res) => {
  try {
    const city = req.user.city || 'Bangalore';
    const apiKey = process.env.OPENWEATHER_API_KEY;

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );

    const data = response.data;

    res.json({
      city: data.name,
      country: data.sys.country,
      temp: Math.round(data.main.temp),           // °C rounded
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,               // %
      wind: (data.wind.speed * 3.6).toFixed(1),   // m/s → km/h
      description: data.weather[0].description,
      icon: data.weather[0].icon,                 // e.g. "01d"
      main: data.weather[0].main,                 // e.g. "Clear", "Clouds"
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch weather', error: error.message });
  }
});

// ── GET /api/energy/logs ──────────────────────────────────────────────────────
/**
 * Get last 7 days of energy consumption logs for the logged-in user.
 * Used to draw the usage trend graph on the dashboard.
 */
router.get('/logs', protect, async (req, res) => {
  try {
    const logs = await EnergyLog.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(7);

    // Return in chronological order for the chart
    res.json(logs.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs', error: error.message });
  }
});

// ── POST /api/energy/logs ─────────────────────────────────────────────────────
/**
 * Add or update today's energy log for the user.
 * Body: { unitsConsumed, costPerUnit }
 */
router.post('/logs', protect, async (req, res) => {
  try {
    const { unitsConsumed, costPerUnit } = req.body;
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Upsert — update if today's log exists, else create
    const log = await EnergyLog.findOneAndUpdate(
      { userId: req.user._id, date: today },
      { unitsConsumed, costPerUnit: costPerUnit || 5 },
      { upsert: true, new: true }
    );

    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Failed to save log', error: error.message });
  }
});

// ── GET /api/energy/dashboard ─────────────────────────────────────────────────
/**
 * Get aggregated dashboard stats for the current user.
 * Returns: today's units, current cost, predicted monthly bill, units saved.
 */
router.get('/dashboard', protect, async (req, res) => {
  try {
    const logs = await EnergyLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(30);

    const today = logs[0] || null;
    const todayUnits = today ? today.unitsConsumed : 0;
    const costPerUnit = today ? today.costPerUnit : 5;

    const todayCost = (todayUnits * costPerUnit).toFixed(2);

    // Monthly bill estimate: average daily usage × 30 × tariff
    const totalUnits = logs.reduce((sum, l) => sum + l.unitsConsumed, 0);
    const avgDaily = logs.length > 0 ? totalUnits / logs.length : todayUnits;
    const predictedMonthlyBill = (avgDaily * 30 * costPerUnit).toFixed(2);

    // Units saved vs yesterday (simple comparison)
    const yesterdayUnits = logs[1] ? logs[1].unitsConsumed : 0;
    const savedToday = (yesterdayUnits - todayUnits).toFixed(2);

    res.json({
      todayUnits,
      todayCost,
      predictedMonthlyBill,
      savedToday: savedToday > 0 ? savedToday : '0.00',
      logsCount: logs.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: error.message });
  }
});

module.exports = router;
