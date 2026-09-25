import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { FiTrendingUp, FiActivity, FiDollarSign, FiZap } from 'react-icons/fi';
import api from '../services/api';
import './Analytics.css';

const COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

const PRIORITY_COLORS = {
  'Essential': '#16a34a',
  'Medium': '#d97706',
  'Non-essential': '#4f46e5'
};

const Analytics = () => {
  const [appliances, setAppliances] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load custom settings
  const tariffRate = Number(localStorage.getItem('tariffRate')) || 5.80;

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const [appRes, logRes] = await Promise.all([
          api.get('/appliances'),
          api.get('/energy/logs')
        ]);
        setAppliances(appRes.data);
        setLogs(logRes.data);
        setError('');
      } catch (err) {
        setError('Failed to load analytics data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, []);

  // ── Data Processing ───────────────────────────────────────────
  
  // 1. Pie Chart: Power distribution of ON appliances
  const activeAppliances = appliances.filter(a => a.status && a.active > 0);
  const pieData = activeAppliances.map(a => ({
    name: a.name,
    value: a.power * a.active
  }));

  const totalActiveLoad = activeAppliances.reduce((sum, a) => sum + a.power * a.active, 0);

  // 2. Bar Chart: Priority power distribution (both active and total capacity)
  const priorityCapacity = appliances.reduce((acc, a) => {
    const p = a.priority || 'Medium';
    if (!acc[p]) acc[p] = { name: p, Active: 0, Total: 0 };
    acc[p].Total += a.power * a.quantity;
    if (a.status) {
      acc[p].Active += a.power * a.active;
    }
    return acc;
  }, {});

  const barData = Object.values(priorityCapacity);

  // 3. Area Chart: Trend data (7 days)
  const trendData = logs.map(l => ({
    date: new Date(l.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    kWh: parseFloat(l.unitsConsumed.toFixed(2)),
    Cost: parseFloat((l.unitsConsumed * l.costPerUnit).toFixed(2))
  }));

  // Aggregated Stats
  const totalKwh = logs.reduce((sum, l) => sum + l.unitsConsumed, 0);
  const avgKwh = logs.length > 0 ? (totalKwh / logs.length).toFixed(2) : '0.00';
  const totalCost = logs.reduce((sum, l) => sum + l.unitsConsumed * l.costPerUnit, 0).toFixed(2);
  const maxConsumption = logs.length > 0 ? Math.max(...logs.map(l => l.unitsConsumed)).toFixed(2) : '0.00';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="analytics-header">
        <div>
          <h1>Energy Analytics</h1>
          <p>Detailed insights into your load patterns, consumption, and costs</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Overview Cards ──────────────────────────────────── */}
      <div className="analytics-grid">
        <div className="analytic-card stat">
          <div className="stat-content">
            <span className="label">Total Consumption (7 days)</span>
            <span className="value">{totalKwh.toFixed(2)} kWh</span>
          </div>
          <div className="stat-icon pink"><FiActivity /></div>
        </div>

        <div className="analytic-card stat">
          <div className="stat-content">
            <span className="label">Average Daily Usage</span>
            <span className="value">{avgKwh} kWh</span>
          </div>
          <div className="stat-icon green"><FiZap /></div>
        </div>

        <div className="analytic-card stat">
          <div className="stat-content">
            <span className="label">Total Spent (7 days)</span>
            <span className="value">₹{totalCost}</span>
          </div>
          <div className="stat-icon purple"><FiDollarSign /></div>
        </div>

        <div className="analytic-card stat">
          <div className="stat-content">
            <span className="label">Peak Log Day</span>
            <span className="value">{maxConsumption} kWh</span>
          </div>
          <div className="stat-icon amber"><FiTrendingUp /></div>
        </div>
      </div>

      {/* ── Main Charts Grid ─────────────────────────────────── */}
      <div className="charts-main-grid">
        
        {/* Historical Consumption & Cost Trend */}
        <div className="chart-wrapper trend">
          <h3>📈 Consumption vs. Cost Trend (Last 7 Days)</h3>
          {trendData.length === 0 ? (
            <div className="no-data-placeholder">Add daily energy logs in the Dashboard to see trends.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="kwhGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Area name="Units (kWh)" type="monotone" dataKey="kWh" stroke="#3b82f6" strokeWidth={2} fill="url(#kwhGrad)" />
                <Area name="Cost (₹)" type="monotone" dataKey="Cost" stroke="#8b5cf6" strokeWidth={2} fill="url(#costGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Load Distribution Pie Chart */}
        <div className="chart-wrapper pie">
          <h3>🍕 Active Load Distribution</h3>
          {pieData.length === 0 ? (
            <div className="no-data-placeholder">No appliances are currently turned ON. Turn on appliances to see distribution.</div>
          ) : (
            <div className="pie-container">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} W`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="legend-label">{entry.name}</span>
                    <span className="legend-val">{((entry.value / totalActiveLoad) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Priority load breakdown */}
        <div className="chart-wrapper priority-bar">
          <h3>⚡ Load by Priority Level</h3>
          {barData.length === 0 ? (
            <div className="no-data-placeholder">No appliances in database.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis unit=" W" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => `${value} W`} />
                <Legend />
                <Bar name="Active Load" dataKey="Active" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Bar name="Total Capacity" dataKey="Total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
