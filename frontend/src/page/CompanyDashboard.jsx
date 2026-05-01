// frontend/src/pages/CompanyDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, X, FileText, CheckCircle, XCircle, Clock,
  Briefcase, MapPin, Users, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import CompanySidebar from '../components/CompanySidebar';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';

const API = 'http://localhost:8000/api';
const BACKEND = 'http://localhost:8000';

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
        <p className="text-white/90">{notification.message}</p>
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
          <button className="sd-notif-clear" onClick={onMarkAllRead}>Tout marquer comme lu</button>
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
            <NotificationItem key={notif.id} notification={notif} onMarkRead={onMarkRead} onNavigate={onNavigate} />
          ))
        )}
      </div>
      {notifications.length > 0 && (
        <div className="sd-notif-footer"><button onClick={onClose}>Fermer</button></div>
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

/* ========== OFFER DETAIL MODAL ========== */
const OfferDetailModal = ({ offer, onClose }) => {
  if (!offer) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-lg p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition"><X size={20} /></button>
        {imgUrl(offer.image_url) && (
          <div className="h-80 w-full overflow-hidden rounded-lg mb-4">
            <img src={imgUrl(offer.image_url)} alt={offer.title} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-xl font-bold text-white mb-1">{offer.title}</h2>
        <p className="text-slate-500 text-sm mb-5">{offer.company_name}</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[['Type', offer.internship_type], ['Wilaya', offer.wilaya], ['Duration', offer.duration], ['Start', offer.start_date], ['Status', offer.is_active ? 'Active' : 'Inactive'], ['Created', offer.created_at]].map(([label, value]) => (
            <div key={label} className="bg-slate-800 rounded-lg p-3">
              <span className="block text-xs text-slate-500 mb-1">{label}</span>
              <span className="text-sm text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
        <div className="mb-5">
          <p className="text-xs text-slate-500 mb-2">Description</p>
          <p className="text-sm text-slate-300 leading-relaxed">{offer.description}</p>
        </div>
        {offer.required_skills?.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-2">Required Skills</p>
            <div className="flex flex-wrap gap-2">
              {offer.required_skills.map(s => <span key={s} className="bg-indigo-900/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full">{s}</span>)}
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
      <div className="text-center py-10">
        <Briefcase size={40} className="mx-auto mb-3 opacity-30 text-white/30" />
        <p className="text-white/50">No offers yet.</p>
      </div>
    );
  }

  const visibleOffers = offers.slice(currentIndex, currentIndex + visibleCount);
  const slideClass = animating
    ? direction === 'right' ? 'translate-x-[-30px] opacity-0' : 'translate-x-[30px] opacity-0'
    : 'translate-x-0 opacity-100';

  return (
    <div className="relative">
      <style>{`
        .carousel-track { transition: transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease; }
        .offer-card { transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; }
        .offer-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(139,92,246,0.25); }
        .offer-card img { transition: transform 0.4s ease; }
        .offer-card:hover img { transform: scale(1.05); }
      `}</style>
      <div className="flex items-center">
        <button
          onClick={() => slide('left')}
          disabled={currentIndex === 0 || animating}
          className="p-2 text-white/50 hover:text-white disabled:opacity-30 transition-all duration-200 hover:scale-110 mr-2 flex-shrink-0"
        >
          <ChevronLeft size={28} />
        </button>

        <div className={`flex-1 grid grid-cols-3 gap-4 carousel-track ${slideClass}`}>
          {visibleOffers.map((offer) => (
            <div
              key={offer.id}
              className="offer-card bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden hover:border-purple-500/50 cursor-pointer flex flex-col"
              onClick={() => onOfferClick(offer)}
            >
              <div className="h-64 w-full overflow-hidden">
                {imgUrl(offer.image_url) ? (
                  <img
                    src={imgUrl(offer.image_url)}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className="w-full h-full bg-gradient-to-br from-purple-900/40 to-indigo-900/40 items-center justify-center"
                  style={{ display: imgUrl(offer.image_url) ? 'none' : 'flex' }}
                >
                  <Briefcase size={48} className="text-white/20" />
                </div>
              </div>
              <div className="p-4 pt-3 flex-1 flex flex-col justify-between">
                <h3 className="text-white font-semibold text-sm mb-2 line-clamp-1">{offer.title}</h3>
                <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                  <MapPin size={12} />
                  <span>{offer.wilaya}</span>
                </div>
                {offer.applicants_count !== undefined && (
                  <div className="flex items-center gap-2 text-white/50 text-xs mt-auto">
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
          className="p-2 text-white/50 hover:text-white disabled:opacity-30 transition-all duration-200 hover:scale-110 ml-2 flex-shrink-0"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {offers.length > visibleCount && (
        <div className="flex justify-center gap-2 mt-5">
          {Array.from({ length: maxStart + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => { if (!animating) { setDirection(i > currentIndex ? 'right' : 'left'); setAnimating(true); setTimeout(() => { setCurrentIndex(i); setAnimating(false); setDirection(null); }, 350); } }}
              className={`rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 h-2 bg-purple-400' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ========== MAIN COMPONENT ========== */
const CompanyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [activeSection, setActiveSection] = useState('home');
  const homeRef = useRef(null);
  const internshipsRef = useRef(null);

  const [companyProfile, setCompanyProfile] = useState(null);
  const [topOffers, setTopOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const fetchCompanyProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/company/profile/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setCompanyProfile(data.profile);
    } catch (err) {
      console.error("Erreur chargement profil entreprise:", err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/company/notifications/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    }
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
      setTopOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API}/company/notifications/${id}/read/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) { console.error("Erreur:", err); }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${API}/company/notifications/read-all/`, {
        method: 'POST',
        headers: authHeaders()
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (err) { console.error("Erreur:", err); }
  };

  const navigateToApplication = (applicationId) => {
    navigate(`/company/applications?app=${applicationId}`);
    setNotifOpen(false);
  };

  useEffect(() => {
    fetchNotifications();
    fetchCompanyProfile();
    fetchTopOffers();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchCompanyProfile, fetchTopOffers]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          setActiveSection(e.target.dataset.section);
          setSectionVisible(prev => ({ ...prev, [e.target.dataset.section]: true }));
        }
      }),
      { threshold: 0.15, rootMargin: '-50px 0px -50px 0px' }
    );
    const home = homeRef.current, internships = internshipsRef.current;
    if (home) observer.observe(home);
    if (internships) observer.observe(internships);
    return () => { if (home) observer.unobserve(home); if (internships) observer.unobserve(internships); };
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

  const [sectionVisible, setSectionVisible] = useState({ home: true, internships: false });

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
        .section-animated {
          opacity: 0;
          transform: translateY(40px);
        }
        .section-animated.is-visible {
          animation: sectionFadeUp 0.65s cubic-bezier(0.4,0,0.2,1) forwards;
        }
      `}</style>
      {sidebarOpen && <CompanySidebar user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />}

      <ChatWidget companyMode={true} />

      <nav className="sd-navbar" style={{ borderBottom: 'none' }}>
        <div className="sd-navbar-left">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(true)}><span /><span /><span /></button>
          <a className="sd-logo" href="/">UnivStage</a>
        </div>
        <ul className="sd-nav-links">
          <li><a href="#home" className={activeSection === 'home' ? 'active' : ''} onClick={e => { e.preventDefault(); scrollTo('home', homeRef); }}>Home</a></li>
          <li><a href="#internships" className={activeSection === 'internships' ? 'active' : ''} onClick={e => { e.preventDefault(); scrollTo('internships', internshipsRef); }}>Top Internships</a></li>
        </ul>
        <div className="sd-navbar-right">
          <div className="sd-notif-wrapper" ref={notifRef}>
            <button className="sd-icon-btn relative" onClick={() => setNotifOpen(!notifOpen)}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="sd-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {notifOpen && <NotificationsDropdown notifications={notifications} onClose={() => setNotifOpen(false)} onMarkRead={markNotificationRead} onMarkAllRead={markAllNotificationsRead} onNavigate={navigateToApplication} />}
          </div>
          <button className="sd-icon-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg></button>
        </div>
      </nav>

      <main className="sd-main">
        {/* HOME SECTION – matches Home.jsx hero */}
        <section className={`sd-hero section-animated ${sectionVisible.home ? 'is-visible' : ''}`} id="home" ref={homeRef} data-section="home" style={{ minHeight: 'auto', padding: '60px 5% 40px' }}>
          <div className="sd-hero-container">
            <div className="sd-hero-content">
              <h1 style={{
                fontSize: 'clamp(3rem, 6vw, 5rem)',
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
                  {user?.username || "User"}
                </span>
              </h1>
              <p style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                color: '#ffffff',
                margin: '0.5rem 0 1rem'
              }}>
                from {companyProfile?.name || user?.company_name || ''}
              </p>
              <p style={{
                fontSize: '0.92rem',
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
              minHeight: '500px',
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

        {/* TOP INTERNSHIPS SECTION unchanged */}
        <section className={`sd-section section-animated ${sectionVisible.internships ? 'is-visible' : ''}`} id="internships" ref={internshipsRef} data-section="internships" style={{ paddingBottom: '50px' }}>
          <div className="text-center mb-8">
            <h2 className="sd-section-title">
              <span className="t-pink">Top </span><span className="t-purple">Internships</span>
            </h2>
            <p className="sd-section-subtitle">The three top Internships in our Company</p>
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
          <div className="footer-brand"><div className="footer-brand-logo">🎓 UnivStage</div><p>Connecting students with professional opportunities and empowering the next generation of innovators.</p></div>
          <div className="footer-contact"><h4>Contact Us</h4><ul><li><MapPinIcon />123 University Ave, Campus Center, CA 94000</li><li><PhoneIcon />+1 (555) 123-4567</li><li><MailIcon />internships@university.edu</li></ul></div>
        </div>
        <div className="footer-bottom"><p>© 2026 UnivStage. All rights reserved.</p><div className="footer-socials"><a href="#!">f</a><a href="#!">𝕏</a><a href="#!">in</a><a href="#!">◎</a></div><div className="footer-bottom-links"><a href="#!">Privacy Policy</a><span>|</span><a href="#!">Terms of Service</a></div></div>
      </footer>
    </div>
  );
};

export default CompanyDashboard;