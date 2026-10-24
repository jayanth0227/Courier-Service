import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Plus, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const TopBar = ({ onNewBooking }) => {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setTimeStr(now.toLocaleString('en-IN', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="portal-topbar no-print">
      <div className="topbar-left">
        <div className="branch-indicator">
          <MapPin size={14} color="#2563eb" />
          <span>{user?.branch || 'Main Booking Counter'}</span>
        </div>
        <div className="live-clock">
          <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
          {timeStr}
        </div>
      </div>

      <div className="topbar-right">
        <button className="btn btn-primary btn-sm" onClick={onNewBooking}>
          <Plus size={15} />
          <span>New Booking</span>
        </button>
      </div>
    </header>
  );
};
