import React, { useState, useEffect } from 'react';
import { Trash2, Clock, Calendar } from 'lucide-react';

const HistoryLog = ({ log, onDelete }) => {
  const [now, setNow] = useState(new Date());

  // Tick every second to keep the countdown live
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Date / Countdown helpers ---
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = dayNames[now.getDay()];
  const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  // Time until midnight
  const midnightToday = new Date(now);
  midnightToday.setHours(24, 0, 0, 0);
  const secsLeft = Math.floor((midnightToday - now) / 1000);
  const hh = String(Math.floor(secsLeft / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secsLeft % 3600) / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');

  return (
    <div className="history-container">
      {/* Date & Reset Timer Header */}
      <div className="day-tracker">
        <div className="day-tracker-date">
          <Calendar size={16} />
          <span><strong>{dayName}</strong>, {dateStr}</span>
        </div>
        <div className="day-tracker-reset">
          <Clock size={13} />
          <span>Resets in <strong>{hh}:{mm}:{ss}</strong></span>
        </div>
      </div>

      <div className="history-header">
        <Clock size={20} color="#10b981" />
        <h3>Today's Log</h3>
      </div>

      {log.length === 0 ? (
        <div className="empty-state">
          <p>No food logged yet.</p>
        </div>
      ) : (
        <div className="log-list">
          {log.map((item) => (
            <div key={item._id} className="log-item">
              <div className="log-info">
                <span className="log-name">{item.description}</span>
                <span className="log-calories">{item.calories} kcal</span>
              </div>
              <button
                className="delete-log-btn"
                onClick={() => onDelete(item._id)}
                title="Delete entry"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryLog;