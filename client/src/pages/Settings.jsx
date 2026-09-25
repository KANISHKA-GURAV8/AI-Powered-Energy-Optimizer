import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FiUser, FiSettings, FiCheckCircle } from 'react-icons/fi';
import './Settings.css';

const Settings = () => {
  const { user, setUser } = useAuth();
  
  // Profile settings state
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    city: user?.city || ''
  });

  // System settings state (stored in localStorage and backend user profile)
  const [sanctionedLoad, setSanctionedLoad] = useState('4000');
  const [tariffRate, setTariffRate] = useState('5.80');
  const [historicalAvg, setHistoricalAvg] = useState('113.53');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load current system settings on mount
  useEffect(() => {
    const savedLoad = user?.sanctionedLoad || localStorage.getItem('sanctionedLoad') || '4000';
    const savedTariff = user?.tariffRate || localStorage.getItem('tariffRate') || '5.80';
    const savedAvg = user?.historicalAvg || localStorage.getItem('historicalAvg') || '113.53';
    setSanctionedLoad(String(savedLoad));
    setTariffRate(String(savedTariff));
    setHistoricalAvg(String(savedAvg));
  }, [user]);

  // Calculated Gruha Jyothi Entitlement Units (Average + 10% buffer, capped at 200 kWh)
  const avgNum = parseFloat(historicalAvg) || 0;
  const calculatedEntitlement = Math.min(200, Math.round(avgNum * 1.10 * 100) / 100);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const res = await api.put('/auth/profile', {
        name: profile.name,
        email: profile.email,
        city: profile.city
      });
      
      // Update local storage and auth context
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle System Parameter Update
  const handleSystemSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    if (Number(sanctionedLoad) <= 0 || Number(tariffRate) <= 0 || Number(historicalAvg) <= 0) {
      setError('Parameters must be positive values.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.put('/auth/profile', {
        sanctionedLoad: Number(sanctionedLoad),
        tariffRate: Number(tariffRate),
        historicalAvg: Number(historicalAvg)
      });

      localStorage.setItem('sanctionedLoad', sanctionedLoad);
      localStorage.setItem('tariffRate', tariffRate);
      localStorage.setItem('historicalAvg', historicalAvg);

      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      setSuccess('System parameters & Gruha Jyothi entitlement updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update parameters.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="settings-header">
        <div>
          <h1>Settings</h1>
          <p>Configure your profile and system parameters</p>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiCheckCircle /> {success}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      <div className="settings-grid-layout">
        
        {/* Profile Settings */}
        <form className="settings-card" onSubmit={handleProfileSubmit}>
          <div className="card-title">
            <FiUser size={18} />
            <h3>Profile Settings</h3>
          </div>
          
          <div className="settings-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>City (For Live Weather)</label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                required
              />
            </div>
            
            <button type="submit" className="btn-save-settings" disabled={loading}>
              {loading ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>

        {/* System Settings */}
        <form className="settings-card" onSubmit={handleSystemSubmit}>
          <div className="card-title">
            <FiSettings size={18} />
            <h3>System Parameters & Tariff</h3>
          </div>
          
          <div className="settings-form">
            <div className="form-group">
              <label>Historical Average Consumption (kWh / month)</label>
              <input
                type="number"
                step="0.01"
                value={historicalAvg}
                onChange={(e) => setHistoricalAvg(e.target.value)}
                min="1"
                required
              />
              <span className="help-text">
                Your annual/historical average monthly usage. Gruha Jyothi entitlement = Average + 10% buffer (capped at 200 kWh).
              </span>
            </div>

            {/* Live Entitlement Preview Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: 8, padding: '12px 14px', marginBottom: 14
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⚡ Gruha Jyothi Calculated Entitlement
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                {calculatedEntitlement} kWh / month
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Formula: {avgNum} kWh + 10% buffer = {(avgNum * 1.1).toFixed(2)} kWh (Capped at 200 kWh max)
              </div>
            </div>

            <div className="form-group">
              <label>Sanctioned Load Limit (Watts)</label>
              <input
                type="number"
                value={sanctionedLoad}
                onChange={(e) => setSanctionedLoad(e.target.value)}
                min="500"
                required
              />
              <span className="help-text">Max safe power capacity of your connection (e.g. 4000 W).</span>
            </div>
            
            <div className="form-group">
              <label>Peak Tariff Rate (₹ per kWh)</label>
              <input
                type="number"
                step="0.1"
                value={tariffRate}
                onChange={(e) => setTariffRate(e.target.value)}
                min="1"
                required
              />
              <span className="help-text">Electricity cost per unit (kWh). Default is KERC LT-1 (₹5.80).</span>
            </div>
            
            <button type="submit" className="btn-save-settings" disabled={loading}>
              {loading ? 'Saving...' : 'Save Parameters'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
