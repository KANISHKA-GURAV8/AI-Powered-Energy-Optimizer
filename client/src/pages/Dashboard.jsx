import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FiZap, FiDollarSign, FiTrendingUp, FiSun,
  FiWind, FiDroplet, FiMapPin, FiRefreshCw
} from 'react-icons/fi';
import './Dashboard.css';

// ── Weather icon mapping (OpenWeatherMap icon codes → emoji) ──
const WEATHER_ICONS = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '🌥️',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

// ── Custom Tooltip for Recharts ───────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        <p className="value">{payload[0].value} kWh</p>
      </div>
    );
  }
  return null;
};

/**
 * Dashboard Component
 * ─────────────────────────────────────────────────────────────
 * Fetches:
 *  1. /api/energy/dashboard → Stats (today's units, cost, bill prediction)
 *  2. /api/energy/weather   → Real-time weather from OpenWeatherMap
 *  3. /api/energy/logs      → Last 7-day trend for Recharts AreaChart
 *
 * Stats show 0 until real energy log data is added to MongoDB.
 * Chart is empty until logs exist.
 * Weather is live from OpenWeatherMap API.
 */
const Dashboard = () => {
  const { user } = useAuth();

  // ── State ─────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);
  const [weather, setWeather] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartPeriod, setChartPeriod] = useState('Daily');

  // ── Fetch dashboard stats & energy logs ───────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Run both requests in parallel for speed
      const [statsRes, logsRes] = await Promise.all([
        api.get('/energy/dashboard'),
        api.get('/energy/logs'),
      ]);

      setStats(statsRes.data);

      // Shape logs for Recharts: { date: "May 10", value: 12.4 }
      const formatted = logsRes.data.map((log) => ({
        date: new Date(log.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        value: parseFloat(log.unitsConsumed.toFixed(2)),
      }));
      setChartData(formatted);
    } catch (err) {
      // No training data yet — show all zeros until real logs are added
      setStats({ todayUnits: 0, todayCost: '0.00', predictedMonthlyBill: '0', savedToday: 0 });
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch real-time weather from OpenWeatherMap ───────────────
  const fetchWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      const city = user?.city || 'Bangalore';
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

      // Call OpenWeatherMap directly using the client-side API key
      if (apiKey && apiKey !== 'YOUR_OPENWEATHER_API_KEY') {
        const owRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
        );
        if (owRes.ok) {
          const d = await owRes.json();
          setWeather({
            city: d.name,
            country: d.sys.country,
            temp: Math.round(d.main.temp),
            feelsLike: Math.round(d.main.feels_like),
            humidity: d.main.humidity,
            wind: (d.wind.speed * 3.6).toFixed(1),
            description: d.weather[0].description,
            icon: d.weather[0].icon,
            main: d.weather[0].main,
          });
          setWeatherLoading(false);
          return;
        }
      }
      // Fallback to backend proxy
      const res = await api.get('/energy/weather');
      setWeather(res.data);
    } catch (err) {
      // Weather unavailable — UI will show "Weather unavailable"
      console.warn('Weather API unavailable');
    } finally {
      setWeatherLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
    fetchWeather();
  }, [fetchDashboardData, fetchWeather]);

  // If no real logs yet, show last 7 days with value 0 (flat zero line)
  const zeroChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      value: 0,
    };
  });
  const displayChart = chartData.length > 0 ? chartData : zeroChart;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="dashboard-header fade-in-up">
        <div>
          <h1>Hello, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening with your energy today.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* City badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 20, padding: '6px 14px', fontSize: '0.82rem', color: '#16a34a',
            fontWeight: 600,
          }}>
            <FiMapPin size={12} /> {user?.city || 'Bangalore'}, India
          </div>

          {/* Refresh button */}
          <button
            onClick={() => { fetchDashboardData(); fetchWeather(); }}
            style={{
              background: '#ffffff', border: '1px solid #e8edf3',
              borderRadius: 10, padding: '8px 14px', color: '#64748b',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.85rem', fontFamily: 'Inter,sans-serif',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="stat-grid">
        <StatCard
          label="Units Consumed (Today)"
          value={stats?.todayUnits ?? 0}
          unit="kWh"
          change="No data yet"
          changeType="positive"
          icon={<FiZap />}
          iconColor="#22c55e"
          delay="fade-in-up-1"
        />
        <StatCard
          label="Current Cost (Today)"
          value={stats ? `₹${stats.todayCost}` : '₹0.00'}
          unit=""
          change="No data yet"
          changeType="positive"
          icon={<FiDollarSign />}
          iconColor="#f59e0b"
          delay="fade-in-up-2"
        />
        <StatCard
          label="Predicted Bill (This Month)"
          value={stats ? `₹${stats.predictedMonthlyBill}` : '₹0'}
          unit=""
          change="No data yet"
          changeType="positive"
          icon={<FiTrendingUp />}
          iconColor="#8b5cf6"
          delay="fade-in-up-3"
        />
        <StatCard
          label="Units Saved (This Month)"
          value={stats?.savedToday ?? 0}
          unit="kWh"
          change="No data yet"
          changeType="positive"
          icon={<FiSun />}
          iconColor="#06b6d4"
          delay="fade-in-up-4"
        />
      </div>

      {/* ── Charts Row ─────────────────────────────────────── */}
      <div className="charts-row">

        {/* Energy Trend Chart */}
        <div className="chart-card fade-in-up-2">
          <div className="chart-card-header">
            <h3>⚡ Energy Consumption Trend</h3>
            <div className="chart-tab-group">
              {['Daily', 'Weekly', 'Monthly'].map((p) => (
                <button
                  key={p}
                  className={`chart-tab ${chartPeriod === p ? 'active' : ''}`}
                  onClick={() => setChartPeriod(p)}
                >{p}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={displayChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                {/* Gradient fill definition */}
                <defs>
                  <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />

                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}`}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  fill="url(#energyGrad)"
                  dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#22c55e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Weather Card ─────────────────────────────────── */}
        <div className="weather-card fade-in-up-3">
          <h3><span>🌤️</span> Current Weather</h3>

          {weatherLoading ? (
            <div className="spinner" />
          ) : weather ? (
            <>
              {/* City badge */}
              <div className="weather-city-badge">
                <FiMapPin size={11} />
                {weather.city}, {weather.country}
              </div>

              {/* Temp + icon */}
              <div className="weather-main">
                <span className="weather-icon">{WEATHER_ICONS[weather.icon] || '🌡️'}</span>
                <div>
                  <div className="weather-temp">
                    {weather.temp}<span>°C</span>
                  </div>
                  <div className="weather-desc">{weather.description}</div>
                </div>
              </div>

              {/* Details */}
              <div className="weather-details">
                <div className="weather-detail-item">
                  <span className="label">🌡️ Feels like</span>
                  <span className="value">{weather.feelsLike}°C</span>
                </div>
                <div className="weather-detail-item">
                  <FiDroplet style={{ color: '#60a5fa' }} />
                  <span className="label">Humidity</span>
                  <span className="value">{weather.humidity}%</span>
                </div>
                <div className="weather-detail-item">
                  <FiWind style={{ color: '#a78bfa' }} />
                  <span className="label">Wind</span>
                  <span className="value">{weather.wind} km/h</span>
                </div>
              </div>

              {/* Active tariff info */}
              <div className="tariff-box">
                <h4>⚡ Active Tariff</h4>
                <div className="tariff-value">₹8.00 / kWh</div>
                <div className="tariff-hours">Peak Hours: 6:00 AM – 10:00 PM</div>
              </div>
            </>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', marginTop: 40 }}>
              Weather unavailable
            </p>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-error" style={{ marginTop: 8 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

// ── Reusable Stat Card component ──────────────────────────────
const StatCard = ({ label, value, unit, change, changeType, icon, iconColor, delay }) => (
  <div className={`stat-card ${delay}`}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <span className="stat-label">{label}</span>
      <span style={{
        color: iconColor,
        background: `${iconColor}20`,
        padding: '6px',
        borderRadius: 8,
        display: 'flex',
        fontSize: '1rem',
      }}>{icon}</span>
    </div>
    <div>
      <span className="stat-value">{value}</span>
      {unit && <span className="stat-unit">{unit}</span>}
    </div>
    <div className={`stat-change ${changeType}`}>{change}</div>
  </div>
);

export default Dashboard;