import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from './api';
import './App.css';
import SearchBar from './components/SearchBar';
import FoodResult from './components/FoodResult';
import HistoryLog from './components/HistoryLog';
import Auth from './components/Auth';
import InsightsPage from './components/InsightsPage';
import BMICalculator from './components/BMICalculator';
import NutriBot from './components/NutriBot';
import BarcodeScanner from './components/BarcodeScanner';
import UserProfile from './components/UserProfile';
import LandingPage from './components/LandingPage';

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('userData')) || null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [results, setResults] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showScanner, setShowScanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Custom goal state with localStorage persistence, falling back to user's saved goal
  const [goal, setGoal] = useState(() => {
    const localGoal = localStorage.getItem('dailyGoal');
    if (localGoal) return Number(localGoal);
    const userData = JSON.parse(localStorage.getItem('userData'));
    return userData?.goal || 2000;
  });

  // NEW: State for consumption highlights
  const [stats, setStats] = useState({
    weekTotal: 0,
    monthTotal: 0,
    yearTotal: 0,
    peakIntake: { calories: 0, date: 'No data' },
    dailyData: [],
    weeklyData: [],
    monthlyData: [],
  });

  // Fetch daily logs
  useEffect(() => {
    if (user?.email) {
      api.get(`/api/logs?email=${user.email}`)
        .then(res => setLog(res.data))
        .catch(err => console.error(err));
    }
  }, [user]);

  // NEW: Fetch consumption highlights (stats)
  useEffect(() => {
    if (user?.email) {
      api.get(`/api/logs/stats?email=${user.email}`)
        .then(res => setStats(res.data))
        .catch(err => console.error("Stats fetch error:", err));
    }
  }, [user, log]); // Refetch stats whenever logs are updated

  // Save custom goal whenever it changes
  useEffect(() => {
    localStorage.setItem('dailyGoal', goal);
  }, [goal]);

  const total = log.reduce((s, i) => s + (Number(i.calories) || 0), 0);
  const percentage = Math.min((total / goal) * 100, 100);
  const radius = 85;
  const strokeDasharray = 2 * Math.PI * radius;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  const handleLogin = (data) => {
    localStorage.setItem('userData', JSON.stringify(data));
    setUser(data);
  };

  const handleSearch = async (query) => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/search?foodName=${query}`);
      setResults(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Log a food found by barcode
  const handleBarcodeLog = ({ description, calories }) => {
    api.post('/api/logs', { userEmail: user.email, description, calories })
      .then(res => setLog(prev => [res.data, ...prev]));
    setShowScanner(false);
  };

  if (!user) {
    if (showAuthForm) return <Auth onLogin={handleLogin} onBack={() => setShowAuthForm(false)} />;
    return <LandingPage onGetStarted={() => setShowAuthForm(true)} />;
  }

  return (
    <div className="dashboard-root">
      <header className="top-nav">
        <div className="nav-left">
          <div className="nav-logo" onClick={() => setActiveTab('dashboard')}>NutriTrack</div>
          <nav className="nav-links">
            <button className={`nav-link-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
            <button className={`nav-link-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Insights</button>
            <button className={`nav-link-btn ${activeTab === 'health' ? 'active' : ''}`} onClick={() => setActiveTab('health')}>Health</button>
            <button className={`nav-link-btn ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>About</button>
          </nav>
        </div>
        <div className="user-section">
          <span className="user-name">Hello, {user.name}</span>
          <button className="profile-btn" onClick={() => setShowProfile(true)}>Profile</button>
          <button className="logout-btn" onClick={() => { localStorage.removeItem('userData'); setUser(null); }}>Logout</button>
        </div>
      </header>

      {activeTab === 'dashboard' && (
        <div className="app-wrapper">
          <aside className="sidebar-sticky left-sidebar">
            <div className="summary-card">
              <div className="meter-container">
                <svg width="200" height="200">
                  <circle stroke="#f1f5f9" strokeWidth="14" fill="transparent" r={radius} cx="100" cy="100" />
                  <circle
                    stroke={total > goal ? '#ef4444' : '#10b981'}
                    strokeWidth="14"
                    strokeDasharray={strokeDasharray}
                    style={{ strokeDashoffset, transition: '0.6s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                    fill="transparent" r={radius} cx="100" cy="100"
                  />
                </svg>
                <div className="total-display">
                  <h2>{total}</h2>
                  <span>/ {goal} kcal</span>
                </div>
              </div>

              <div className="goal-setting-area">
                <label>Set Daily Goal</label>
                <div className="goal-input-wrapper">
                  <input
                    type="number"
                    value={goal}
                    onChange={(e) => setGoal(Number(e.target.value))}
                    placeholder="2000"
                  />
                  <span>kcal</span>
                </div>
              </div>

              {total > goal && <div className="overdose-warning">⚠️ LIMIT EXCEEDED</div>}
            </div>
          </aside>

          <main className="main-content">
            <div className="search-row">
              <SearchBar onSearch={handleSearch} />
              <button className="barcode-trigger-btn" onClick={() => setShowScanner(true)} title="Scan food barcode">
                📷 Scan Barcode
              </button>
            </div>
            {loading ? <div className="loader-container"><div className="spinner"></div></div> : <FoodResult results={results} onAdd={(f, c) => {
              api.post('/api/logs', { userEmail: user.email, description: f.description, calories: c })
                .then(res => setLog([res.data, ...log]));
            }} />}
          </main>

          <aside className="sidebar-sticky right-sidebar">
            <HistoryLog log={log} onDelete={(id) => api.delete(`/api/logs/${id}`).then(() => setLog(log.filter(l => l._id !== id)))} />
          </aside>
        </div>
      )}

      {activeTab === 'stats' && (
        <InsightsPage stats={stats} />
      )}

      {activeTab === 'health' && (
        <BMICalculator user={user} onSuggestSearch={(food) => {
          setActiveTab('dashboard');
          handleSearch(food);
        }} />
      )}

      {activeTab === 'about' && (
        <div className="about-page-container">
          <div className="about-card">
            <div className="about-header">
              <h1>About NutriTrack</h1>
              <p>A premium health platform developed by <strong>Ansh Gupta</strong>, a B.Tech Computer Science student at KCCITM.</p>
            </div>
            <div className="about-grid">
              <div className="about-section">
                <h3>🚀 Our Mission</h3>
                <p>NutriTrack aims to simplify health management by providing real-time nutritional insights and personalized tracking to help users reach their fitness goals.</p>
              </div>
              <div className="about-section">
                <h3>💻 Technical Stack</h3>
                <div className="tech-tags">
                  <span>React.js</span>
                  <span>Node.js</span>
                  <span>MongoDB</span>
                  <span>Express</span>
                  <span>Nutrition API</span>
                </div>
              </div>
            </div>
            <div className="features-showcase">
              <div className="feature-box">
                <div className="feature-icon">📊</div>
                <h4>Smart Tracker</h4>
                <p>Visual calorie ring with dynamic color-coding based on your limits.</p>
              </div>
              <div className="feature-box">
                <div className="feature-icon">🥗</div>
                <h4>USDA Verified</h4>
                <p>Reliable data sourced from global nutritional databases.</p>
              </div>
              <div className="feature-box">
                <div className="feature-icon">🔒</div>
                <h4>Secure History</h4>
                <p>Your logs are saved securely and can be managed instantly.</p>
              </div>
            </div>
            <div className="about-footer">
              <p>Interested in my work? Let's connect!</p>
              <div className="social-links">
                <a href="#" className="social-btn linkedin">LinkedIn</a>
                <a href="#" className="social-btn github">GitHub</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent floating NutriBot chatbot */}
      <NutriBot />

      {/* Barcode scanner modal */}
      {showScanner && (
        <BarcodeScanner onClose={() => setShowScanner(false)} onLog={handleBarcodeLog} />
      )}

      {/* User Profile modal */}
      {showProfile && (
        <UserProfile
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => {
            setUser(updatedUser);
            localStorage.setItem('userData', JSON.stringify(updatedUser));
            if (updatedUser.goal) {
              setGoal(updatedUser.goal);
              localStorage.setItem('dailyGoal', updatedUser.goal);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;