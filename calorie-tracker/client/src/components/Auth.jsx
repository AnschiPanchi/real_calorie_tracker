import React, { useState } from 'react';
import api from '../api';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Using the 5000 port where your server is running
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await api.post(endpoint, {
        ...formData,
        email: formData.email.toLowerCase() // Matching your server's case-insensitive logic
      });

      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Check your connection.');
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Login to track your calories' : 'Start your fitness journey today'}</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Ansh Gupta"
                required
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}

          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="ansh@example.com"
              required
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button type="submit" className="auth-submit-btn">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button className="toggle-auth-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};

export default Auth;