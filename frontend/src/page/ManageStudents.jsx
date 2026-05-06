// frontend/src/page/ManageStudents.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Filter, Eye, X, ArrowLeft, 
  GraduationCap, MapPin, Code, BookOpen, Calendar,
  CheckCircle, XCircle, Briefcase, Mail, Github, Globe,
  TrendingUp, Award, BarChart3, Loader2, Clock,
  ChevronDown, ChevronUp, PieChart, TrendingDown, Download,
  User, Building2, UserCog, LogOut, Activity, SlidersHorizontal,
  Settings, FileText, CheckSquare, BarChart, FileSignature,
  FileText as FileTextIcon, CheckCircle2, XCircle as XCircleIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminSidebarInline } from '../components/AdminSidebar';
import './StudentDashboard.css';

const API = '/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

// ==================== DonutChart Component ====================
const DonutChart = ({ percentage, color, trackColor, size = 140, stroke = 15 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setPct(percentage), 200);
    return () => clearTimeout(timer);
  }, [percentage]);

  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

const DonutCard = ({ title, percentage, count, label, color, trackColor, legendA, legendB, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  const ref = React.useRef(null);

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
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.13)',
        backdropFilter: 'blur(14px)',
        borderRadius: 16,
        padding: '18px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        transitionDelay: `${delay}ms`,
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {title}
      </span>
      <div style={{ position: 'relative', alignSelf: 'center' }}>
        <DonutChart percentage={visible ? percentage : 0} color={color} trackColor={trackColor} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{percentage}%</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{count} {label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignSelf: 'center' }}>
        {[{ c: color, l: legendA }, { c: trackColor, l: legendB }].map(({ c, l }) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, accent, delay = 0 }) => {
  const [v, setV] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => setV(true), delay); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div ref={ref} style={{
      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)',
      backdropFilter: 'blur(14px)', borderRadius: 14, padding: '22px 28px', textAlign: 'center',
      opacity: v ? 1 : 0, transform: v ? 'translateY(0)' : 'translateY(22px)',
      transition: 'opacity 0.55s ease, transform 0.55s ease', transitionDelay: `${delay}ms`,
    }}>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 38, fontWeight: 800, color: accent || '#fff', lineHeight: 1 }}>{value}</p>
    </div>
  );
};

// ==================== Statistics Section Complete ====================
const StatisticsSection = ({ stats, loading, onBackToList, totalStudents }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 38, height: 38, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const g = stats?.global || {};
  const totalStu = g.total_students || 0;
  const placed = g.placed_students || 0;
  const unplaced = g.unplaced_students || 0;
  const placedPct = totalStu > 0 ? Math.round(placed / totalStu * 100) : 0;
  const unplacedPct = totalStu > 0 ? Math.round(unplaced / totalStu * 100) : 0;

  const donuts = [
    { title: "Placed Students", percentage: placedPct, count: placed, label: "students", color: "#8b5cf6", trackColor: "#2d1d5e", legendA: "Placed", legendB: "Not Placed" },
    { title: "Unplaced Students", percentage: unplacedPct, count: unplaced, label: "students", color: "#f472b6", trackColor: "#4a1340", legendA: "Unplaced", legendB: "Placed" },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', width: '100%' }}>
      {/* Bouton retour */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Statistiques détaillées</h2>
        <button
          onClick={onBackToList}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-2"
        >
          <Users size={16} />
          Voir la liste des étudiants
        </button>
      </div>

      {/* Donuts */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '36px' }}>
        {donuts.map((d, i) => <DonutCard key={d.title} {...d} delay={i * 90} />)}
      </div>
      
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 36 }}>
        <SummaryCard label="Total Students" value={totalStu} delay={0} />
        <SummaryCard label="Placement Rate" value={`${g.placement_rate || 0}%`} accent="#a855f7" delay={80} />
        <SummaryCard label="Total Applications" value={stats?.total_applications || 0} delay={160} />
      </div>

      {/* Par filière */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden mb-6">
        <button
          onClick={() => setExpandedSection(expandedSection === 'major' ? null : 'major')}
          className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Par filière</h3>
          </div>
          {expandedSection === 'major' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSection === 'major' && (
          <div className="p-5 pt-0 border-t border-white/10">
            <div className="space-y-3">
              {stats?.by_major && stats.by_major.map(major => (
                <div key={major.name} className="bg-slate-800/60 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{major.name}</span>
                    <span className="text-purple-400 text-sm">{major.placement_rate}%</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-400">✅ {major.placed} placés</span>
                    <span className="text-yellow-400">⏳ {major.unplaced} en recherche</span>
                    <span className="text-slate-400">📊 Total: {major.total}</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${major.placement_rate}%` }} />
                  </div>
                </div>
              ))}
              {(!stats?.by_major || stats.by_major.length === 0) && (
                <p className="text-white/40 text-center py-4">Aucune donnée par filière</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Par promotion */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden mb-6">
        <button
          onClick={() => setExpandedSection(expandedSection === 'year' ? null : 'year')}
          className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Par promotion</h3>
          </div>
          {expandedSection === 'year' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSection === 'year' && (
          <div className="p-5 pt-0 border-t border-white/10">
            <div className="space-y-3">
              {stats?.by_graduation_year && stats.by_graduation_year.sort((a,b) => b.year - a.year).map(year => (
                <div key={year.year} className="bg-slate-800/60 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Promotion {year.year}</span>
                    <span className="text-purple-400 text-sm">{year.placement_rate}%</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-400">✅ {year.placed} placés</span>
                    <span className="text-yellow-400">⏳ {year.unplaced} en recherche</span>
                    <span className="text-slate-400">📊 Total: {year.total}</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${year.placement_rate}%` }} />
                  </div>
                </div>
              ))}
              {(!stats?.by_graduation_year || stats.by_graduation_year.length === 0) && (
                <p className="text-white/40 text-center py-4">Aucune donnée par promotion</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top compétences */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'skills' ? null : 'skills')}
          className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Top compétences</h3>
          </div>
          {expandedSection === 'skills' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSection === 'skills' && (
          <div className="p-5 pt-0 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle size={16} /> Étudiants placés
                </h4>
                <div className="space-y-2">
                  {stats?.top_skills && stats.top_skills.placed && stats.top_skills.placed.slice(0, 8).map(skill => (
                    <div key={skill.skill} className="flex justify-between items-center bg-green-500/10 rounded-lg p-2">
                      <span className="text-white text-sm">{skill.skill}</span>
                      <span className="text-green-400 text-sm font-semibold">{skill.count} étudiants</span>
                    </div>
                  ))}
                  {(!stats?.top_skills?.placed || stats.top_skills.placed.length === 0) && (
                    <p className="text-white/40 text-center py-4">Aucune donnée</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                  <Clock size={16} /> Étudiants en recherche
                </h4>
                <div className="space-y-2">
                  {stats?.top_skills && stats.top_skills.unplaced && stats.top_skills.unplaced.slice(0, 8).map(skill => (
                    <div key={skill.skill} className="flex justify-between items-center bg-yellow-500/10 rounded-lg p-2">
                      <span className="text-white text-sm">{skill.skill}</span>
                      <span className="text-yellow-400 text-sm font-semibold">{skill.count} étudiants</span>
                    </div>
                  ))}
                  {(!stats?.top_skills?.unplaced || stats.top_skills.unplaced.length === 0) && (
                    <p className="text-white/40 text-center py-4">Aucune donnée</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== StudentCard Component ====================
const StudentCard = ({ student, onClick }) => {
  return (
    <div 
      className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 hover:border-purple-500 transition-all cursor-pointer"
      onClick={() => onClick(student)}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-semibold text-lg">{student.full_name}</h3>
          <p className="text-purple-400 text-sm">{student.major}</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          student.is_placed 
            ? 'bg-green-500/20 text-green-300' 
            : 'bg-yellow-500/20 text-yellow-300'
        }`}>
          {student.is_placed ? 'Stage trouvé' : 'En recherche'}
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <Mail size={14} className="text-slate-500" />
          <span>{student.email}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin size={14} className="text-slate-500" />
          <span>{student.wilaya}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar size={14} className="text-slate-500" />
          <span>Promotion {student.graduation_year}</span>
        </div>
      </div>
      
      {student.skills && student.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {student.skills.slice(0, 3).map(skill => (
            <span key={skill} className="bg-purple-900/60 text-purple-300 text-xs px-2 py-0.5 rounded-full">
              {skill}
            </span>
          ))}
          {student.skills.length > 3 && (
            <span className="text-slate-400 text-xs">+{student.skills.length - 3}</span>
          )}
        </div>
      )}
      
      <div className="mt-3 flex gap-3 text-xs text-slate-400">
        <span>📋 {student.applications_count} candidatures</span>
        {student.accepted_applications > 0 && (
          <span className="text-green-400">✅ {student.accepted_applications} acceptées</span>
        )}
      </div>
    </div>
  );
};

// ==================== StudentDetailsModal Component ====================
const StudentDetailsModal = ({ student, onClose }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      fetchStudentDetails();
    }
  }, [student]);

  const fetchStudentDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/university-students/${student.id}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{student.full_name}</h2>
            <p className="text-purple-400">{student.major} - {student.education_level}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-white">{student.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Wilaya</p>
                <p className="text-white">{student.wilaya}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Université</p>
                <p className="text-white">{student.university}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date d'inscription</p>
                <p className="text-white">{student.created_at}</p>
              </div>
            </div>
            
            {student.skills && student.skills.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Compétences</p>
                <div className="flex flex-wrap gap-2">
                  {student.skills.map(skill => (
                    <span key={skill} className="bg-purple-900/60 text-purple-300 text-xs px-2.5 py-1 rounded-full">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Situation professionnelle</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Statut</p>
                <p className={`font-semibold ${student.is_placed ? 'text-green-400' : 'text-yellow-400'}`}>
                  {student.is_placed ? 'Stage trouvé' : 'En recherche de stage'}
                </p>
              </div>
              {student.is_placed && (
                <>
                  <div>
                    <p className="text-xs text-slate-500">Entreprise</p>
                    <p className="text-white">{student.placed_company_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date de placement</p>
                    <p className="text-white">{student.placement_date}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Historique des candidatures</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-purple-400" />
              </div>
            ) : applications.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Aucune candidature</p>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{app.offer_title}</p>
                        <p className="text-slate-400 text-sm">{app.company_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        app.status === 'validated_by_co_dept' ? 'bg-green-500/20 text-green-300' :
                        app.status === 'accepted_by_company' ? 'bg-blue-500/20 text-blue-300' :
                        app.status === 'rejected_by_company' ? 'bg-red-500/20 text-red-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {app.status === 'validated_by_co_dept' ? 'Validé' :
                         app.status === 'accepted_by_company' ? 'Accepté' :
                         app.status === 'rejected_by_company' ? 'Refusé' : 'En attente'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">Postulé le {app.applied_at}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Main Component ====================
export default function ManageStudents() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [placementStats, setPlacementStats] = useState(null);
  const [university, setUniversity] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    major: '',
    wilaya: '',
    skills: '',
    is_placed: ''
  });
  
  const [majors, setMajors] = useState([]);
  const [wilayasList] = useState([
    'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra',
    'Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret',
    'Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda',
    'Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',
    "M'Sila",'Mascara','Ouargla','Oran','El Bayadh','Illizi',
    'Bordj Bou Arreridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
    'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla',
    'Naâma','Aïn Témouchent','Ghardaïa','Relizane'
  ]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.major) params.append('major', filters.major);
      if (filters.wilaya) params.append('wilaya', filters.wilaya);
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.is_placed) params.append('is_placed', filters.is_placed);
      
      const res = await fetch(`${API}/admin/university-students/?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
        setStats(data.stats);
        setUniversity(data.university);
        const uniqueMajors = [...new Set(data.students.map(s => s.major).filter(Boolean))];
        setMajors(uniqueMajors);
      } else {
        toast.error(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlacementStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API}/admin/placement-stats/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        // Calculer total des applications
        let totalApps = 0;
        if (students.length > 0) {
          totalApps = students.reduce((sum, s) => sum + (s.applications_count || 0), 0);
        }
        setPlacementStats({
          ...data.stats,
          total_applications: totalApps
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  useEffect(() => {
    if (students.length > 0) {
      fetchPlacementStats();
    }
  }, [students]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      major: '',
      wilaya: '',
      skills: '',
      is_placed: ''
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button
            onClick={() => {
              if (user?.sub_role === 'admin') {
                navigate('/admin/dashboard');
              } else {
                navigate('/co-dept-head/dashboard');
              }
            }}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>

          {showStats ? (
            <StatisticsSection 
              stats={placementStats} 
              loading={statsLoading} 
              onBackToList={() => setShowStats(false)}
              totalStudents={students.length}
            />
          ) : (
            <>
              {/* Professional Filter Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl mb-8 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-purple-400" />
                    <h3 className="text-white font-semibold">Filtres avancés</h3>
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-white/60 hover:text-white transition text-sm flex items-center gap-1"
                  >
                    {showFilters ? 'Masquer' : 'Afficher'}
                    {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                
                {showFilters && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                      <div>
                        <label className="block text-white/80 text-xs font-medium uppercase tracking-wider mb-2">Recherche</label>
                        <input
                          type="text"
                          placeholder="Nom, email, filière..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-white/80 text-xs font-medium uppercase tracking-wider mb-2">Filière</label>
                        <select
                          value={filters.major}
                          onChange={(e) => handleFilterChange('major', e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        >
                          <option value="">Toutes</option>
                          {majors.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-white/80 text-xs font-medium uppercase tracking-wider mb-2">Wilaya</label>
                        <select
                          value={filters.wilaya}
                          onChange={(e) => handleFilterChange('wilaya', e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        >
                          <option value="">Toutes</option>
                          {wilayasList.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-white/80 text-xs font-medium uppercase tracking-wider mb-2">Compétences</label>
                        <input
                          type="text"
                          placeholder="React, Python, Java..."
                          value={filters.skills}
                          onChange={(e) => handleFilterChange('skills', e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-white/80 text-xs font-medium uppercase tracking-wider mb-2">Statut</label>
                        <select
                          value={filters.is_placed}
                          onChange={(e) => handleFilterChange('is_placed', e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                        >
                          <option value="">Tous</option>
                          <option value="true">Stage trouvé</option>
                          <option value="false">En recherche</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-6 gap-3">
                      <button
                        onClick={resetFilters}
                        className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition border border-white/20"
                      >
                        Réinitialiser
                      </button>
                      <button
                        onClick={fetchStudents}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition shadow-md flex items-center gap-2"
                      >
                        <Search size={16} />
                        Rechercher
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Header with stats toggle */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Étudiants</h2>
                  <p className="text-white/50 text-sm mt-1">{stats.filtered || students.length} résultat(s)</p>
                </div>
                <button
                  onClick={() => setShowStats(true)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition shadow-lg flex items-center gap-2"
                >
                  <BarChart3 size={16} />
                  Statistiques
                </button>
              </div>

              {/* Student grid */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-purple-400" />
                </div>
              ) : students.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
                  <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Aucun étudiant trouvé</h3>
                  <p className="text-white/60">Modifiez vos filtres pour élargir la recherche.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map(student => (
                    <StudentCard key={student.id} student={student} onClick={setSelectedStudent} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedStudent && (
        <StudentDetailsModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}