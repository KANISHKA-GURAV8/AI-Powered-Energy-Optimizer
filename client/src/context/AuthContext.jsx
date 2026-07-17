import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

/**
 * AuthContext — Global authentication state.
 *
 * Provides:
 *   user      → logged-in user object (or null)
 *   login()   → POST /api/auth/login  → verifies credentials in MongoDB
 *   register()→ POST /api/auth/register → saves new user to MongoDB
 *   logout()  → Clears localStorage and resets state
 *   loading   → true while checking stored session on app load
 *
 * Real auth flow:
 *   1. User submits form → login() or register() called
 *   2. Axios sends request to Express backend (localhost:5000)
 *   3. Express checks MongoDB (User model) + bcrypt password comparison
 *   4. On success: server returns JWT token
 *   5. Token stored in localStorage, attached to all future requests
 */
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on page refresh ──────────────────
  // This keeps the user logged in even after closing the browser tab
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // ── Login handler ───────────────────────────────────────────────────────
  // Sends email + password to Express → Express checks MongoDB → returns JWT
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  // ── Register handler ────────────────────────────────────────────────────
  // Sends name + email + password + city to Express → saves to MongoDB → returns JWT
  const register = async (name, email, password, city) => {
    const { data } = await api.post('/auth/register', { name, email, password, city });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  // ── Logout handler ──────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — use this in any component: const { user, login } = useAuth()
export const useAuth = () => useContext(AuthContext);
