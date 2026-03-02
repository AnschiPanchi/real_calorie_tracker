import React from 'react';
import { Activity, Target, Zap, Shield, ChevronRight } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onGetStarted }) => {
    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <div className="landing-logo">NutriTrack</div>
                <div className="landing-nav-actions">
                    <button className="btn secondary" onClick={onGetStarted}>Log In</button>
                    <button className="btn primary" onClick={onGetStarted}>Sign Up</button>
                </div>
            </nav>

            <main className="landing-main">
                <div className="hero-section">
                    <div className="hero-badge">✨ Build your dream physique</div>
                    <h1 className="hero-title">
                        Take Control of Your <br />
                        <span className="text-gradient">Health & Nutrition</span>
                    </h1>
                    <p className="hero-subtitle">
                        AI-powered meal tracking, barcode scanning, and personalised insights to help you reach your goals faster than ever.
                    </p>
                    <div className="hero-cta">
                        <button className="btn primary massive" onClick={onGetStarted}>
                            Start Tracking For Free <ChevronRight />
                        </button>
                    </div>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon"><Activity size={24} /></div>
                        <h3>Smart Tracking</h3>
                        <p>Log your meals instantly. We calculate the calories, macros, and nutrients for you.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><Zap size={24} /></div>
                        <h3>AI Recognition</h3>
                        <p>Can't find a food? Just take a picture and let our Gemini AI identify it in seconds.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><Target size={24} /></div>
                        <h3>Personalised Insights</h3>
                        <p>Get a custom Body Mass Index analysis and tailored diet targets to guarantee results.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon"><Shield size={24} /></div>
                        <h3>Data Privacy</h3>
                        <p>Your health data is securely encrypted. Download and export your logs at any time.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
