// frontend/src/components/UniversityUsersStatus.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Circle, UserCheck, Clock, RefreshCw, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'https://pfe-l31r.onrender.com/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const UserAvatar = ({ name, isOnline }) => (
  <div className="relative">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
      isOnline ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'
    }`}>
      {name}
    </div>
    {isOnline && (
      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
    )}
  </div>
);

const StatusBadge = ({ isOnline }) => (
  <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
    <Circle size={8} className={isOnline ? 'text-green-400 fill-green-400' : 'text-gray-400 fill-gray-400'} />
    {isOnline ? 'Online' : 'Offline'}
  </span>
);

const UniversityUsersStatus = ({ onStartPrivateChat }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ online_count: 0, total_count: 0, university: '' });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/university-users-status/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setStats({
          online_count: data.online_count,
          total_count: data.total_count,
          university: data.university
        });
      } else {
        toast.error(data.error || 'Error loading users');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  if (loading) {
    return (
      <div className="users-status-loading">
        <div className="users-status-spinner"></div>
      </div>
    );
  }

  const currentUserId = localStorage.getItem('user_id');

  return (
    <div className="users-status-container">
      <button
        onClick={() => setExpanded(!expanded)}
        className="users-status-header"
      >
        <div className="users-status-header-left">
          <div className="users-status-icon">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div className="users-status-header-text">
            <h3 className="users-status-title">University Team</h3>
            <p className="users-status-subtitle">
              {stats.online_count} online / {stats.total_count} members
            </p>
          </div>
        </div>
        <div className="users-status-header-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchUsers();
            }}
            className="users-status-refresh"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <span className="users-status-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="users-status-content">
          <div className="users-status-university">
            <p className="users-status-university-text">
              🏛️ {stats.university}
            </p>
          </div>
          
          {users.length === 0 ? (
            <div className="users-status-empty">
              <Users className="users-status-empty-icon" />
              <p>No members found</p>
            </div>
          ) : (
            <div className="users-status-list">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                return (
                  <div key={user.id} className="users-status-item">
                    <div className="users-status-user">
                      <UserAvatar name={user.avatar} isOnline={user.is_online} />
                      <div className="users-status-user-info">
                        <p className="users-status-user-name">{user.full_name || user.username}</p>
                        <p className="users-status-user-email">{user.email}</p>
                        <p className="users-status-user-role">
                          {user.sub_role === 'admin' ? 'Department Head' : 'Co Department Head'}
                          {isCurrentUser && <span className="users-status-current-user">(You)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="users-status-actions">
                      <StatusBadge isOnline={user.is_online} />
                      {!isCurrentUser && onStartPrivateChat && (
                        <button
                          onClick={() => onStartPrivateChat(user)}
                          className="users-status-chat-btn"
                          title={`Send private message to ${user.full_name || user.username}`}
                        >
                          <MessageCircle size={14} />
                          <span className="users-status-chat-text">Message</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="users-status-footer">
            <p className="users-status-footer-text">
              <Clock size={12} />
              Auto-refresh every 30 seconds
            </p>
          </div>
        </div>
      )}

      <style>{`
        /* ===== UNIVERSITY USERS STATUS STYLES ===== */
        
        /* Loading state */
        .users-status-loading {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .users-status-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 0;
        }
        .users-status-spinner::after {
          content: '';
          width: 24px;
          height: 24px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-top-color: #a855f7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Main container */
        .users-status-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
        }
        
        /* Header */
        .users-status-header {
          width: 100%;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .users-status-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .users-status-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .users-status-icon {
          width: 40px;
          height: 40px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .users-status-header-text {
          text-align: left;
        }
        .users-status-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .users-status-subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }
        .users-status-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .users-status-refresh {
          padding: 8px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: color 0.2s;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .users-status-refresh:hover {
          color: white;
        }
        .users-status-chevron {
          color: rgba(255, 255, 255, 0.4);
        }
        
        /* Content */
        .users-status-content {
          padding: 20px;
          padding-top: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* University info */
        .users-status-university {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .users-status-university-text {
          color: #c084fc;
          font-size: 0.875rem;
          margin: 0;
        }
        
        /* Empty state */
        .users-status-empty {
          text-align: center;
          padding: 32px 0;
          color: rgba(255, 255, 255, 0.4);
        }
        .users-status-empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 8px;
          opacity: 0.3;
        }
        .users-status-empty p {
          margin: 0;
        }
        
        /* User list */
        .users-status-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .users-status-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 8px;
          transition: background 0.2s;
          flex-wrap: wrap;
          gap: 12px;
        }
        .users-status-item:hover {
          background: rgba(30, 41, 59, 0.6);
        }
        .users-status-user {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        .users-status-user-info {
          min-width: 0;
        }
        .users-status-user-name {
          color: white;
          font-weight: 500;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .users-status-user-email {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.75rem;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .users-status-user-role {
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.7rem;
          margin-top: 2px;
        }
        .users-status-current-user {
          color: #c084fc;
          margin-left: 8px;
        }
        
        /* Status badge */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .status-badge.online {
          background: rgba(34, 197, 94, 0.2);
          color: #86efac;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .status-badge.offline {
          background: rgba(107, 114, 128, 0.2);
          color: #d1d5db;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }
        
        /* Actions */
        .users-status-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .users-status-chat-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(139, 92, 246, 0.2);
          border: none;
          border-radius: 8px;
          color: #c084fc;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 0.7rem;
        }
        .users-status-chat-btn:hover {
          background: rgba(139, 92, 246, 0.3);
        }
        .users-status-chat-text {
          display: inline;
        }
        
        /* Footer */
        .users-status-footer {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
        }
        .users-status-footer-text {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.7rem;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 640px) {
          .users-status-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .users-status-actions {
            width: 100%;
            justify-content: flex-end;
          }
          .users-status-chat-text {
            display: none;
          }
          .users-status-chat-btn {
            padding: 6px;
          }
          .users-status-user-name {
            font-size: 0.875rem;
          }
          .users-status-user-email {
            font-size: 0.7rem;
          }
        }
        
        @media (max-width: 480px) {
          .users-status-header {
            padding: 16px;
          }
          .users-status-title {
            font-size: 1rem;
          }
          .users-status-subtitle {
            font-size: 0.75rem;
          }
          .users-status-content {
            padding: 16px;
            padding-top: 0;
          }
          .users-status-icon {
            width: 36px;
            height: 36px;
          }
          .users-status-icon svg {
            width: 18px;
            height: 18px;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .users-status-container {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(141, 35, 212, 0.25);
        }
        body.light-mode .users-status-title {
          color: #1a1a2e;
        }
        body.light-mode .users-status-subtitle {
          color: #666;
        }
        body.light-mode .users-status-header:hover {
          background: rgba(141, 35, 212, 0.05);
        }
        body.light-mode .users-status-university-text {
          color: #8D23D4;
        }
        body.light-mode .users-status-item {
          background: rgba(0, 0, 0, 0.03);
        }
        body.light-mode .users-status-item:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        body.light-mode .users-status-user-name {
          color: #1a1a2e;
        }
        body.light-mode .users-status-user-email {
          color: #999;
        }
        body.light-mode .users-status-user-role {
          color: #aaa;
        }
        body.light-mode .users-status-current-user {
          color: #8D23D4;
        }
        body.light-mode .status-badge.online {
          background: rgba(5, 150, 105, 0.1);
          color: #059669;
          border-color: rgba(5, 150, 105, 0.3);
        }
        body.light-mode .status-badge.offline {
          background: rgba(0, 0, 0, 0.05);
          color: #666;
          border-color: rgba(0, 0, 0, 0.1);
        }
        body.light-mode .users-status-footer-text {
          color: #999;
        }
        body.light-mode .users-status-icon {
          background: rgba(141, 35, 212, 0.1);
        }
        body.light-mode .users-status-refresh {
          color: #666;
        }
        body.light-mode .users-status-refresh:hover {
          color: #8D23D4;
        }
        body.light-mode .users-status-chevron {
          color: #999;
        }
        body.light-mode .users-status-empty {
          color: #999;
        }
        body.light-mode .users-status-empty-icon {
          color: #ccc;
        }
      `}</style>
    </div>
  );
};

export default UniversityUsersStatus;