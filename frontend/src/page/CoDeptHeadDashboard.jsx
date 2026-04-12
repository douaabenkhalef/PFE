// frontend/src/page/CoDeptHeadDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, Clock, BookOpen, Users, FileCheck, 
  Clock as ClockIcon, FileText, Bell, CheckCheck, X,
  CheckCircle, XCircle, Activity, UserCheck, Shield,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import UniversityUsersStatus from '../components/UniversityUsersStatus';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
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

// Composant d'avertissement pour les permissions manquantes
const PermissionWarning = ({ permissions, userRole }) => {
  if (!permissions) return null;
  
  const missingPermissions = [];
  if (permissions.can_manage_conventions === false) missingPermissions.push("valider/refuser des conventions");
  if (permissions.can_add_signature === false) missingPermissions.push("signer des conventions");
  if (permissions.can_add_stamp === false) missingPermissions.push("ajouter le cachet");
  if (permissions.can_manage_university_profile === false && userRole === 'co_dept_head') missingPermissions.push("modifier le profil de l'université");
  
  if (missingPermissions.length === 0) return null;
  
  return (
    <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-orange-300 font-medium">Permissions limitées</p>
          <p className="text-orange-300/80 text-sm">
            Vous n'avez pas la permission de : {missingPermissions.join(", ")}.
          </p>
          <p className="text-orange-300/60 text-xs mt-1">
            💡 Contactez votre Department Head pour demander ces permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

const CoDeptHeadDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ students: 0, validations: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState(null);
  const notifRef = useRef(null);
  
  // État pour le chat privé
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchNotifications();
    fetchUserPermissions();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserPermissions = async () => {
    try {
      const res = await fetch(`${API}/auth/me/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.permissions) {
        setUserPermissions(data.permissions);
      }
    } catch (err) {
      console.error("Erreur chargement permissions:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/co-dept/pending-validations/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setStats({
          students: data.count || 0,
          validations: data.applications?.filter(a => a.status === 'validated_by_co_dept').length || 0,
          pending: data.applications?.filter(a => a.status === 'accepted_by_company').length || 0
        });
      }
    } catch (err) {
      console.error("Erreur chargement stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/student/notifications/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${API}/student/notifications/${notificationId}/read/`, {
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
      await fetch(`${API}/student/notifications/read-all/`, {
        method: 'POST',
        headers: authHeaders()
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const navigateToValidation = (applicationId) => {
    navigate(`/co-dept-head/validations?app=${applicationId}`);
    setNotifOpen(false);
  };

  const handleStartPrivateChat = (targetUser) => {
    setSelectedChatUser(targetUser);
    setPrivateChatOpen(true);
  };

  const handleClosePrivateChat = () => {
    setPrivateChatOpen(false);
    setSelectedChatUser(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isApproved = user?.status !== false;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Styles pour les notifications
  const styles = `
    .sd-notif-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: -80px;
      width: 360px;
      max-width: calc(100vw - 20px);
      background: linear-gradient(145deg, #1a0840, #0e0c27);
      border: 1px solid rgba(141,35,212,0.40);
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.60);
      z-index: 2000;
      overflow: hidden;
    }
    .sd-notif-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      font-size: 0.88rem;
      font-weight: 600;
      color: #fff;
    }
    .sd-notif-unread-badge {
      background: linear-gradient(135deg, #F75AFA, #8E2FFB);
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 700;
      color: white;
    }
    .sd-notif-clear {
      background: transparent;
      border: none;
      color: rgba(247,90,250,0.80);
      font-size: 0.72rem;
      cursor: pointer;
      font-family: 'Poppins', sans-serif;
      transition: color 0.2s;
    }
    .sd-notif-clear:hover {
      color: #F75AFA;
    }
    .sd-notif-list {
      max-height: 400px;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .sd-notif-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.2s;
      position: relative;
    }
    .sd-notif-item:hover {
      background: rgba(255,255,255,0.04);
    }
    .sd-notif-item.unread {
      background: rgba(141,35,212,0.08);
    }
    .sd-notif-icon {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sd-notif-body {
      flex: 1;
      min-width: 0;
    }
    .sd-notif-body p {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.88);
      line-height: 1.45;
      margin-bottom: 4px;
      word-break: break-word;
    }
    .sd-notif-time {
      font-size: 0.65rem;
      color: rgba(255,255,255,0.35);
      display: block;
    }
    .sd-notif-unread-dot {
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background: #F75AFA;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(247,90,250,0.6);
    }
    .sd-notif-mark-read {
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 6px;
      padding: 4px;
      cursor: pointer;
      color: rgba(255,255,255,0.6);
      transition: all 0.2s;
    }
    .sd-notif-mark-read:hover {
      background: rgba(247,90,250,0.2);
      color: #F75AFA;
    }
    .sd-notif-empty {
      text-align: center;
      padding: 32px 20px;
    }
    .sd-notif-empty p {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.4);
      margin-bottom: 4px;
    }
    .sd-notif-footer {
      padding: 10px 18px;
      border-top: 1px solid rgba(255,255,255,0.08);
      text-align: center;
    }
    .sd-notif-footer button {
      background: transparent;
      border: none;
      color: rgba(247,90,250,0.75);
      font-size: 0.78rem;
      cursor: pointer;
      font-family: 'Poppins', sans-serif;
      transition: color 0.2s;
    }
    .sd-notif-footer button:hover {
      color: #F75AFA;
    }
    .sd-badge-count {
      position: absolute;
      top: -4px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #F75AFA, #8E2FFB);
      border-radius: 50px;
      font-size: 0.6rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      pointer-events: none;
    }
    .sd-notif-wrapper {
      position: relative;
    }
  `;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <style>{styles}</style>
      
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Co Department Head Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/co-dept-head/validations"
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-2 ${
                  userPermissions?.can_manage_conventions === false
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-orange-600 hover:bg-orange-500 text-white'
                }`}
                onClick={(e) => {
                  if (userPermissions?.can_manage_conventions === false) {
                    e.preventDefault();
                    toast.error("Vous n'avez pas la permission de gérer les conventions. Contactez le Department Head.");
                  }
                }}
              >
                <FileText size={16} />
                Conventions à valider
                {stats.pending > 0 && (
                  <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full">{stats.pending}</span>
                )}
              </Link>

              <Link
                to="/admin/manage-students"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-2"
              >
                <Users size={16} />
                Gérer Étudiants
              </Link>

              <div className="sd-notif-wrapper" ref={notifRef}>
                <button
                  className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                  onClick={() => setNotifOpen(!notifOpen)}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-white" />
                  {unreadCount > 0 && (
                    <span className="sd-badge-count">
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
                    onNavigate={navigateToValidation}
                  />
                )}
              </div>

              <span className="text-white/80">{user?.full_name || user?.username}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">
                {user?.university || "En attente"}
              </span>
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
        {!isApproved ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
            <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Compte en attente d'approbation</h3>
            <p className="text-white/60">
              Votre compte est en attente d'approbation par le Department Head.<br />
              Vous recevrez un email une fois votre compte activé.
            </p>
            <div className="mt-6 p-4 bg-white/5 rounded-lg inline-block">
              <p className="text-white/80">
                Université: <span className="text-purple-400">{user?.university || "En attente"}</span>
              </p>
            </div>
          </div>
        ) : (
          <>
            <PermissionWarning permissions={userPermissions} userRole={user?.sub_role} />
            
            <div className="mb-8">
              <UniversityUsersStatus onStartPrivateChat={handleStartPrivateChat} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Étudiants</p>
                    <p className="text-3xl font-bold text-white">{stats.students}</p>
                    <p className="text-white/60 text-sm mt-2">Étudiants inscrits</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Stages validés</p>
                    <p className="text-3xl font-bold text-white">{stats.validations}</p>
                    <p className="text-white/60 text-sm mt-2">Conventions signées</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">En attente</p>
                    <p className="text-3xl font-bold text-white">{stats.pending}</p>
                    <p className="text-white/60 text-sm mt-2">Stages à valider</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all col-span-full">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-6 h-6 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Informations université</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-sm">Nom de l'université</p>
                    <p className="text-white font-medium">{user?.university || "Non spécifié"}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Email</p>
                    <p className="text-white font-medium">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 col-span-full">
                <h3 className="text-lg font-semibold text-white mb-4">Actions rapides</h3>
                <div className="flex flex-wrap gap-4">
                  <Link
                    to="/co-dept-head/validations"
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      userPermissions?.can_manage_conventions === false
                        ? 'bg-gray-600/50 cursor-not-allowed opacity-50 text-gray-300'
                        : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300'
                    }`}
                    onClick={(e) => {
                      if (userPermissions?.can_manage_conventions === false) {
                        e.preventDefault();
                        toast.error("Vous n'avez pas la permission de valider des conventions.");
                      }
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Conventions à valider
                    {stats.pending > 0 && (
                      <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.pending}</span>
                    )}
                  </Link>
                  <Link
                    to="/admin/manage-students"
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Gérer les étudiants
                  </Link>
                  <button 
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      userPermissions?.can_add_signature === false
                        ? 'bg-gray-600/50 cursor-not-allowed opacity-50 text-gray-300'
                        : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                    }`}
                    onClick={() => {
                      if (userPermissions?.can_add_signature === false) {
                        toast.error("Vous n'avez pas la permission de signer des conventions.");
                      } else {
                        toast.info("Redirection vers la page des conventions signées");
                      }
                    }}
                  >
                    <FileCheck className="w-4 h-4" />
                    Stages validés
                  </button>
                  <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Générer rapports
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      
      {/* Chat de groupe */}
      {isApproved && (
        <ChatWidget university={user?.university || "Université"} />
      )}
      
      {/* Chat privé */}
      {privateChatOpen && selectedChatUser && (
        <PrivateChat
          university={user?.university || "Université"}
          currentUser={user}
          targetUser={selectedChatUser}
          onClose={handleClosePrivateChat}
        />
      )}
    </div>
  );
};

export default CoDeptHeadDashboard;