import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, CheckCheck, X, FileText, CheckCircle, XCircle, Clock, Briefcase, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanySidebar from '../components/CompanySidebar';
import './StudentDashboard.css';

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

// Static data for Top Internships (matching the picture)
const staticTopOffers = [
  {
    id: 1,
    title: "Cyber Security Internship",
    internship_type: "Security",
    wilaya: "Algiers",
    applicants_count: 50,
  },
  {
    id: 2,
    title: "Web Dev Internship",
    internship_type: "Development",
    wilaya: "Oran",
    applicants_count: 50,
  },
  {
    id: 3,
    title: "Artificial Intelligence Internship",
    internship_type: "AI/ML",
    wilaya: "Constantine",
    applicants_count: 50,
  },
];

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

  // Intersection observer to update active section (underline)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.dataset.section);
          }
        });
      },
      { threshold: 0.4, rootMargin: '-50px 0px -50px 0px' }
    );

    const homeElement = homeRef.current;
    const internshipsElement = internshipsRef.current;
    if (homeElement) observer.observe(homeElement);
    if (internshipsElement) observer.observe(internshipsElement);

    return () => {
      if (homeElement) observer.unobserve(homeElement);
      if (internshipsElement) observer.unobserve(internshipsElement);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const scrollTo = (id, ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen">
      {sidebarOpen && <CompanySidebar user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />}

      <nav className="sd-navbar" style={{ borderBottom: 'none' }}>
        <div className="sd-navbar-left">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(true)}>
            <span /><span /><span />
          </button>
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
              {unreadCount > 0 && (
                <span className="sd-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
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
          <button className="sd-icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </nav>

      <main className="sd-main">
        <section className="sd-hero is-visible" id="home" ref={homeRef} data-section="home" style={{ minHeight: 'auto', padding: '60px 5% 40px' }}>
          <div className="sd-hero-container">
            <div className="sd-hero-content">
              <h1>
                Welcome<br />
                <span className="name-gradient">
                  {user?.full_name?.split(" ")[0] || user?.company_name || "User"}
                </span>
              </h1>
              <p>from {user?.company_name}</p>
              <p style={{ marginTop: '1rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                your centralized platform for managing internship programs. Our portal empowers both operational 
                and strategic users with intuitive tools to post opportunities, review candidates.
              </p>
            </div>
            <div className="sd-hero-image">
              <img src="/images/company-hero.png" alt="Company dashboard" onError={e => e.target.style.display = 'none'} />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          </div>
        </section>

        <section className="sd-section" id="internships" ref={internshipsRef} data-section="internships">
          <div className="sd-section-header">
            <div>
              <h2 className="sd-section-title"><span className="t-pink">Top </span><span className="t-purple">Internships</span></h2>
              <p className="sd-section-subtitle">The three top Internships in our Company</p>
            </div>
            <Link to="/company/manage-offers" className="sd-see-all-btn">See All →</Link>
          </div>

          <div className="sd-internships-grid">
            {staticTopOffers.map(offer => (
              <div key={offer.id} className="sd-internship-card">
                <div className="sd-intern-img">
                  <Briefcase size={40} className="text-white/30" />
                  <div className="sd-intern-top-badges">
                    <span className="sd-badge-type">{offer.internship_type}</span>
                  </div>
                </div>
                <div className="sd-intern-info">
                  <div className="sd-intern-title">{offer.title}</div>
                  <div className="sd-intern-meta-row">
                    <div className="sd-intern-applicants"><Users size={12} /> {offer.applicants_count}+ Students</div>
                  </div>
                  <div className="sd-intern-rep">
                    <div className="sd-intern-rep-avatar">📍</div>
                    <span className="sd-intern-rep-name">{offer.wilaya}</span>
                  </div>
                  <div className="sd-intern-footer">
                    <Link to="/company/manage-offers" className="sd-enroll-btn">Manage</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-logo">🎓 UnivStage</div>
            <p>
              Connecting students with professional opportunities and
              empowering the next generation of innovators.
            </p>
          </div>
          <div className="footer-contact">
            <h4>Contact Us</h4>
            <ul>
              <li><MapPinIcon />123 University Ave, Campus Center, CA 94000</li>
              <li><PhoneIcon />+1 (555) 123-4567</li>
              <li><MailIcon />internships@university.edu</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 UnivStage. All rights reserved.</p>
          <div className="footer-socials">
            <a href="#!" aria-label="Facebook">f</a>
            <a href="#!" aria-label="Twitter">𝕏</a>
            <a href="#!" aria-label="LinkedIn">in</a>
            <a href="#!" aria-label="Instagram">◎</a>
          </div>
          <div className="footer-bottom-links">
            <a href="#!">Privacy Policy</a>
            <span>|</span>
            <a href="#!">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CompanyDashboard;