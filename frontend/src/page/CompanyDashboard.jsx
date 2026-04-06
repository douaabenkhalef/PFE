import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, Bell, CheckCheck, X, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:8000/api';

const token = () => localStorage.getItem('access_token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token()}`,
});


const NOTIFICATION_ICONS = {
  'application_accepted': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  'application_rejected': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  'convention_validated': { icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10' },
  'convention_rejected': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  'pending_validation': { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'default': { icon: Bell, color: 'text-purple-400', bg: 'bg-purple-500/10' }
};

const NotificationItem = ({ notification, onMarkRead, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  const config = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
  const IconComponent = config.icon;

  return (
    <div 
      className={`sd-notif-item ${!notification.is_read ? 'unread' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
        if (notification.related_id) onNavigate(notification.related_id);
      }}
      style={{ cursor: notification.related_id ? 'pointer' : 'default' }}
    >
      <div className={`sd-notif-icon ${config.bg}`}>
        <IconComponent size={14} className={config.color} />
      </div>
      <div className="sd-notif-body">
        <p className="text-white/90">{notification.message}</p>
        <span className="sd-notif-time">{notification.created_at}</span>
      </div>
      {!notification.is_read && <div className="sd-notif-unread-dot" />}
      {isHovered && !notification.is_read && (
        <button 
          className="sd-notif-mark-read"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
        >
          <CheckCheck size={14} />
        </button>
      )}
    </div>
  );
};

const NotificationsDropdown = ({ notifications, onClose, onMarkRead, onMarkAllRead, onNavigate }) => {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="sd-notif-dropdown">
      <div className="sd-notif-header">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-purple-400" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="sd-notif-unread-badge">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="sd-notif-clear" onClick={onMarkAllRead}>
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="sd-notif-list">
        {notifications.length === 0 ? (
          <div className="sd-notif-empty">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p>Aucune notification</p>
            <span className="text-xs">Les notifications apparaîtront ici</span>
          </div>
        ) : (
          notifications.slice(0, 15).map(notif => (
            <NotificationItem 
              key={notif.id}
              notification={notif}
              onMarkRead={onMarkRead}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="sd-notif-footer">
          <button onClick={onClose}>Fermer</button>
        </div>
      )}
    </div>
  );
};

const CompanyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/company/notifications/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    }
  }, []);

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${API}/company/notifications/${notificationId}/read/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` }
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${API}/company/notifications/read-all/`, {
        method: 'POST',
        headers: authHeaders()
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const navigateToApplication = (applicationId) => {
    navigate(`/company/applications?app=${applicationId}`);
    setNotifOpen(false);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Company Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/company/manage-offers"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-lg"
              >
                Manage Offers
              </Link>
              <Link
                to="/company/applications"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-lg"
              >
                Applications
              </Link>

             
              <div className="relative" ref={notifRef}>
                <button
                  className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                  onClick={() => setNotifOpen(!notifOpen)}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <NotificationsDropdown
                    notifications={notifications}
                    onClose={() => setNotifOpen(false)}
                    onMarkRead={markNotificationRead}
                    onMarkAllRead={markAllNotificationsRead}
                    onNavigate={navigateToApplication}
                  />
                )}
              </div>

              <span className="text-white/80">{user?.company_name}</span>
              <span className="text-white/50 text-sm">Hiring Manager</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome, {user?.company_name}</h2>
        <p className="text-white/60">Use the Manage Offers button to create and manage internship offers.</p>
      </main>
    </div>
  );
};

export default CompanyDashboard;