const mongoose = require('mongoose');

/**
 * EnergyLog Schema
 * Records daily energy consumption (kWh) per user.
 * Used for dashboard stats and trend chart.
 */
const energyLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // e.g. "2024-05-10"
      required: true,
    },
    unitsConsumed: {
      type: Number, // kWh consumed that day
      required: true,
    },
    costPerUnit: {
      type: Number,
      default: 5, // ₹5 per kWh default tariff
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EnergyLog', energyLogSchema);
