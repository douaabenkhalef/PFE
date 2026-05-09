// frontend/src/pages/CompanyManagerDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, Bell, CheckCheck, X, FileText,
  Briefcase, MapPin, Users, ChevronLeft, ChevronRight, Moon, Sun
} from 'lucide-react';
import toast from 'react-hot-toast';
import CompanySidebar from '../components/CompanySidebar';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';

const API = 'https://pfe-l31r.onrender.com/api';
const BACKEND = 'https://pfe-l31r.onrender.com';

const imgUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND}${url}`;
};

const token = () => localStorage.getItem('access_token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token()}`,
});

/* ========== NOTIFICATION ICONS ========== */
const NOTIFICATION_ICONS = {
  'application_accepted': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  'application_rejected': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  'convention_validated': { icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10' },
  'convention_rejected': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  'pending_validation': { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'default': { icon: Bell, color: 'text-purple-400', bg: 'bg-purple-500/10' }
};

/* ========== NOTIFICATION ITEM ========== */
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
        <p className="notification-message">{notification.message}</p>
        <span className="sd-notif-time">{notification.created_at}</span>
      </div>
      {!notification.is_read && <div className="sd-notif-unread-dot" />}
      {isHovered && !notification.is_read && (
        <button
          className="sd-notif-mark-read"
          onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
        >
          <CheckCheck size={14} />
        </button>
      )}
    </div>
  );
};

/* ========== NOTIFICATIONS DROPDOWN ========== */
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
          <button className="sd-notif-clear" onClick={onMarkAllRead}>Mark all as read</button>
        )}
      </div>
      <div className="sd-notif-list">
        {notifications.length === 0 ? (
          <div className="sd-notif-empty">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p>No notifications</p>
            <span className="text-xs">Notifications will appear here</span>
          </div>
        ) : (
          notifications.slice(0, 15).map(notif => (
            <NotificationItem key={notif.id} notification={notif} onMarkRead={onMarkRead} onNavigate={onNavigate} />
          ))
        )}
      </div>
      {notifications.length > 0 && (
        <div className="sd-notif-footer"><button onClick={onClose}>Close</button></div>
      )}
    </div>
  );
};

/* ========== FOOTER ICONS ========== */
const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15z" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

// Moon and Sun icons for theme toggle
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

/* ========== OFFER DETAIL MODAL ========== */
const OfferDetailModal = ({ offer, onClose }) => {
  if (!offer) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="offer-modal" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="offer-modal-close"><X size={20} /></button>
        {imgUrl(offer.image_url) && (
          <div className="offer-modal-img">
            <img src={imgUrl(offer.image_url)} alt={offer.title} />
          </div>
        )}
        <h2 className="offer-modal-title">{offer.title}</h2>
        <p className="offer-modal-company">{offer.company_name}</p>
        <div className="offer-modal-grid">
          {[['Type', offer.internship_type], ['Wilaya', offer.wilaya], ['Duration', offer.duration], ['Start', offer.start_date], ['Status', offer.is_active ? 'Active' : 'Inactive'], ['Created', offer.created_at]].map(([label, value]) => (
            <div key={label} className="offer-modal-info">
              <span className="offer-modal-label">{label}</span>
              <span className="offer-modal-value">{value}</span>
            </div>
          ))}
        </div>
        <div className="offer-modal-desc">
          <p className="offer-modal-label">Description</p>
          <p className="offer-modal-text">{offer.description}</p>
        </div>
        {offer.required_skills?.length > 0 && (
          <div className="offer-modal-skills">
            <p className="offer-modal-label">Required Skills</p>
            <div className="offer-modal-skills-list">
              {offer.required_skills.map(s => <span key={s} className="offer-modal-skill">{s}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ========== TOP OFFERS CAROUSEL ========== */
const TopOffersCarousel = ({ offers, onOfferClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(null);
  const visibleCount = 3;
  const maxStart = Math.max(0, offers.length - visibleCount);

  const slide = (dir) => {
    if (animating) return;
    const next = dir === 'right'
      ? Math.min(maxStart, currentIndex + 1)
      : Math.max(0, currentIndex - 1);
    if (next === currentIndex) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex(next);
      setAnimating(false);
      setDirection(null);
    }, 350);
  };

  if (offers.length === 0) {
    return (
      <div className="carousel-empty">
        <Briefcase size={40} className="carousel-empty-icon" />
        <p className="carousel-empty-text">No offers yet.</p>
      </div>
    );
  }

  const visibleOffers = offers.slice(currentIndex, currentIndex + visibleCount);
  const slideClass = animating
    ? direction === 'right' ? 'carousel-track-slide-right' : 'carousel-track-slide-left'
    : 'carousel-track-visible';

  return (
    <div className="carousel-wrapper">
      <div className="carousel-container">
        <button
          onClick={() => slide('left')}
          disabled={currentIndex === 0 || animating}
          className="carousel-nav-btn carousel-nav-left"
        >
          <ChevronLeft size={28} />
        </button>

        <div className={`carousel-track ${slideClass}`}>
          {visibleOffers.map((offer) => (
            <div
              key={offer.id}
              className="carousel-offer-card"
              onClick={() => onOfferClick(offer)}
            >
              <div className="carousel-offer-img">
                {imgUrl(offer.image_url) ? (
                  <img
                    src={imgUrl(offer.image_url)}
                    alt={offer.title}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className="carousel-offer-placeholder"
                  style={{ display: imgUrl(offer.image_url) ? 'none' : 'flex' }}
                >
                  <Briefcase size={48} />
                </div>
              </div>
              <div className="carousel-offer-content">
                <h3 className="carousel-offer-title">{offer.title}</h3>
                <div className="carousel-offer-location">
                  <MapPin size={12} />
                  <span>{offer.wilaya}</span>
                </div>
                {offer.applicants_count !== undefined && (
                  <div className="carousel-offer-applicants">
                    <Users size={12} />
                    <span>{offer.applicants_count ?? 0} applicants</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => slide('right')}
          disabled={currentIndex >= maxStart || animating}
          className="carousel-nav-btn carousel-nav-right"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {offers.length > visibleCount && (
        <div className="carousel-dots">
          {Array.from({ length: maxStart + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => { if (!animating) { setDirection(i > currentIndex ? 'right' : 'left'); setAnimating(true); setTimeout(() => { setCurrentIndex(i); setAnimating(false); setDirection(null); }, 350); } }}
              className={`carousel-dot ${i === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ========== MAIN COMPONENT ========== */
const CompanyManagerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topOffers, setTopOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [activeSection, setActiveSection] = useState('home');
  const [sectionVisible, setSectionVisible] = useState({ home: true, internships: false });
  const homeRef = useRef(null);
  const internshipsRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [companyProfile, setCompanyProfile] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Load theme from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'false') {
      setIsDarkMode(false);
      document.body.classList.add('light-mode');
    } else {
      setIsDarkMode(true);
      document.body.classList.remove('light-mode');
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('darkMode', 'false');
      setIsDarkMode(false);
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('darkMode', 'true');
      setIsDarkMode(true);
    }
  };

  const fetchCompanyProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/company/profile/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setCompanyProfile(data.profile);
    } catch (err) { console.error("Error loading company profile:", err); }
  }, []);

  const fetchTopOffers = useCallback(async () => {
    setLoadingOffers(true);
    try {
      const res = await fetch(`${API}/company/offers/top/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setTopOffers(data.offers || []);
      } else {
        setTopOffers([]);
      }
    } catch (err) {
      console.error("Failed to fetch top offers:", err);
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/company/notifications/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (err) { console.error("Error loading notifications:", err); }
  }, []);

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API}/company/notifications/${id}/read/`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) { console.error("Error:", err); }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${API}/company/notifications/read-all/`, { method: 'POST', headers: authHeaders() });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (err) { console.error("Error:", err); }
  };

  const navigateToApplication = (applicationId) => {
    navigate(`/company/applications?app=${applicationId}`);
    setNotifOpen(false);
  };

  useEffect(() => {
    fetchNotifications();
    fetchTopOffers();
    fetchCompanyProfile();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchCompanyProfile, fetchTopOffers]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          setActiveSection(e.target.dataset.section);
          setSectionVisible(prev => ({ ...prev, [e.target.dataset.section]: true }));
        }
      }),
      { threshold: 0.15 }
    );
    if (homeRef.current) obs.observe(homeRef.current);
    if (internshipsRef.current) obs.observe(internshipsRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handleVis = () => { if (document.visibilityState === 'visible') fetchCompanyProfile(); };
    const handleCustom = () => fetchCompanyProfile();
    window.addEventListener('visibilitychange', handleVis);
    window.addEventListener('companyProfileUpdated', handleCustom);
    return () => {
      window.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('companyProfileUpdated', handleCustom);
    };
  }, [fetchCompanyProfile]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const scrollTo = (id, ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
    setSectionVisible(prev => ({ ...prev, [id]: true }));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen">
      <style>{`
        @keyframes sectionFadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .section-animated { opacity: 0; transform: translateY(40px); }
        .section-animated.is-visible { animation: sectionFadeUp 0.65s cubic-bezier(0.4,0,0.2,1) forwards; }

        /* ===== CAROUSEL STYLES - 3 cards on all screens ===== */
        .carousel-wrapper { width: 100%; }
        .carousel-container { display: flex; align-items: center; gap: 1rem; }
        .carousel-track { 
          flex: 1; 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 1.5rem; 
          transition: transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease;
        }
        .carousel-track-slide-right { transform: translateX(-30px); opacity: 0; }
        .carousel-track-slide-left { transform: translateX(30px); opacity: 0; }
        .carousel-track-visible { transform: translateX(0); opacity: 1; }
        
        .carousel-nav-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255,255,255,0.7);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .carousel-nav-btn:hover:not(:disabled) {
          background: rgba(139,92,246,0.3);
          border-color: rgba(139,92,246,0.6);
          color: white;
          transform: scale(1.05);
        }
        .carousel-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .carousel-offer-card {
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .carousel-offer-card:hover {
          transform: translateY(-6px);
          border-color: rgba(139,92,246,0.6);
          box-shadow: 0 20px 40px rgba(139,92,246,0.2);
        }
        .carousel-offer-img {
          height: 200px;
          width: 100%;
          overflow: hidden;
          position: relative;
        }
        .carousel-offer-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .carousel-offer-card:hover .carousel-offer-img img { transform: scale(1.05); }
        .carousel-offer-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.3);
        }
        .carousel-offer-content { padding: 1rem; }
        .carousel-offer-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .carousel-offer-location {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.6);
          margin-bottom: 0.5rem;
        }
        .carousel-offer-applicants {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.5);
        }
        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }
        .carousel-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .carousel-dot.active {
          width: 24px;
          border-radius: 4px;
          background: linear-gradient(90deg, #F75AFA, #8D23D4);
        }
        .carousel-empty {
          text-align: center;
          padding: 3rem;
        }
        .carousel-empty-icon {
          margin: 0 auto 1rem;
          opacity: 0.3;
          color: white;
        }
        .carousel-empty-text { color: rgba(255,255,255,0.5); }

        /* ===== MODAL STYLES ===== */
        .offer-modal {
          background: #1e293b;
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 24px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 1.5rem;
          position: relative;
        }
        .offer-modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255,255,255,0.6);
          transition: all 0.2s;
        }
        .offer-modal-close:hover { background: rgba(239,68,68,0.3); color: #f87171; }
        .offer-modal-img {
          height: 200px;
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
          margin-bottom: 1rem;
        }
        .offer-modal-img img { width: 100%; height: 100%; object-fit: cover; }
        .offer-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.25rem;
        }
        .offer-modal-company {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 1rem;
        }
        .offer-modal-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .offer-modal-info {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 0.75rem;
        }
        .offer-modal-label {
          display: block;
          font-size: 0.65rem;
          color: #9ca3af;
          margin-bottom: 0.25rem;
        }
        .offer-modal-value {
          font-size: 0.85rem;
          color: white;
          font-weight: 500;
        }
        .offer-modal-desc { margin-bottom: 1rem; }
        .offer-modal-text {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
          line-height: 1.5;
        }
        .offer-modal-skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .offer-modal-skill {
          background: rgba(139,92,246,0.2);
          color: #a78bfa;
          font-size: 0.7rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
        }

        /* ===== LIGHT MODE OVERRIDES ===== */
        body.light-mode .carousel-nav-btn {
          background: rgba(0,0,0,0.05);
          border-color: rgba(0,0,0,0.1);
          color: #333;
        }
        body.light-mode .carousel-nav-btn:hover:not(:disabled) {
          background: rgba(139,92,246,0.15);
          border-color: rgba(139,92,246,0.4);
          color: #8D23D4;
        }
        body.light-mode .carousel-offer-card {
          background: white;
          border-color: rgba(0,0,0,0.1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        body.light-mode .carousel-offer-card:hover {
          box-shadow: 0 20px 40px rgba(139,92,246,0.15);
          border-color: rgba(139,92,246,0.4);
        }
        body.light-mode .carousel-offer-title { color: #1a1a2e; }
        body.light-mode .carousel-offer-location { color: #555; }
        body.light-mode .carousel-offer-applicants { color: #777; }
        body.light-mode .carousel-dot { background: rgba(0,0,0,0.2); }
        body.light-mode .carousel-empty-icon { color: #666; }
        body.light-mode .carousel-empty-text { color: #666; }
        
        body.light-mode .offer-modal {
          background: white;
          border-color: rgba(139,92,246,0.3);
        }
        body.light-mode .offer-modal-title { color: #1a1a2e; }
        body.light-mode .offer-modal-company { color: #666; }
        body.light-mode .offer-modal-info { background: rgba(0,0,0,0.03); }
        body.light-mode .offer-modal-value { color: #1a1a2e; }
        body.light-mode .offer-modal-text { color: #555; }
        body.light-mode .offer-modal-label { color: #888; }
        body.light-mode .offer-modal-skill {
          background: rgba(139,92,246,0.1);
          color: #8D23D4;
        }
        body.light-mode .offer-modal-close {
          background: rgba(0,0,0,0.05);
          color: #666;
        }
        body.light-mode .offer-modal-close:hover {
          background: rgba(239,68,68,0.1);
          color: #dc2626;
        }

        /* Light mode for notifications */
        body.light-mode .notification-message { color: #1a1a2e !important; }
        body.light-mode .sd-notif-time { color: #999 !important; }
        body.light-mode .sd-notif-header span { color: #1a1a2e !important; }
        body.light-mode .sd-notif-empty p { color: #666 !important; }
        body.light-mode .sd-notif-empty span { color: #999 !important; }
        body.light-mode .sd-notif-dropdown { background: white !important; border-color: rgba(0,0,0,0.1) !important; }
        body.light-mode .sd-notif-header { border-bottom-color: rgba(0,0,0,0.08) !important; }
        body.light-mode .sd-notif-item { border-bottom-color: rgba(0,0,0,0.05) !important; }
        body.light-mode .sd-notif-item:hover { background: rgba(139,92,246,0.05) !important; }

        /* Light mode for hero section */
        body.light-mode .sd-hero-content h1 { color: #1a1a2e !important; }
        body.light-mode .sd-hero-content p { color: #555 !important; }

        /* ===== RESPONSIVE - Keep 3 cards but smaller on mobile ===== */
        @media (max-width: 900px) {
          .carousel-track { gap: 1rem; }
          .carousel-offer-img { height: 160px; }
          .carousel-offer-title { font-size: 0.8rem; }
        }
        
        @media (max-width: 768px) {
          .carousel-container { gap: 0.5rem; }
          .carousel-nav-btn { width: 32px; height: 32px; }
          .carousel-nav-btn svg { width: 20px; height: 20px; }
          .carousel-offer-img { height: 140px; }
          .carousel-offer-title { font-size: 0.75rem; white-space: normal; line-height: 1.3; }
          .carousel-offer-location { font-size: 0.65rem; }
          .carousel-offer-applicants { font-size: 0.65rem; }
          .offer-modal-grid { grid-template-columns: 1fr; }
        }
        
        @media (max-width: 640px) {
          .carousel-track { gap: 0.75rem; }
          .carousel-offer-img { height: 120px; }
          .carousel-offer-content { padding: 0.75rem; }
          .carousel-offer-title { font-size: 0.7rem; }
        }
        
        @media (max-width: 480px) {
          .carousel-track { gap: 0.5rem; }
          .carousel-offer-img { height: 100px; }
          .carousel-offer-content { padding: 0.5rem; }
          .carousel-offer-title { font-size: 0.65rem; }
          .carousel-offer-location { font-size: 0.6rem; }
          .carousel-offer-applicants { font-size: 0.6rem; }
        }
      `}</style>
      {sidebarOpen && <CompanySidebar user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />}

      <ChatWidget companyMode={true} />

      <nav className="sd-navbar" style={{ borderBottom: 'none' }}>
        <div className="sd-navbar-left">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(true)}><span /><span /><span /></button>
          <div className="sd-logo-container" style={{ cursor: 'default' }}>
            <img src="/images/logo.png" alt="UnivStage Logo" className="sd-logo-img" />
            <span className="sd-site-name">UnivStage</span>
          </div>
        </div>
        <ul className="sd-nav-links">
          <li><a href="#home" className={`sd-nav-link ${activeSection === 'home' ? 'active' : ''}`} onClick={e => { e.preventDefault(); scrollTo('home', homeRef); }}>Home</a></li>
          <li><a href="#internships" className={`sd-nav-link ${activeSection === 'internships' ? 'active' : ''}`} onClick={e => { e.preventDefault(); scrollTo('internships', internshipsRef); }}>Top Internships</a></li>
        </ul>
        <div className="sd-navbar-right">
          <div className="sd-notif-wrapper" ref={notifRef}>
            <button className="sd-icon-btn relative" onClick={() => setNotifOpen(!notifOpen)}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="sd-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {notifOpen && <NotificationsDropdown notifications={notifications} onClose={() => setNotifOpen(false)} onMarkRead={markNotificationRead} onMarkAllRead={markAllNotificationsRead} onNavigate={navigateToApplication} />}
          </div>
          <button className="sd-icon-btn" onClick={toggleTheme}>
            {isDarkMode ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </nav>

      <main className="sd-main">
        {/* HOME SECTION */}
        <section className={`sd-hero section-animated ${sectionVisible.home ? 'is-visible' : ''}`} id="home" ref={homeRef} data-section="home" style={{ minHeight: 'auto', padding: '60px 5% 40px' }}>
          <div className="sd-hero-container">
            <div className="sd-hero-content">
              <h1 style={{
                fontSize: 'clamp(2rem, 6vw, 5rem)',
                fontWeight: 800,
                lineHeight: 1.08,
                color: '#fff',
                letterSpacing: '-1px'
              }}>
                Welcome<br />
                <span style={{
                  background: 'linear-gradient(90deg, #F75AFA, #8D23D4 ,#1F36A9 )',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {user?.username || "Manager"}
                </span>
              </h1>
              <p style={{
                fontSize: 'clamp(1rem, 4vw, 1.2rem)',
                fontWeight: 600,
                color: '#ffffff',
                margin: '0.5rem 0 1rem'
              }}>
                from {companyProfile?.name || user?.company_name || ''}
              </p>
              <p style={{
                fontSize: 'clamp(0.8rem, 3vw, 0.92rem)',
                color: 'rgba(255,255,255,0.62)',
                lineHeight: 1.75,
                maxWidth: '420px',
                margin: '1.4rem 0 2.2rem'
              }}>
                Your centralized platform for managing internship programs. Our portal empowers both operational
                and strategic users with intuitive tools to post opportunities, review candidates.
              </p>
            </div>
            <div className="sd-hero-image" style={{
              flex: '1.1',
              maxWidth: '550px',
              minHeight: '300px',
              border: 'none',
              borderRadius: '20px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {companyProfile?.cover_picture ? (
                <img
                  src={companyProfile.cover_picture}
                  alt="Company cover"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '24px' }}
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '60px', height: '60px', opacity: 0.4, stroke: '#F75AFA' }}>
                  <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </div>
          </div>
        </section>

        {/* TOP INTERNSHIPS SECTION */}
        <section className={`sd-section section-animated ${sectionVisible.internships ? 'is-visible' : ''}`} id="internships" ref={internshipsRef} data-section="internships" style={{ paddingBottom: '50px' }}>
          <div className="text-center mb-8">
            <h2 className="sd-section-title">
              <span className="t-pink">Top </span><span className="t-purple">Internships</span>
            </h2>
            <p className="sd-section-subtitle">Your most recent internship offers</p>
          </div>

          {loadingOffers ? (
            <div className="sd-loading"><div className="sd-spinner" /><p>Loading top offers…</p></div>
          ) : (
            <>
              <TopOffersCarousel offers={topOffers} onOfferClick={setSelectedOffer} />
              <div className="flex justify-center mt-8">
                <button
                  className="btn-learn-more"
                  onClick={() => navigate('/company/manage-offers')}
                >
                  LEARN MORE
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {selectedOffer && <OfferDetailModal offer={selectedOffer} onClose={() => setSelectedOffer(null)} />}

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand"><div className="footer-brand-logo"> UnivStage</div><p>Connecting students with professional opportunities and empowering the next generation of innovators.</p><p>By:</p><p>Nouha Labdi</p><p>Safa Oughidni</p><p>Douaa Benkhalef</p></div>
          <div className="footer-contact"><h4>Contact Us</h4><ul><li><MapPinIcon /> University constantine2, Algeria</li><li><PhoneIcon />+213 (0) 798864489</li><li><PhoneIcon />+213 (0) 799003478</li><li><PhoneIcon />+213 (0) 557217736</li><li><MailIcon />stageuniversity18@gmail.com</li></ul></div>
        </div>
        <div className="footer-bottom"><p>© 2026 UnivStage. All rights reserved.</p><div className="footer-socials"><a href="https://www.facebook.com/univstage" target="_blank" rel="noopener noreferrer">f</a><a href="https://www.instagram.com/univstage" target="_blank" rel="noopener noreferrer">𝕏</a><a href="https://www.linkedin.com/company/univstage" target="_blank" rel="noopener noreferrer">in</a></div><div className="footer-bottom-links"><a href="/privacy-policy">Privacy Policy</a><span>|</span><a href="/terms-of-service">Terms of Service</a><span>|</span><a href="/faq">FAQ</a></div></div>
      </footer>
    </div>
  );
};

export default CompanyManagerDashboard;