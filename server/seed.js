/**
 * Seed Script — Populates MongoDB with sample energy logs for testing.
 * Run: node seed.js
 *
 * Creates 7 days of energy logs for a test user.
 * Useful for demoing the dashboard trend chart.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const EnergyLog = require('./models/EnergyLog');
const User = require('./models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find or create a demo user
  let user = await User.findOne({ email: 'demo@energy.com' });
  if (!user) {
    user = await User.create({
      name: 'Arjun Demo',
      email: 'demo@energy.com',
      password: 'password123',
      city: 'Bangalore',
    });
    console.log('Demo user created:', user.email);
  }

  // Generate 7 days of logs
  const logs = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    logs.push({
      userId: user._id,
      date: dateStr,
      unitsConsumed: parseFloat((Math.random() * 10 + 8).toFixed(1)), // 8–18 kWh
      costPerUnit: 5,
    });
  }

  // Delete old logs for this user and insert fresh
  await EnergyLog.deleteMany({ userId: user._id });
  await EnergyLog.insertMany(logs);

  console.log('✅ Seeded', logs.length, 'energy logs');
  console.log('Login with: demo@energy.com / password123');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
