import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PrivateRoute Component
 * ─────────────────────────────────────────────────────────────
 * Guards protected pages (like /dashboard) from unauthenticated access.
 *
 * Flow:
 *  1. If auth is still loading (checking localStorage) → show spinner
 *  2. If user is not logged in → redirect to /login
 *  3. If user is logged in → render the protected component
 *
 * Usage in App.jsx:
 *   <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
 */
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Still checking localStorage session
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default PrivateRoute;
