import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, Flame, Calendar, Trophy } from 'lucide-react';

const TABS = ['Daily', 'Weekly', 'Monthly'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="chart-tooltip-label">{label}</p>
                <p className="chart-tooltip-value">{payload[0].value.toLocaleString()} kcal</p>
            </div>
        );
    }
    return null;
};

const StatBadge = ({ icon: Icon, label, value, sub, color }) => (
    <div className="stat-badge" style={{ '--badge-color': color }}>
        <div className="stat-badge-icon" style={{ background: color + '22', color }}>
            <Icon size={20} />
        </div>
        <div className="stat-badge-info">
            <span className="stat-badge-label">{label}</span>
            <span className="stat-badge-value">{value.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>kcal</span></span>
            {sub && <span className="stat-badge-sub">{sub}</span>}
        </div>
    </div>
);

const InsightsPage = ({ stats }) => {
    const [activeChartTab, setActiveChartTab] = useState('Daily');

    const chartData = {
        Daily: stats.dailyData || [],
        Weekly: stats.weeklyData || [],
        Monthly: stats.monthlyData || [],
    };

    const data = chartData[activeChartTab];
    const maxCal = data.length > 0 ? Math.max(...data.map(d => d.calories)) : 0;

    return (
        <div className="insights-page">
            {/* Summary Stats Row */}
            <div className="insights-stats-row">
                <StatBadge icon={Trophy} label="Peak Day" value={stats.peakIntake?.calories || 0} sub={stats.peakIntake?.date || '—'} color="#f59e0b" />
                <StatBadge icon={Calendar} label="This Week" value={stats.weekTotal || 0} color="#6366f1" />
                <StatBadge icon={TrendingUp} label="This Month" value={stats.monthTotal || 0} color="#10b981" />
                <StatBadge icon={Flame} label="This Year" value={stats.yearTotal || 0} color="#ef4444" />
            </div>

            {/* Chart Card */}
            <div className="insights-chart-card">
                <div className="insights-chart-header">
                    <h2 className="insights-chart-title">Calorie Intake</h2>
                    <div className="chart-tab-group">
                        {TABS.map(t => (
                            <button
                                key={t}
                                className={`chart-tab-btn ${activeChartTab === t ? 'active' : ''}`}
                                onClick={() => setActiveChartTab(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {maxCal === 0 ? (
                    <div className="chart-empty">
                        <Flame size={40} color="#e2e8f0" />
                        <p>No data yet for this period. Start logging food!</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={50} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                            <Bar dataKey="calories" fill="url(#barGrad)" radius={[8, 8, 0, 0]} maxBarSize={60}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={entry.calories === maxCal ? '#10b981' : 'url(#barGrad)'}
                                        opacity={entry.calories === maxCal ? 1 : 0.75}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}

                <p className="chart-footer-note">
                    {activeChartTab === 'Daily' && 'Calories logged each day for the last 7 days'}
                    {activeChartTab === 'Weekly' && 'Total calories per week for the last 4 weeks'}
                    {activeChartTab === 'Monthly' && 'Total calories per month for the last 6 months'}
                </p>
            </div>
        </div>
    );
};

export default InsightsPage;
