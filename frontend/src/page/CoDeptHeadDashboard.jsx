// frontend/src/page/CoDeptHeadDashboard.jsx
// Nav links: Home, Statistics, Team – active underline moves with scroll
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, Clock, BookOpen, Users, FileCheck, 
  FileText, Bell, CheckCheck, X,
  CheckCircle, XCircle, Activity, UserCheck, Shield,
  AlertTriangle, Search, TrendingUp, TrendingDown,
  PieChart, Award, Calendar, BarChart3, ChevronDown, ChevronUp, Lock, Image
} from 'lucide-react';
import toast from 'react-hot-toast';
import UniversityUsersStatus from '../components/UniversityUsersStatus';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';
import AdminSidebar from '../components/AdminSidebar';
import './StudentDashboard.css';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

// ==================== StatisticsPanel ====================
const StatisticsPanel = ({ stats, loading }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div></div>;
  if (!stats) return null;
  const { global, by_major, by_graduation_year, top_skills, timeline } = stats;
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
          <div className="flex items-center justify-between"><div><p className="text-white/60 text-sm">Total étudiants</p><p className="text-3xl font-bold text-white">{global?.total_students || 0}</p></div><Users className="w-10 h-10 text-blue-400 opacity-60" /></div>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-5 border border-green-500/30">
          <div className="flex items-center justify-between"><div><p className="text-white/60 text-sm">Stages trouvés</p><p className="text-3xl font-bold text-green-400">{global?.placed_students || 0}</p></div><TrendingUp className="w-10 h-10 text-green-400 opacity-60" /></div>
        </div>
        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-5 border border-yellow-500/30">
          <div className="flex items-center justify-between"><div><p className="text-white/60 text-sm">En recherche</p><p className="text-3xl font-bold text-yellow-400">{global?.unplaced_students || 0}</p></div><TrendingDown className="w-10 h-10 text-yellow-400 opacity-60" /></div>
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-5 border border-purple-500/30">
          <div className="flex items-center justify-between"><div><p className="text-white/60 text-sm">Taux de placement</p><p className="text-3xl font-bold text-purple-400">{global?.placement_rate || 0}%</p></div><PieChart className="w-10 h-10 text-purple-400 opacity-60" /></div>
        </div>
      </div>
      {by_major?.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <button onClick={() => setExpandedSection(expandedSection === 'major' ? null : 'major')} className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition">
            <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-purple-400" /><h3 className="text-lg font-semibold text-white">Par filière</h3></div>
            {expandedSection === 'major' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
          </button>
          {expandedSection === 'major' && <div className="p-5 pt-0 border-t border-white/10"><div className="space-y-3">{by_major.map(m => (<div key={m.name} className="bg-slate-800/60 rounded-lg p-4"><div className="flex justify-between items-center mb-2"><span className="text-white font-medium">{m.name}</span><span className="text-purple-400 text-sm">{m.placement_rate}%</span></div><div className="flex gap-4 text-sm"><span className="text-green-400">✅ {m.placed}</span><span className="text-yellow-400">⏳ {m.unplaced}</span><span className="text-slate-400">📊 {m.total}</span></div><div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{width:`${m.placement_rate}%`}}/></div></div>))}</div></div>}
        </div>
      )}
      {by_graduation_year?.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <button onClick={() => setExpandedSection(expandedSection === 'year' ? null : 'year')} className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition">
            <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-purple-400"/><h3 className="text-lg font-semibold text-white">Par promotion</h3></div>
            {expandedSection === 'year' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
          </button>
          {expandedSection === 'year' && <div className="p-5 pt-0 border-t border-white/10"><div className="space-y-3">{by_graduation_year.sort((a,b)=>b.year-a.year).map(y=>(<div key={y.year} className="bg-slate-800/60 rounded-lg p-4"><div className="flex justify-between items-center mb-2"><span className="text-white font-medium">Promotion {y.year}</span><span className="text-purple-400 text-sm">{y.placement_rate}%</span></div><div className="flex gap-4 text-sm"><span className="text-green-400">✅ {y.placed}</span><span className="text-yellow-400">⏳ {y.unplaced}</span><span className="text-slate-400">📊 {y.total}</span></div><div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{width:`${y.placement_rate}%`}}/></div></div>))}</div></div>}
        </div>
      )}
      {top_skills && (top_skills.placed?.length > 0 || top_skills.unplaced?.length > 0) && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <button onClick={() => setExpandedSection(expandedSection === 'skills' ? null : 'skills')} className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition">
            <div className="flex items-center gap-3"><Award className="w-5 h-5 text-purple-400"/><h3 className="text-lg font-semibold text-white">Top compétences</h3></div>
            {expandedSection === 'skills' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
          </button>
          {expandedSection === 'skills' && <div className="p-5 pt-0 border-t border-white/10"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2"><CheckCircle size={16}/>Placés</h4><div className="space-y-2">{top_skills.placed?.slice(0,8).map(s=><div key={s.skill} className="flex justify-between items-center bg-green-500/10 rounded-lg p-2"><span className="text-white text-sm">{s.skill}</span><span className="text-green-400 text-sm font-semibold">{s.count}</span></div>)}</div></div><div><h4 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2"><Clock size={16}/>En recherche</h4><div className="space-y-2">{top_skills.unplaced?.slice(0,8).map(s=><div key={s.skill} className="flex justify-between items-center bg-yellow-500/10 rounded-lg p-2"><span className="text-white text-sm">{s.skill}</span><span className="text-yellow-400 text-sm font-semibold">{s.count}</span></div>)}</div></div></div></div>}
        </div>
      )}
      {timeline?.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <button onClick={() => setExpandedSection(expandedSection === 'timeline' ? null : 'timeline')} className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition">
            <div className="flex items-center gap-3"><BarChart3 className="w-5 h-5 text-purple-400"/><h3 className="text-lg font-semibold text-white">Évolution des placements</h3></div>
            {expandedSection === 'timeline' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
          </button>
          {expandedSection === 'timeline' && <div className="p-5 pt-0 border-t border-white/10"><div className="space-y-3">{timeline.map(t=><div key={t.month} className="bg-slate-800/60 rounded-lg p-3"><div className="flex justify-between items-center mb-2"><span className="text-white text-sm">{t.month}</span><span className="text-green-400 text-sm font-semibold">{t.placed} placements</span></div><div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{width:`${Math.min(100,t.placed*5)}%`}}/></div></div>)}</div></div>}
        </div>
      )}
    </div>
  );
};

// Helper icons
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const MapPinIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const PhoneIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15z"/></svg>;
const MailIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;

// ==================== PermissionWarning ====================
const PermissionWarning = ({ permissions }) => {
  if (!permissions) return null;
  const missing = [];
  if (!permissions.can_manage_conventions) missing.push("valider/refuser des conventions");
  if (!permissions.can_add_signature) missing.push("signer des conventions");
  if (!permissions.can_add_stamp) missing.push("ajouter le cachet");
  if (!permissions.can_manage_university_profile) missing.push("modifier le profil université");
  if (missing.length === 0) return null;
  return (
    <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
        <div>
          <p className="text-orange-300 font-medium">Permissions limitées</p>
          <p className="text-orange-300/80 text-sm">Vous n'avez pas la permission de : {missing.join(", ")}.</p>
          <p className="text-orange-300/60 text-xs mt-1">💡 Contactez votre Department Head pour demander ces permissions.</p>
        </div>
      </div>
    </div>
  );
};

// ==================== Notification components ====================
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
    <div className={`sd-notif-item ${!notification.is_read ? 'unread' : ''}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={() => { if (!notification.is_read) onMarkRead(notification.id); if (notification.related_id) onNavigate(notification.related_id); }} style={{ cursor: notification.related_id ? 'pointer' : 'default' }}>
      <div className={`sd-notif-icon ${config.bg}`}><IconComponent size={14} className={config.color}/></div>
      <div className="sd-notif-body"><p className="text-white/90">{notification.message}</p><span className="sd-notif-time">{notification.created_at}</span></div>
      {!notification.is_read && <div className="sd-notif-unread-dot"/>}
      {isHovered && !notification.is_read && (<button className="sd-notif-mark-read" onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}><CheckCheck size={14}/></button>)}
    </div>
  );
};

const NotificationsDropdown = ({ notifications, onClose, onMarkRead, onMarkAllRead, onNavigate }) => {
  const unreadCount = notifications.filter(n => !n.is_read).length;
  return (
    <div className="sd-notif-dropdown">
      <div className="sd-notif-header">
        <div className="flex items-center gap-2"><Bell size={14} className="text-purple-400"/><span>Notifications</span>{unreadCount > 0 && <span className="sd-notif-unread-badge">{unreadCount}</span>}</div>
        {unreadCount > 0 && <button className="sd-notif-clear" onClick={onMarkAllRead}>Tout marquer comme lu</button>}
      </div>
      <div className="sd-notif-list">
        {notifications.length === 0 ? (<div className="sd-notif-empty"><Bell size={32} className="mx-auto mb-2 opacity-30"/><p>Aucune notification</p><span className="text-xs">Les notifications apparaîtront ici</span></div>) : notifications.slice(0,15).map(notif => <NotificationItem key={notif.id} notification={notif} onMarkRead={onMarkRead} onNavigate={onNavigate}/>)}
      </div>
      {notifications.length > 0 && <div className="sd-notif-footer"><button onClick={onClose}>Fermer</button></div>}
    </div>
  );
};

// ==================== CoDeptHeadDashboard ====================
const CoDeptHeadDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [placementStats, setPlacementStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState(null);
  const [universityProfile, setUniversityProfile] = useState(null);
  const notifRef = useRef(null);
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const homeRef = useRef(null);
  const statsRef = useRef(null);
  const studentsRef = useRef(null);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    fetchPlacementStats();
    fetchNotifications();
    fetchUserPermissions();
    fetchUniversityProfile();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.dataset.section); }),
      { threshold: 0.3, rootMargin: '-70px 0px -70px 0px' }
    );
    const els = [homeRef.current, statsRef.current, studentsRef.current].filter(Boolean);
    els.forEach(el => observer.observe(el));
    return () => els.forEach(el => observer.unobserve(el));
  }, []);

  const scrollTo = (id, ref) => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(id); };

  const fetchUserPermissions = async () => {
    try {
      const res = await fetch(`${API}/auth/me/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.permissions) setUserPermissions(data.permissions);
    } catch {}
  };

  const fetchPlacementStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API}/admin/placement-stats/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setPlacementStats(data.stats);
    } catch {}
    finally { setStatsLoading(false); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/student/notifications/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch {}
  };

  const fetchUniversityProfile = async () => {
    try {
      const res = await fetch(`${API}/admin/university-profile/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setUniversityProfile(data.profile);
    } catch {}
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API}/student/notifications/${id}/read/`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${API}/student/notifications/read-all/`, { method: 'POST', headers: authHeaders() });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch {}
  };

  const navigateToValidation = (applicationId) => { navigate(`/co-dept-head/validations?app=${applicationId}`); setNotifOpen(false); };
  const handleStartPrivateChat = (targetUser) => { setSelectedChatUser(targetUser); setPrivateChatOpen(true); };
  const handleClosePrivateChat = () => { setPrivateChatOpen(false); setSelectedChatUser(null); };
  const handleLogout = () => { logout(); navigate('/login'); };

  const isApproved = user?.status !== false;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const checkPermission = (permKey, actionName) => {
    if (!userPermissions) return true;
    if (userPermissions[permKey] === false) {
      toast.error(`Vous n'avez pas la permission de ${actionName}.`);
      return false;
    }
    return true;
  };

  if (statsLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div></div>;
  }

  return (
    <div className="min-h-screen">
      <nav className="sd-navbar" style={{ borderBottom: 'none' }}>
        <div className="sd-navbar-left">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(true)}><span/><span/><span/></button>
          <a className="sd-logo" href="/">UnivStage</a>
        </div>
        <ul className="sd-nav-links">
          <li>
            <a href="#home" className={activeSection === 'home' ? 'active' : ''} onClick={(e) => { e.preventDefault(); scrollTo('home', homeRef); }}>
              Home
            </a>
          </li>
          <li>
            <a href="#statistics" className={activeSection === 'stats' ? 'active' : ''} onClick={(e) => { e.preventDefault(); scrollTo('stats', statsRef); }}>
              Statistics
            </a>
          </li>
          <li>
            <a href="#students" className={activeSection === 'students' ? 'active' : ''} onClick={(e) => { e.preventDefault(); scrollTo('students', studentsRef); }}>
              Team
            </a>
          </li>
        </ul>
        <div className="sd-navbar-right">
          <div className="sd-notif-wrapper" ref={notifRef}>
            <button className="sd-icon-btn relative" onClick={() => setNotifOpen(!notifOpen)}>
              <Bell size={20}/>
              {unreadCount > 0 && <span className="sd-badge-count">{unreadCount}</span>}
            </button>
            {notifOpen && <NotificationsDropdown notifications={notifications} onClose={() => setNotifOpen(false)} onMarkRead={markNotificationRead} onMarkAllRead={markAllNotificationsRead} onNavigate={navigateToValidation}/>}
          </div>
          <button className="sd-icon-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
        </div>
      </nav>

      <main className="sd-main">
        {/* HOME SECTION */}
        <section ref={homeRef} data-section="home" className="sd-hero">
          <div className="sd-hero-container">
            <div className="sd-hero-content">
              <h1>Welcome<br/><span className="name-gradient">{user?.full_name?.split(" ")[0] || "CoDeptHead"}</span></h1>
              <p>from {user?.university || 'University'}</p>
              <p style={{ marginTop: '1rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                You may manage students internships by evaluating conventions requests with different companies and access all needed information.
              </p>
              <div className="sd-search-container">
                <div className="sd-search-bar">
                  <SearchIcon/><input type="text" placeholder="Search students..."/><button><SearchIcon/></button><button className="sd-filter-btn"><FilterIcon/></button>
                </div>
              </div>
            </div>
            <div className="sd-hero-image" style={{ flex: 1.1, maxWidth: '520px', minHeight: '400px' }}>
              {universityProfile?.cover_picture ? (
                <img 
                  src={universityProfile.cover_picture} 
                  alt="University cover" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image size={48} className="text-white/30" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* STATISTICS SECTION */}
        <section ref={statsRef} data-section="stats" style={{ minHeight: 'calc(100vh - 70px)', padding: '60px 5%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-3">Student Placement Statistics</h2>
            <p className="text-white/60 text-lg">Comprehensive overview of placements, majors, and trends</p>
          </div>
          <StatisticsPanel stats={placementStats} loading={statsLoading}/>
        </section>

        {/* TEAM SECTION */}
        <section ref={studentsRef} data-section="students" style={{ minHeight: 'calc(100vh - 70px)', padding: '60px 5%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-3">University Team</h2>
            <p className="text-white/60 text-lg">Connect and communicate with university staff members</p>
          </div>
          <div className="max-w-7xl mx-auto w-full">
            {!isApproved ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4"/>
                <h3 className="text-xl font-semibold text-white mb-2">Compte en attente d'approbation</h3>
                <p className="text-white/60">Votre compte est en attente d'approbation par le Department Head.<br/>Vous recevrez un email une fois votre compte activé.</p>
              </div>
            ) : (
              <>
                <PermissionWarning permissions={userPermissions} />
                <UniversityUsersStatus onStartPrivateChat={handleStartPrivateChat}/>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div
                    className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 border transition-all ${
                      userPermissions?.can_manage_conventions === false
                        ? 'border-red-500/30 opacity-60 cursor-not-allowed'
                        : 'border-white/20 hover:border-purple-500 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!checkPermission('can_manage_conventions', 'valider des conventions')) return;
                      navigate('/co-dept-head/validations');
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-purple-400"/>
                        <h3 className="text-white font-semibold">Conventions à valider</h3>
                      </div>
                      {userPermissions?.can_manage_conventions === false && <Lock size={16} className="text-red-400"/>}
                    </div>
                    <p className="text-3xl font-bold text-white">{placementStats?.global?.pending_validations || 0}</p>
                    <p className="text-white/60 text-sm mt-2">
                      {userPermissions?.can_manage_conventions === false
                        ? <span className="text-red-400 text-xs">Permission requise</span>
                        : 'En attente de validation'}
                    </p>
                  </div>

                  <Link to="/admin/manage-students" className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <Users className="w-6 h-6 text-blue-400"/>
                      <h3 className="text-white font-semibold">Gérer les étudiants</h3>
                    </div>
                    <p className="text-white/60 text-sm">Voir et modifier les profils étudiants</p>
                  </Link>

                  <div
                    className={`bg-white/10 backdrop-blur-lg rounded-xl p-6 border transition-all text-left ${
                      userPermissions?.can_add_signature === false
                        ? 'border-red-500/30 opacity-60 cursor-not-allowed'
                        : 'border-white/20 hover:border-purple-500 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!checkPermission('can_add_signature', 'signer des conventions')) return;
                      toast.info("Redirection vers la page des conventions signées");
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-6 h-6 text-green-400"/>
                        <h3 className="text-white font-semibold">Stages validés</h3>
                      </div>
                      {userPermissions?.can_add_signature === false && <Lock size={16} className="text-red-400"/>}
                    </div>
                    <p className="text-3xl font-bold text-white">{placementStats?.global?.placed_students || 0}</p>
                    <p className="text-sm mt-2">
                      {userPermissions?.can_add_signature === false
                        ? <span className="text-red-400 text-xs">Permission requise pour signer</span>
                        : <span className="text-white/60">Conventions signées</span>}
                    </p>
                  </div>
                </div>

                {userPermissions?.can_add_stamp === false && (
                  <div className="mt-4 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <Lock size={16} className="text-red-400"/>
                    <p className="text-red-300 text-sm">Vous n'avez pas la permission d'apposer le cachet officiel. Contactez votre Department Head.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-logo">🎓 UnivStage</div>
            <p>Connecting students with professional opportunities and empowering the next generation of innovators.</p>
          </div>
          <div className="footer-contact">
            <h4>Contact Us</h4>
            <ul>
              <li><MapPinIcon/>{universityProfile?.address || '123 University Ave, Campus Center'}</li>
              <li><PhoneIcon/>{universityProfile?.phone || '+1 (555) 123-4567'}</li>
              <li><MailIcon/>{universityProfile?.email || 'internships@university.edu'}</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 UnivStage. All rights reserved.</p>
          <div className="footer-socials"><a href="#!" aria-label="Facebook">f</a><a href="#!" aria-label="Twitter">𝕏</a><a href="#!" aria-label="LinkedIn">in</a><a href="#!" aria-label="Instagram">◎</a></div>
          <div className="footer-bottom-links"><a href="#!">Privacy Policy</a><span>|</span><a href="#!">Terms of Service</a></div>
        </div>
      </footer>

      {sidebarOpen && <AdminSidebar user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)}/>}
      {isApproved && <ChatWidget university={user?.university || "Université"}/>}
      {privateChatOpen && selectedChatUser && <PrivateChat university={user?.university || "Université"} currentUser={user} targetUser={selectedChatUser} onClose={handleClosePrivateChat}/>}
    </div>
  );
};

export default CoDeptHeadDashboard;