// frontend/src/page/AdminDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Bell, Image, Search, X, ChevronDown, GraduationCap, MapPin, BookOpen, Mail, User, Briefcase, Calendar, CheckCircle, XCircle, Clock, FileText, AlertTriangle, CheckCheck
} from "lucide-react";
import ChatWidget from "../components/ChatWidget";
import PrivateChat from "../components/PrivateChat";
import AdminSidebar from "../components/AdminSidebar";
import toast from "react-hot-toast";
import "./StudentDashboard.css";

const API = "https://pfe-l31r.onrender.com/api";
const token = () => localStorage.getItem("access_token");
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token()}`,
});

// ─── Animated SVG Donut ─────────────────────────────────
const DonutChart = ({ percentage, color, trackColor, size = 140, stroke = 15 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPct(percentage), 200);
    return () => clearTimeout(t);
  }, [percentage]);

  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
};

const DonutCard = ({ title, percentage, count, label, color, trackColor, legendA, legendB, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTimeout(() => setVisible(true), delay); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className="donut-card"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.13)",
        backdropFilter: "blur(14px)",
        borderRadius: 16,
        padding: "18px 14px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
        transitionDelay: `${delay}ms`,
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {title}
      </span>

      <div style={{ position: "relative", alignSelf: "center" }}>
        <DonutChart percentage={visible ? percentage : 0} color={color} trackColor={trackColor} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{percentage}%</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>{count} {label}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignSelf: "center" }}>
        {[{ c: color, l: legendA }, { c: trackColor, l: legendB }].map(({ c, l }) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: c, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, accent, delay = 0 }) => {
  const [v, setV] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => setV(true), delay); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div ref={ref} style={{
      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
      backdropFilter: "blur(14px)", borderRadius: 14, padding: "22px 28px", textAlign: "center",
      opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(22px)",
      transition: "opacity 0.55s ease, transform 0.55s ease", transitionDelay: `${delay}ms`,
    }}>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 38, fontWeight: 800, color: accent || "#fff", lineHeight: 1 }}>{value}</p>
    </div>
  );
};

const StatisticsSection = ({ stats, loading, requestStats }) => {
  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      <div style={{ width: 38, height: 38, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const g            = stats?.global || {};
  const totalStu     = g.total_students    || 0;
  const placed       = g.placed_students   || 0;
  const unplaced     = g.unplaced_students || 0;
  const placedPct    = totalStu > 0 ? Math.round(placed   / totalStu * 100) : 0;
  const unplacedPct  = totalStu > 0 ? Math.round(unplaced / totalStu * 100) : 0;

  const totalReq     = requestStats?.total     || 0;
  const validated    = requestStats?.validated  || 0;
  const pending      = requestStats?.pending    || 0;
  const rejected     = requestStats?.rejected   || 0;
  const valPct       = totalReq > 0 ? Math.round(validated / totalReq * 100) : 0;
  const pendPct      = totalReq > 0 ? Math.round(pending   / totalReq * 100) : 0;
  const rejPct       = totalReq > 0 ? Math.round(rejected  / totalReq * 100) : 0;

  const donuts = [
    { title: "Placed Students",    percentage: placedPct,  count: placed,    label: "students", color: "#8b5cf6", trackColor: "#2d1d5e", legendA: "Placed", legendB: "Not Placed" },
    { title: "Unplaced Students",  percentage: unplacedPct,count: unplaced,  label: "students", color: "#f472b6", trackColor: "#4a1340", legendA: "Unplaced", legendB: "Placed" },
    { title: "Validated Requests", percentage: valPct,     count: validated, label: "requests", color: "#34d399", trackColor: "#063d28", legendA: "Validated", legendB: "Pending" },
    { title: "Pending Requests",   percentage: pendPct,    count: pending,   label: "requests", color: "#fbbf24", trackColor: "#3d2a00", legendA: "Pending", legendB: "Processed" },
    { title: "Rejected Requests",  percentage: rejPct,     count: rejected,  label: "requests", color: "#f97316", trackColor: "#3b1200", legendA: "Rejected", legendB: "Accepted" },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", width: "100%" }}>
      <div className="stats-grid">
        {donuts.map((d, i) => <DonutCard key={d.title} {...d} delay={i * 90} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 36 }}>
        <SummaryCard label="Total Students"  value={totalStu}                              delay={0} />
        <SummaryCard label="Placement Rate"  value={`${g.placement_rate || 0}%`} accent="#a855f7" delay={80} />
        <SummaryCard label="Total Requests"  value={totalReq}                              delay={160} />
      </div>
    </div>
  );
};

// ─── Footer icons ─────────────────────────────────────────────
const MapPinIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const PhoneIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15z"/></svg>;
const MailIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;

// Notification Icons Mapping
const NOTIFICATION_ICONS = {
  'convention_validated': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  'convention_rejected': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  'application_accepted': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  'application_rejected': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
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
        <IconComponent size={14} className={config.color}/>
      </div>
      <div className="sd-notif-body">
        <p className="text-white/90">{notification.message}</p>
        <span className="sd-notif-time">{notification.created_at}</span>
      </div>
      {!notification.is_read && <div className="sd-notif-unread-dot"/>}
      {isHovered && !notification.is_read && (
        <button 
          className="sd-notif-mark-read" 
          onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
        >
          <CheckCheck size={14}/>
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
          <Bell size={14} className="text-purple-400"/>
          <span>Notifications</span>
          {unreadCount > 0 && <span className="sd-notif-unread-badge">{unreadCount}</span>}
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
            <Bell size={32} className="mx-auto mb-2 opacity-30"/>
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

const wilayas = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra',
  'Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret',
  'Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda',
  'Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',
  "M'Sila",'Mascara','Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arreridj',
  'Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela',
  'Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
  'Ghardaïa','Relizane'
];

const StudentDetailModal = ({ student, onClose }) => {
  if (!student) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition"><X size={20} /></button>
        <h2 className="text-2xl font-bold text-white mb-4">{student.full_name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/60 rounded-lg p-4">
            <p className="text-xs text-purple-400 uppercase mb-1">Email</p>
            <p className="text-white flex items-center gap-2"><Mail size={14} className="text-slate-400"/>{student.email || '—'}</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-4">
            <p className="text-xs text-purple-400 uppercase mb-1">Wilaya</p>
            <p className="text-white flex items-center gap-2"><MapPin size={14} className="text-slate-400"/>{student.wilaya}</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-4">
            <p className="text-xs text-purple-400 uppercase mb-1">University</p>
            <p className="text-white flex items-center gap-2"><BookOpen size={14} className="text-slate-400"/>{student.university}</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-4">
            <p className="text-xs text-purple-400 uppercase mb-1">Major</p>
            <p className="text-white">{student.major}</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-4">
            <p className="text-xs text-purple-400 uppercase mb-1">Education Level</p>
            <p className="text-white">{student.education_level}</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-4">
            <p className="text-xs text-purple-400 uppercase mb-1">Graduation Year</p>
            <p className="text-white">{student.graduation_year}</p>
          </div>
          <div className="col-span-full bg-slate-800/60 rounded-lg p-4">
            <p className="text-xs text-purple-400 uppercase mb-1">Skills</p>
            <div className="flex flex-wrap gap-2">
              {student.skills?.map(s => (
                <span key={s} className="bg-purple-600/30 text-purple-300 text-xs px-2 py-1 rounded-full">{s}</span>
              ))}
              {(!student.skills || student.skills.length === 0) && <span className="text-white/40 text-sm">No skills listed</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [placementStats, setPlacementStats] = useState(null);
  const [statsLoading, setStatsLoading]     = useState(false);
  const [requestStats, setRequestStats]     = useState({ total: 0, validated: 0, pending: 0, rejected: 0 });
  const [universityProfile, setUniversityProfile] = useState(null);
  const [privateChatOpen, setPrivateChatOpen]   = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const [homeStudents, setHomeStudents] = useState([]);
  const [homeSearchLoading, setHomeSearchLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchWilaya, setSearchWilaya] = useState("");
  const [searchMajor, setSearchMajor] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [allStudents, setAllStudents] = useState([]);
  const [studentsPageLoading, setStudentsPageLoading] = useState(false);

  const homeRef     = useRef(null);
  const statsRef    = useRef(null);
  const studentsPageRef = useRef(null);
  const [activeSection,  setActiveSection]  = useState("home");
  const [sectionVisible, setSectionVisible] = useState({ home: true, stats: false, students: false });

  useEffect(() => {
    fetchPlacementStats();
    fetchUniversityProfile();
    fetchRequestStats();
    fetchAllStudents();
    fetchNotifications();
  }, []);

  const fetchPlacementStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API}/admin/placement-stats/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setPlacementStats(data.stats);
    } catch (error) {
      console.error("Error fetching placement stats:", error);
    } finally { 
      setStatsLoading(false); 
    }
  };

  const fetchRequestStats = async () => {
    try {
      const res = await fetch(`${API}/admin/university-students/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        let validated = 0, pending = 0, rejected = 0;
        (data.students || []).forEach(s => {
          validated += s.validated_applications || 0;
          pending   += s.accepted_applications  || 0;
        });
        setRequestStats({ total: validated + pending + rejected, validated, pending, rejected });
      }
    } catch (error) {
      console.error("Error fetching request stats:", error);
    }
  };

  const fetchUniversityProfile = async () => {
    try {
      const res = await fetch(`${API}/admin/university-profile/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setUniversityProfile(data.profile);
    } catch (error) {
      console.error("Error fetching university profile:", error);
    }
  };

  const fetchAllStudents = async () => {
    setStudentsPageLoading(true);
    try {
      const res = await fetch(`${API}/admin/university-students/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAllStudents(data.students || []);
    } catch (error) {
      console.error("Error fetching all students:", error);
    } finally { 
      setStudentsPageLoading(false); 
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/student/notifications/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API}/student/notifications/${id}/read/`, { 
        method: 'PATCH', 
        headers: { Authorization: `Bearer ${token()}` } 
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Error marking notification read:", error);
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
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      toast.error('Erreur lors du marquage des notifications');
    }
  };

  const navigateToValidation = (applicationId) => { 
    navigate(`/admin/validations?app=${applicationId}`); 
    setNotifOpen(false); 
  };

  const handleHomeSearch = async (e) => {
    e.preventDefault();
    setHomeSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchName) params.append('search', searchName);
      if (searchWilaya) params.append('wilaya', searchWilaya);
      if (searchMajor) params.append('major', searchMajor);
      const res = await fetch(`${API}/admin/university-students/?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setHomeStudents(data.students || []);
      else setHomeStudents([]);
    } catch (error) {
      console.error("Error searching students:", error);
      setHomeStudents([]);
    } finally { 
      setHomeSearchLoading(false); 
    }
  };

  const fetchStudentDetails = async (studentId) => {
    try {
      const res = await fetch(`${API}/admin/university-students/${studentId}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSelectedStudent(data.student);
    } catch (error) {
      console.error("Error fetching student details:", error);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section');
            if (sectionId) {
              setActiveSection(sectionId);
              setSectionVisible(prev => ({ ...prev, [sectionId]: true }));
            }
          }
        });
      },
      { threshold: 0.3, rootMargin: '-70px 0px -70px 0px' }
    );

    const sections = [homeRef.current, statsRef.current, studentsPageRef.current].filter(Boolean);
    sections.forEach(section => observer.observe(section));

    return () => {
      sections.forEach(section => observer.unobserve(section));
    };
  }, []);

  const scrollTo = (id, ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
    setSectionVisible(prev => ({ ...prev, [id]: true }));
  };

  const handleStartPrivateChat = (u) => { setSelectedChatUser(u); setPrivateChatOpen(true); };
  const handleClosePrivateChat = () => { setPrivateChatOpen(false); setSelectedChatUser(null); };
  const handleLogout = () => { logout(); navigate("/login"); };

  if (user?.sub_role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Accès non autorisé</h1>
          <p className="text-white/60">Seul le Department Head peut accéder à ce dashboard.</p>
          <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition">Retour</button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "home",     label: "Home",       ref: homeRef },
    { id: "stats",    label: "Statistics", ref: statsRef },
    { id: "students", label: "Students",   ref: studentsPageRef },
  ];

  const placedStudents = allStudents.filter(s => s.is_placed);
  const unplacedStudents = allStudents.filter(s => !s.is_placed);

  return (
    <div className="min-h-screen">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(48px); } to { opacity:1; transform:translateY(0); } }
        .sec-anim { opacity:0; transform:translateY(48px); }
        .sec-anim.vis { animation: fadeUp 0.72s cubic-bezier(0.4,0,0.2,1) forwards; }

        html {
          scroll-snap-type: y mandatory;
          scroll-padding-top: 70px;
          scroll-behavior: smooth;
        }

        .snap-section {
          scroll-snap-align: start;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 80px 5% 100px;
        }

        .home-snap-section {
          scroll-snap-align: start;
          min-height: 100vh;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 80px 5% 100px;
        }

        .snap-section:last-of-type {
          scroll-snap-align: end;
          min-height: auto;
          padding-bottom: 60px;
        }

        /* Stats grid responsive */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          width: 100%;
          margin-bottom: 36px;
        }

        .donut-card {
          width: 100%;
          max-width: 100%;
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .snap-section, .home-snap-section {
            padding: 60px 4% 80px;
          }
          .home-snap-section { flex-direction: column; }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .sd-nav-links { display: none; }
        }

        /* Navbar link active underline */
        .sd-nav-link {
          position: relative;
          padding-bottom: 4px;
        }

        .sd-nav-link.active {
          color: white;
          font-weight: 600;
        }

        .sd-nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2.5px;
          background: white;
          border-radius: 4px;
          animation: underlineSlide 0.3s ease forwards;
        }

        @keyframes underlineSlide {
          from { width: 0; left: 50%; }
          to { width: 100%; left: 0; }
        }

        .sd-nav-link:hover::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 2.5px;
          background: white;
          border-radius: 4px;
        }

        /* Notifications styles */
        .sd-notif-wrapper {
          position: relative;
        }

        .sd-notif-dropdown {
          position: absolute;
          top: 45px;
          right: 0;
          width: 380px;
          max-height: 500px;
          background: rgba(30, 41, 59, 0.98);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.4);
          overflow: hidden;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .sd-notif-header {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          color: white;
          font-size: 0.9rem;
        }

        .sd-notif-clear {
          background: none;
          border: none;
          color: #a855f7;
          font-size: 0.75rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .sd-notif-clear:hover { opacity: 0.7; }

        .sd-notif-list {
          flex: 1;
          overflow-y: auto;
          max-height: 400px;
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

        .sd-notif-item:hover { background: rgba(255,255,255,0.05); }
        .sd-notif-item.unread { background: rgba(168,85,247,0.1); }

        .sd-notif-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sd-notif-body { flex: 1; }
        .sd-notif-body p { font-size: 0.8rem; margin: 0 0 4px 0; line-height: 1.4; }
        .sd-notif-time { font-size: 0.7rem; color: rgba(255,255,255,0.4); }

        .sd-notif-unread-dot {
          width: 8px;
          height: 8px;
          background: #a855f7;
          border-radius: 50%;
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
        }

        .sd-notif-mark-read {
          position: absolute;
          right: 12px;
          top: 50%;
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
          background: rgba(255,255,255,0.2);
          color: white;
        }

        .sd-notif-empty {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255,255,255,0.5);
        }

        .sd-notif-footer {
          padding: 10px 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
          text-align: center;
        }

        .sd-notif-footer button {
          background: none;
          border: none;
          color: rgba(255,255,255,0.6);
          font-size: 0.8rem;
          cursor: pointer;
        }

        .sd-notif-unread-badge {
          background: #a855f7;
          color: white;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 20px;
        }

        /* Footer styles */
        .footer {
          background: radial-gradient(ellipse 80% 120% at 60% 50%,
            rgba(140,30,200,0.85) 0%, rgba(110,20,170,0.65) 35%,
            rgba(70,10,130,0.40) 65%, transparent 85%),
            linear-gradient(135deg, #2d0a6e 0%, #3a0d80 30%, #4a1090 55%, #2d0a6e 100%);
          border-top: none;
          padding: 50px 6% 28px;
          position: relative;
          overflow: hidden;
          width: 100%;
          scroll-snap-align: end;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          margin-bottom: 2rem;
          position: relative;
        }

        .footer-brand p {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.75);
          line-height: 1.7;
          margin-top: 14px;
          max-width: 320px;
        }

        .footer-brand-logo {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-contact h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 18px;
        }

        .footer-contact ul { list-style: none; }
        .footer-contact ul li {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.80);
          margin-bottom: 12px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          line-height: 1.5;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.15);
          padding-top: 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          position: relative;
        }

        .footer-bottom p { font-size: 0.78rem; color: rgba(255,255,255,0.65); }
        .footer-socials { display: flex; gap: 18px; align-items: center; }
        .footer-socials a {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.08);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .footer-socials a:hover { background: rgba(255,255,255,0.15); color: #fff; transform: translateY(-2px); }
        .footer-bottom-links { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .footer-bottom-links a {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-bottom-links a:hover { color: #fff; }
        .footer-bottom-links span { color: rgba(255,255,255,0.30); font-size: 0.78rem; }
      `}</style>

      <nav className="sd-navbar" style={{ borderBottom: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, height: "70px" }}>
        <div className="sd-navbar-left">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(true)}><span/><span/><span/></button>
          <div className="sd-logo-container" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/images/logo.png" alt="UnivStage Logo" className="sd-logo-img" />
            <span className="sd-site-name">UnivStage</span>
          </div>
        </div>
        <ul className="sd-nav-links">
          {navItems.map(({ id, label, ref }) => (
            <li key={id}>
              <a 
                href={`#${id}`} 
                data-section={id}
                className={`sd-nav-link ${activeSection === id ? "active" : ""}`}
                onClick={(e) => { e.preventDefault(); scrollTo(id, ref); }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="sd-navbar-right">
          {/* 🔥 NOTIFICATION ICON - SANS BADGE ROUGE, SEULEMENT LE BADGE MAUVE POUR NOTIFICATIONS NON LUES */}
          <div className="sd-notif-wrapper" ref={notifRef}>
            <button className="sd-icon-btn relative" onClick={() => setNotifOpen(!notifOpen)}>
              <Bell size={20}/>
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
                onNavigate={navigateToValidation}
              />
            )}
          </div>
          <button className="sd-icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        </div>
      </nav>

      <section ref={homeRef} data-section="home"
        className={`home-snap-section sec-anim ${sectionVisible.home ? "vis" : ""}`}
        id="home">
        <div className="sd-hero-container" style={{ width: "100%" }}>
          <div className="sd-hero-content">
            <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 800, lineHeight: 1.08, color: '#fff', letterSpacing: '-1px' }}>
              Welcome<br />
              <span style={{ background: 'linear-gradient(90deg, #F75AFA, #8D23D4 ,#1F36A9 )',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {user?.full_name?.split(" ")[0] || "Admin"}
              </span>
            </h1>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ffffff', margin: '0.5rem 0 1rem' }}>
              from {user?.university || "University"}
            </p>
            <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.62)', lineHeight: 1.75, maxWidth: '420px', margin: '1.4rem 0 2.2rem' }}>
              You may manage students internships by evaluating conventions requests with different companies and access all needed information.
            </p>

            <div className="sd-search-container" style={{ marginTop: "2rem", width: "100%" }}>
              <form onSubmit={handleHomeSearch} className="sd-search-bar" style={{ maxWidth: "100%", display: "flex", alignItems: "center" }}>
                <SearchIcon/>
                <input type="text" placeholder="Search students..." value={searchName} onChange={e => setSearchName(e.target.value)}
                  style={{ background: "transparent", border: "none", outline: "none", color: "white", flex: 1, padding: "0 8px" }} />
                <button type="button" className="sd-filter-btn" onClick={() => setShowFilters(!showFilters)}>
                  <FilterIcon/>
                </button>
                <button type="submit" style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)" }}>
                  <SearchIcon/>
                </button>
              </form>
              {showFilters && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <select value={searchWilaya} onChange={e => setSearchWilaya(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 10px", color: "white", fontSize: "0.8rem" }}>
                    <option value="">All Wilayas</option>
                    {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <select value={searchMajor} onChange={e => setSearchMajor(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 10px", color: "white", fontSize: "0.8rem" }}>
                    <option value="">All Majors</option>
                    {[...new Set(allStudents.map(s => s.major).filter(Boolean))].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>

            {homeSearchLoading ? (
              <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div></div>
            ) : homeStudents.length > 0 ? (
              <div style={{ maxHeight: "200px", overflowY: "auto", marginTop: 8, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "4px 0" }}>
                {homeStudents.map((student, idx) => (
                  <div key={student.id} onClick={() => fetchStudentDetails(student.id)}
                    style={{ padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: idx < homeStudents.length-1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.7rem", fontWeight: "bold" }}>
                      {student.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: "white", fontSize: "0.85rem", margin: 0 }}>{student.full_name}</p>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", margin: 0 }}>{student.major}</p>
                    </div>
                    <div style={{ marginLeft: "auto", color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>
                      <MapPin size={12} style={{ display: "inline", marginRight: 4 }}/>{student.wilaya}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchName || searchWilaya || searchMajor ? (
              <div className="text-center py-4 text-white/40">No students found</div>
            ) : null}
          </div>
          <div className="sd-hero-image" style={{ flex: '1.1', maxWidth: '550px', minHeight: '500px', border: 'none', borderRadius: '20px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {universityProfile?.cover_picture ? (
              <img src={universityProfile.cover_picture} alt="University cover" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '24px' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={48} className="text-white/30"/></div>
            )}
          </div>
        </div>
      </section>

      <section ref={statsRef} data-section="stats"
        className={`snap-section sec-anim ${sectionVisible.stats ? "vis" : ""}`}
        id="stats">
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 className="sd-section-title"><span className="t-pink">Stat</span><span className="t-purple">istics</span></h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "1.05rem", fontWeight: 500 }}>Overview of student placements and request status</p>
        </div>
        <StatisticsSection stats={placementStats} loading={statsLoading} requestStats={requestStats}/>
      </section>

      <section ref={studentsPageRef} data-section="students"
        className={`snap-section sec-anim ${sectionVisible.students ? "vis" : ""}`}
        id="students">
        <div className="text-center mb-12">
          <h2 className="sd-section-title"><span className="t-pink">Stud</span><span className="t-purple">ents</span></h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "1.05rem", fontWeight: 500 }}>Overview of placed and unplaced students</p>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "0 24px" }}>
          {studentsPageLoading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="space-y-12">
              <div>
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2"><span className="text-green-400">●</span> Placed Students ({placedStudents.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {placedStudents.map(student => (
                    <div key={student.id} onClick={() => fetchStudentDetails(student.id)} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 cursor-pointer hover:border-purple-500/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 font-bold text-xs">
                          {student.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        <div><h4 className="text-white font-semibold text-sm">{student.full_name}</h4><p className="text-white/50 text-xs">{student.major}</p></div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-white/50"><Briefcase size={12} /> {student.placed_company_name || "Company"}</div>
                      {student.placement_date && <div className="mt-1 flex items-center gap-2 text-xs text-white/40"><Calendar size={12} /> {student.placement_date}</div>}
                    </div>
                  ))}
                  {placedStudents.length === 0 && <p className="text-white/40 col-span-full text-center py-4">No placed students</p>}
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2"><span className="text-yellow-400">●</span> Unplaced Students ({unplacedStudents.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unplacedStudents.map(student => (
                    <div key={student.id} onClick={() => fetchStudentDetails(student.id)} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 cursor-pointer hover:border-purple-500/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-300 font-bold text-xs">
                          {student.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        <div><h4 className="text-white font-semibold text-sm">{student.full_name}</h4><p className="text-white/50 text-xs">{student.major}</p></div>
                      </div>
                      <div className="mt-2 text-xs text-white/40">Seeking Placement</div>
                    </div>
                  ))}
                  {unplacedStudents.length === 0 && <p className="text-white/40 col-span-full text-center py-4">No unplaced students</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-logo">🎓 UnivStage</div>
            <p>Connecting students with professional opportunities and empowering the next generation of innovators.</p>
          </div>
          <div className="footer-contact">
            <h4>Contact Us</h4>
            <ul>
              <li><MapPinIcon />123 University Ave, Campus Center, Algiers, Algeria</li>
              <li><PhoneIcon />+213 (0) 23 45 67 89</li>
              <li><MailIcon />contact@univstage.dz</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 UnivStage. All rights reserved.</p>
          <div className="footer-socials">
            <a href="#">f</a>
            <a href="#">𝕏</a>
            <a href="#">in</a>
          </div>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <span>|</span>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>

      {sidebarOpen && <AdminSidebar user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)}/>}
      {user?.university && <ChatWidget university={user.university}/>}
      {privateChatOpen && selectedChatUser && (
        <PrivateChat university={user?.university || "Université"} currentUser={user} targetUser={selectedChatUser} onClose={handleClosePrivateChat}/>
      )}
      {selectedStudent && <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
    </div>
  );
};

export default AdminDashboard;