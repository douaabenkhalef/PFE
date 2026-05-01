// frontend/src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Bell, Image, Search, X, ChevronDown, GraduationCap, MapPin, BookOpen, Mail, User, Briefcase, Calendar
} from "lucide-react";
import UniversityUsersStatus from "../components/UniversityUsersStatus";
import ChatWidget from "../components/ChatWidget";
import PrivateChat from "../components/PrivateChat";
import AdminSidebar from "../components/AdminSidebar";
import "./StudentDashboard.css";

const API = "http://localhost:8000/api";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

// ─── Animated SVG Donut (unchanged) ───────────────────
const DonutChart = ({ percentage, color, trackColor, size = 140, stroke = 15 }) => {
  const r    = (size - stroke) / 2;
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
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.13)",
        backdropFilter: "blur(14px)",
        borderRadius: 16,
        padding: "18px 14px 14px",
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
        transitionDelay: `${delay}ms`,
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
    { title: "Placed Students",    percentage: placedPct,  count: placed,    label: "students", color: "#8b5cf6", trackColor: "#2d1d5e", legendA: "Completed", legendB: "Remaining" },
    { title: "Unplaced Students",  percentage: unplacedPct,count: unplaced,  label: "students", color: "#f472b6", trackColor: "#4a1340", legendA: "Completed", legendB: "Remaining" },
    { title: "Validated Requests", percentage: valPct,     count: validated, label: "requests", color: "#34d399", trackColor: "#063d28", legendA: "Completed", legendB: "Remaining" },
    { title: "Pending Requests",   percentage: pendPct,    count: pending,   label: "requests", color: "#fbbf24", trackColor: "#3d2a00", legendA: "Completed", legendB: "Remaining" },
    { title: "Rejected Requests",  percentage: rejPct,     count: rejected,  label: "requests", color: "#f97316", trackColor: "#3b1200", legendA: "Completed", legendB: "Remaining" },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 36 }}>
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
          <div className="bg-slate-800/60 rounded-lg p-4"><p className="text-xs text-purple-400 uppercase mb-1">Email</p><p className="text-white flex items-center gap-2"><Mail size={14} className="text-slate-400"/>{student.email || '—'}</p></div>
          <div className="bg-slate-800/60 rounded-lg p-4"><p className="text-xs text-purple-400 uppercase mb-1">Wilaya</p><p className="text-white flex items-center gap-2"><MapPin size={14} className="text-slate-400"/>{student.wilaya}</p></div>
          <div className="bg-slate-800/60 rounded-lg p-4"><p className="text-xs text-purple-400 uppercase mb-1">University</p><p className="text-white flex items-center gap-2"><BookOpen size={14} className="text-slate-400"/>{student.university}</p></div>
          <div className="bg-slate-800/60 rounded-lg p-4"><p className="text-xs text-purple-400 uppercase mb-1">Major</p><p className="text-white">{student.major}</p></div>
          <div className="bg-slate-800/60 rounded-lg p-4"><p className="text-xs text-purple-400 uppercase mb-1">Education Level</p><p className="text-white">{student.education_level}</p></div>
          <div className="bg-slate-800/60 rounded-lg p-4"><p className="text-xs text-purple-400 uppercase mb-1">Graduation Year</p><p className="text-white">{student.graduation_year}</p></div>
          <div className="col-span-full bg-slate-800/60 rounded-lg p-4"><p className="text-xs text-purple-400 uppercase mb-1">Skills</p><div className="flex flex-wrap gap-2">{student.skills?.map(s => <span key={s} className="bg-purple-600/30 text-purple-300 text-xs px-2 py-1 rounded-full">{s}</span>)}{(!student.skills || student.skills.length === 0) && <span className="text-white/40 text-sm">No skills listed</span>}</div></div>
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
  const teamRef     = useRef(null);
  const [activeSection,  setActiveSection]  = useState("home");
  const [sectionVisible, setSectionVisible] = useState({ home: true, stats: false, students: false, team: false });
  const unreadCount = 0;

  useEffect(() => {
    fetchPlacementStats();
    fetchUniversityProfile();
    fetchRequestStats();
    fetchAllStudents();
  }, []);

  const fetchPlacementStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API}/admin/placement-stats/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setPlacementStats(data.stats);
    } catch {}
    finally { setStatsLoading(false); }
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
    } catch {}
  };

  const fetchUniversityProfile = async () => {
    try {
      const res = await fetch(`${API}/admin/university-profile/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setUniversityProfile(data.profile);
    } catch {}
  };

  const fetchAllStudents = async () => {
    setStudentsPageLoading(true);
    try {
      const res = await fetch(`${API}/admin/university-students/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAllStudents(data.students || []);
    } catch {}
    finally { setStudentsPageLoading(false); }
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
    } catch { setHomeStudents([]); }
    finally { setHomeSearchLoading(false); }
  };

  const fetchStudentDetails = async (studentId) => {
    try {
      const res = await fetch(`${API}/admin/university-students/${studentId}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSelectedStudent(data.student);
    } catch {}
  };

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          const sec = e.target.dataset.section;
          setActiveSection(sec);
          setSectionVisible(prev => ({ ...prev, [sec]: true }));
        }
      }),
      { threshold: 0.12, rootMargin: "-60px 0px -60px 0px" }
    );
    [homeRef, statsRef, studentsPageRef, teamRef].forEach(r => r.current && obs.observe(r.current));
    return () => obs.disconnect();
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
    { id: "team",     label: "Team",       ref: teamRef },
  ];

  const placedStudents = allStudents.filter(s => s.is_placed);
  const unplacedStudents = allStudents.filter(s => !s.is_placed);

  return (
    <div className="min-h-screen">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(48px); } to { opacity:1; transform:translateY(0); } }
        .sec-anim          { opacity:0; transform:translateY(48px); }
        .sec-anim.vis      { animation: fadeUp 0.72s cubic-bezier(0.4,0,0.2,1) forwards; }

        /* Snap scrolling applied directly to the HTML element – NO inner scroll container */
        html {
          scroll-snap-type: y mandatory;
          scroll-padding-top: 70px;   /* height of the fixed navbar */
        }

        .snap-section {
          scroll-snap-align: start;
          height: 100vh;             /* full viewport height */
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 5%;
        }

        /* Home section keeps its row layout for the hero image */
        .home-snap-section {
          scroll-snap-align: start;
          height: 100vh;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0 5%;
        }

        /* Footer is outside any snap container – plain block at the bottom */
        .footer {
          margin-top: 0;
        }
      `}</style>

      <nav className="sd-navbar" style={{ borderBottom: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, height: "70px" }}>
        <div className="sd-navbar-left">
          <button className="sd-hamburger" onClick={() => setSidebarOpen(true)}><span/><span/><span/></button>
          <a className="sd-logo" href="/">UnivStage</a>
        </div>
        <ul className="sd-nav-links">
          {navItems.map(({ id, label, ref }) => (
            <li key={id}>
              <a href={`#${id}`} className={activeSection === id ? "active" : ""}
                onClick={e => { e.preventDefault(); scrollTo(id, ref); }}>{label}</a>
            </li>
          ))}
        </ul>
        <div className="sd-navbar-right">
          <button className="sd-icon-btn relative">
            <Bell size={20}/>
            {unreadCount > 0 && <span className="sd-badge-count">{unreadCount}</span>}
          </button>
          <button className="sd-icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* ── SECTIONS (no extra wrapper) ── */}
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

      <section ref={teamRef} data-section="team"
        className={`snap-section sec-anim ${sectionVisible.team ? "vis" : ""}`}
        id="team">
        <div className="text-center mb-12">
          <h2 className="sd-section-title"><span className="t-pink">University </span><span className="t-purple">Team</span></h2>
          <p className="sd-section-subtitle">Connect and communicate with university staff members</p>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
          <UniversityUsersStatus onStartPrivateChat={handleStartPrivateChat}/>
        </div>
      </section>

      {/* Footer – after all snap sections, part of the normal document flow */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand"><div className="footer-brand-logo">🎓 UnivStage</div><p>Connecting students with professional opportunities and empowering the next generation of innovators.</p></div>
          <div className="footer-contact"><h4>Contact Us</h4><ul><li><MapPinIcon/>{universityProfile?.address || "123 University Ave, Campus Center"}</li><li><PhoneIcon/>{universityProfile?.phone   || "+1 (555) 123-4567"}</li><li><MailIcon/>{universityProfile?.email   || "internships@university.edu"}</li></ul></div>
        </div>
        <div className="footer-bottom"><p>© 2026 UnivStage. All rights reserved.</p><div className="footer-socials"><a href="#!">f</a><a href="#!">𝕏</a><a href="#!">in</a><a href="#!">◎</a></div><div className="footer-bottom-links"><a href="#!">Privacy Policy</a><span>|</span><a href="#!">Terms of Service</a></div></div>
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