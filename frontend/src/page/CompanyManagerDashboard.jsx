import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Mail, User, Briefcase, Bell, CheckCheck, X, FileText } from "lucide-react";
import toast from "react-hot-toast";

const API = "http://localhost:8000/api";

const token = () => localStorage.getItem("access_token");
const authHeaders = () => ({
  "Content-Type": "application/json",
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

const CompanyManagerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingHiringManagers, setPendingHiringManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  
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
    fetchPendingHiringManagers();
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

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchPendingHiringManagers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/company/pending-hiring-managers/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) {
        setPendingHiringManagers(data.hiring_managers);
      } else {
        showMsg("error", "Failed to load pending hiring managers.");
      }
    } catch {
      showMsg("error", "Server connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (managerId, managerName) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/company/approve-hiring-manager/${managerId}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.success) {
        showMsg("success", `${managerName} has been approved.`);
        fetchPendingHiringManagers();
      } else {
        showMsg("error", data.message || "Approval failed.");
      }
    } catch {
      showMsg("error", "Server connection error.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (managerId, managerName) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/company/reject-hiring-manager/${managerId}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.success) {
        showMsg("success", `${managerName} has been rejected.`);
        fetchPendingHiringManagers();
      } else {
        showMsg("error", data.message || "Rejection failed.");
      }
    } catch {
      showMsg("error", "Server connection error.");
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Company Manager Dashboard</h1>
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
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border text-sm font-medium ${
              message.type === "success"
                ? "bg-green-500/15 border-green-500 text-green-300"
                : "bg-red-500/15 border-red-500 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Pending Hiring Managers</h2>
          <p className="text-white/60">Approve or reject Hiring Manager registration requests.</p>
        </div>

        {pendingHiringManagers.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No pending requests</h3>
            <p className="text-white/60">All hiring managers have been processed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingHiringManagers.map((manager) => (
              <div
                key={manager.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{manager.username}</h3>
                      <p className="text-white/60 text-sm">{manager.company_name}</p>
                    </div>
                  </div>
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
                  <Mail className="w-4 h-4" />
                  <span>{manager.email}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(manager.id, manager.username)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(manager.id, manager.username)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CompanyManagerDashboard;