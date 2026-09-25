import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appliances from './pages/Appliances';
import Recommendations from './pages/Recommendations';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import './index.css';

/**
 * App Root Component
 * ─────────────────────────────────────────────────────────────
 * Sets up:
 *  - AuthProvider: Global JWT auth state (React Context)
 *  - React Router: Client-side navigation
 *
 * Route structure:
 *   /login      → LoginPage (public)
 *   /dashboard  → Dashboard (protected — requires JWT)
 *   /           → Redirects to /dashboard
 *
 * Layout:
 *   - Protected routes render inside the app-layout (sidebar + main)
 *   - Login page renders standalone (no sidebar)
 */

// AppLayout wraps protected pages with the sidebar
const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <main className="main-content">{children}</main>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — wrapped with sidebar layout */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </PrivateRoute>
            }
          />

          {/* Real routes connected to database & ML model */}
          <Route path="/appliances"      element={<PrivateRoute><AppLayout><Appliances /></AppLayout></PrivateRoute>} />
          <Route path="/analytics"       element={<PrivateRoute><AppLayout><Analytics /></AppLayout></PrivateRoute>} />
          <Route path="/recommendations" element={<PrivateRoute><AppLayout><Recommendations /></AppLayout></PrivateRoute>} />
          <Route path="/settings"        element={<PrivateRoute><AppLayout><Settings /></AppLayout></PrivateRoute>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

// Simple placeholder for future pages
const PlaceholderPage = ({ title }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
    <span style={{ fontSize: '3rem' }}>🚧</span>
    <h2 style={{ color: '#f0f6ff', fontSize: '1.5rem' }}>{title}</h2>
    <p style={{ color: '#94a3b8' }}>Coming soon — This page is under construction.</p>
  </div>
);

export default App;
