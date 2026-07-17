import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiActivity, FiSettings, FiLogOut,
  FiZap, FiBarChart2, FiThumbsUp
} from 'react-icons/fi';

/**
 * Sidebar Component
 * ─────────────────────────────────────────────────────────────
 * Persistent left navigation for the app layout.
 * Highlights the active route and handles logout.
 *
 * Nav links:
 *   /dashboard      → Dashboard
 *   /dashboard      → Appliances (placeholder)
 *   /dashboard      → Analytics (placeholder)
 *   /dashboard      → Recommendations (placeholder)
 */
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard',       icon: <FiGrid />,      path: '/dashboard' },
    { label: 'Appliances',      icon: <FiZap />,       path: '/appliances' },
    { label: 'Analytics',       icon: <FiBarChart2 />, path: '/analytics' },
    { label: 'Recommendations', icon: <FiThumbsUp />,  path: '/recommendations' },
    { label: 'Settings',        icon: <FiSettings />,  path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div className="logo-text">
          <span>AI Energy</span><br />Optimizer
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* ── User + Logout ──────────────────────────────────── */}
      <div className="sidebar-footer">
        {/* User avatar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px', background: 'rgba(255,255,255,0.04)',
          borderRadius: 10, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f0f6ff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || ''}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button className="nav-item" onClick={handleLogout} style={{ color: '#f87171' }}>
          <FiLogOut style={{ fontSize: '1rem' }} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
