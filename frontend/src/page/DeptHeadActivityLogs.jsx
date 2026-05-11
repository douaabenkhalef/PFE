
// frontend/src/page/DeptHeadActivityLogs.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Eye, Filter, Calendar, RefreshCw, 
  CheckCircle, XCircle, Clock, FileText, UserPlus, 
  UserMinus, FileSignature, ArrowLeft, PenTool,
  Settings, Trash2, Briefcase, Users, BarChart3,
  ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminSidebarInline } from '../components/AdminSidebar';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';
import './StudentDashboard.css';

const API = 'https://pfe-l31r.onrender.com/api';
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

// ==================== Activity Log Card ====================
const actionIcons = {
  'validate_convention': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Convention Validation' },
  'reject_convention': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Convention Rejection' },
  'generate_convention': { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Convention Generation' },
  'approve_co_dept_head': { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Co Dept Head Approval' },
  'reject_co_dept_head': { icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Co Dept Head Rejection' },
  'add_signature': { icon: PenTool, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Signature Added' },
  'update_permissions': { icon: Settings, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Permissions Updated' },
  'delete_co_dept_head': { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Co Dept Head Deleted' },
  'create_offer': { icon: Briefcase, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Offer Created' },
  'update_offer': { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Offer Updated' },
  'delete_offer': { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Offer Deleted' },
  'accept_application': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Application Accepted' },
  'reject_application': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Application Rejected' }
};

const ActivityLogCard = ({ log }) => {
  const config = actionIcons[log.action_type] || { 
    icon: Activity, 
    color: 'text-gray-400', 
    bg: 'bg-gray-500/10', 
    label: log.action_label 
  };
  const IconComponent = config.icon;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 hover:border-purple-500 transition-all">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${config.bg}`}>
          <IconComponent size={20} className={config.color} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-white font-semibold">{config.label}</h4>
              <p className="text-white/60 text-sm mt-1">
                By <span className="text-purple-400">{log.user_name}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Clock size={12} />
              {log.created_at}
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-slate-800/60 rounded-lg">
            <p className="text-white/80 text-sm">
              <span className="text-purple-400">Target:</span> {log.target_name}
            </p>
            {log.details && Object.keys(log.details).length > 0 && (
              <div className="mt-2 space-y-1">
                {log.details.student_name && (
                  <p className="text-white/60 text-xs">👤 {log.details.student_name}</p>
                )}
                {log.details.offer_title && (
                  <p className="text-white/60 text-xs">📋 {log.details.offer_title}</p>
                )}
                {log.details.reason && (
                  <p className="text-white/60 text-xs">📝 Reason: {log.details.reason}</p>
                )}
                {log.details.validated_by && (
                  <p className="text-green-400 text-xs">✅ Validated by: {log.details.validated_by}</p>
                )}
                {log.details.company_name && (
                  <p className="text-white/60 text-xs">🏢 {log.details.company_name}</p>
                )}
                {log.details.signed_by && (
                  <p className="text-purple-400 text-xs">✎ Signed by: {log.details.signed_by}</p>
                )}
                {log.details.permissions && (
                  <p className="text-yellow-400 text-xs">🔧 Permissions modified</p>
                )}
              </div>
            )}
          </div>
        </div>
        {log.status === 'success' ? (
          <CheckCircle size={16} className="text-green-400" />
        ) : (
          <XCircle size={16} className="text-red-400" />
        )}
      </div>
    </div>
  );
};

// ==================== Statistics Section ====================
const StatisticsSection = ({ stats, loading, onViewDetails }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  const totalActions = stats.total_actions || 0;
  const validationsCount = stats.validations_count || 0;
  const rejectionsCount = stats.rejections_count || 0;
  const signaturesCount = stats.signatures_count || 0;
  const approvalsCount = stats.approvals_count || 0;
  const permissionsCount = stats.permissions_count || 0;
  const deletionsCount = stats.deletions_count || 0;
  const offersCount = stats.offers_count || 0;
  const applicationsCount = stats.applications_count || 0;
  const generationsCount = stats.generations_count || 0;

  const valPct = totalActions > 0 ? Math.round(validationsCount / totalActions * 100) : 0;
  const rejPct = totalActions > 0 ? Math.round(rejectionsCount / totalActions * 100) : 0;
  const sigPct = totalActions > 0 ? Math.round(signaturesCount / totalActions * 100) : 0;
  const appPct = totalActions > 0 ? Math.round(approvalsCount / totalActions * 100) : 0;
  const permPct = totalActions > 0 ? Math.round(permissionsCount / totalActions * 100) : 0;
  const delPct = totalActions > 0 ? Math.round(deletionsCount / totalActions * 100) : 0;
  const offPct = totalActions > 0 ? Math.round(offersCount / totalActions * 100) : 0;
  const canPct = totalActions > 0 ? Math.round(applicationsCount / totalActions * 100) : 0;
  const genPct = totalActions > 0 ? Math.round(generationsCount / totalActions * 100) : 0;

  const donuts = [
    { title: "Validations", percentage: valPct, count: validationsCount, label: "actions", color: "#34d399", trackColor: "#063d28", legendA: "Validations", legendB: "Others" },
    { title: "Rejections", percentage: rejPct, count: rejectionsCount, label: "actions", color: "#f97316", trackColor: "#3b1200", legendA: "Rejections", legendB: "Others" },
    { title: "Signatures", percentage: sigPct, count: signaturesCount, label: "actions", color: "#c084fc", trackColor: "#3b0764", legendA: "Signatures", legendB: "Others" },
    { title: "Approvals", percentage: appPct, count: approvalsCount, label: "actions", color: "#60a5fa", trackColor: "#1e3a5f", legendA: "Approvals", legendB: "Others" },
    { title: "Permissions", percentage: permPct, count: permissionsCount, label: "actions", color: "#fbbf24", trackColor: "#3d2a00", legendA: "Permissions", legendB: "Others" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back button */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">Activity Statistics</h2>
        <button
          onClick={onViewDetails}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-2"
        >
          <Eye size={16} />
          View detailed logs
        </button>
      </div>

      {/* Donuts */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '36px' }}>
        {donuts.map((d, i) => <DonutCard key={d.title} {...d} delay={i * 90} />)}
      </div>
      
      {/* Summary Cards */}
      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <SummaryCard label="Total Actions" value={totalActions} delay={0} />
        <SummaryCard label="Offers Processed" value={offersCount} accent="#a855f7" delay={80} />
        <SummaryCard label="Applications" value={applicationsCount} accent="#60a5fa" delay={160} />
        <SummaryCard label="Deletions" value={deletionsCount} accent="#ef4444" delay={240} />
      </div>

      {/* Details by type */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'details' ? null : 'details')}
          className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Details by action type</h3>
          </div>
          {expandedSection === 'details' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {expandedSection === 'details' && (
          <div className="p-5 pt-0 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white font-medium">Validations</span>
                  <span className="text-green-400 ml-auto">{validationsCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(validationsCount / totalActions) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-orange-400" />
                  <span className="text-white font-medium">Rejections</span>
                  <span className="text-orange-400 ml-auto">{rejectionsCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(rejectionsCount / totalActions) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PenTool className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-medium">Signatures</span>
                  <span className="text-purple-400 ml-auto">{signaturesCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(signaturesCount / totalActions) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">Co Dept Approvals</span>
                  <span className="text-blue-400 ml-auto">{approvalsCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(approvalsCount / totalActions) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-medium">Permissions Modified</span>
                  <span className="text-yellow-400 ml-auto">{permissionsCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(permissionsCount / totalActions) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span className="text-white font-medium">Deletions</span>
                  <span className="text-red-400 ml-auto">{deletionsCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${(deletionsCount / totalActions) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  <span className="text-white font-medium">Offers Processed</span>
                  <span className="text-cyan-400 ml-auto">{offersCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(offersCount / totalActions) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">Applications Processed</span>
                  <span className="text-blue-400 ml-auto">{applicationsCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(applicationsCount / totalActions) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-4 md:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-medium">Convention Generations</span>
                  <span className="text-emerald-400 ml-auto">{generationsCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(generationsCount / totalActions) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Main Component ====================
export default function DeptHeadActivityLogs() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showStatsView, setShowStatsView] = useState(true);
  const [filters, setFilters] = useState({
    action_type: '',
    start_date: '',
    end_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const res = await fetch(`${API}/activity-logs/dept-head/?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setStats(data.stats);
      } else {
        toast.error(data.error || 'Error loading logs');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const actionTypes = [
    { value: 'validate_convention', label: 'Convention Validations' },
    { value: 'reject_convention', label: 'Convention Rejections' },
    { value: 'generate_convention', label: 'Convention Generations' },
    { value: 'add_signature', label: 'Signature Additions' },
    { value: 'approve_co_dept_head', label: 'Co Dept Head Approvals' },
    { value: 'reject_co_dept_head', label: 'Co Dept Head Rejections' },
    { value: 'update_permissions', label: 'Permissions Modifications' },
    { value: 'delete_co_dept_head', label: 'Co Dept Head Deletions' },
    { value: 'create_offer', label: 'Offer Creations' },
    { value: 'update_offer', label: 'Offer Modifications' },
    { value: 'delete_offer', label: 'Offer Deletions' },
    { value: 'accept_application', label: 'Application Acceptances' },
    { value: 'reject_application', label: 'Application Rejections' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStartPrivateChat = (targetUser) => {
    setSelectedChatUser(targetUser);
    setPrivateChatOpen(true);
  };

  const handleClosePrivateChat = () => {
    setPrivateChatOpen(false);
    setSelectedChatUser(null);
  };

  const clearFilters = () => {
    setFilters({
      action_type: '',
      start_date: '',
      end_date: ''
    });
  };

  const hasActiveFilters = filters.action_type || filters.start_date || filters.end_date;

  return (
    <div className="min-h-screen flex">
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      <div className="ml-64 flex-1 min-h-screen py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          {/* Header with toggle */}
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Co Department Heads Activity</h1>
              <p className="text-white/60 text-sm mt-1">Track activity of co department heads at your university</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStatsView(!showStatsView)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  showStatsView 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {showStatsView ? <BarChart3 size={16} /> : <Activity size={16} />}
                {showStatsView ? 'View logs' : 'View statistics'}
              </button>
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          {showStatsView ? (
            <StatisticsSection 
              stats={stats} 
              loading={loading} 
              onViewDetails={() => setShowStatsView(false)}
            />
          ) : (
            <>
              {/* Filters */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 mb-6">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-white/70 hover:text-white transition"
                >
                  <Filter size={16} />
                  {showFilters ? 'Hide filters' : 'Show filters'}
                </button>
                
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Action type</label>
                      <select
                        value={filters.action_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="">All</option>
                        {actionTypes.map(at => (
                          <option key={at.value} value={at.value}>{at.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Start date</label>
                      <input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm mb-2">End date</label>
                      <input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                )}
                
                {hasActiveFilters && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={clearFilters}
                      className="text-white/50 text-sm hover:text-white/80 transition px-3 py-1 rounded-lg hover:bg-white/10"
                    >
                      ✕ Clear filters
                    </button>
                  </div>
                )}
              </div>

              {/* Actions header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Action history</h2>
                <p className="text-white/40 text-sm">{logs.length} action(s)</p>
              </div>

              {/* Logs list */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                  <Activity className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No activity recorded</h3>
                  <p className="text-white/60">Co Department Heads' actions will appear here.</p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 px-4 py-2 bg-purple-600/40 hover:bg-purple-600/60 rounded-lg text-white text-sm transition"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map(log => (
                    <ActivityLogCard key={log.id} log={log} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      
      <style>{`
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px;
          }
          .summary-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        @media (max-width: 768px) {
          .ml-64 {
            margin-left: 220px !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px;
          }
          .summary-grid {
            grid-template-columns: 1fr !important;
          }
          .flex.justify-between.items-center {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.75rem;
          }
          .grid-cols-1.md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          .grid-cols-1.md\\:grid-cols-3 {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 580px) {
          .ml-64 {
            margin-left: 200px !important;
          }
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
          .px-6 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .px-4.py-2 {
            padding: 0.4rem 0.75rem;
            font-size: 0.7rem;
          }
        }
        
        @media (max-width: 480px) {
          .ml-64 {
            margin-left: 180px !important;
          }
          .text-2xl.font-bold {
            font-size: 1.1rem;
          }
          .text-xl.font-bold {
            font-size: 1rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .bg-white\\/10 {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .bg-white\\/10.backdrop-blur-lg {
          background: rgba(255, 255, 255, 0.95) !important;
        }
        body.light-mode .bg-white\\/5 {
          background: rgba(0, 0, 0, 0.03) !important;
        }
        body.light-mode .text-white,
        body.light-mode .text-white\\/70,
        body.light-mode .text-white\\/80,
        body.light-mode .text-white\\/90 {
          color: #1a1a2e !important;
        }
        body.light-mode .text-white\\/50,
        body.light-mode .text-white\\/60,
        body.light-mode .text-white\\/40,
        body.light-mode .text-white\\/30 {
          color: #666 !important;
        }
        body.light-mode .text-purple-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .border-white\\/20 {
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-slate-800\\/60 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .bg-slate-800 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .bg-slate-800 .text-white {
          color: #1a1a2e !important;
        }
        body.light-mode .bg-slate-800 .text-white\\/80,
        body.light-mode .bg-slate-800 .text-white\\/60,
        body.light-mode .bg-slate-800 .text-white\\/40 {
          color: #555 !important;
        }
        body.light-mode .border-slate-700 {
          border-color: rgba(141, 35, 212, 0.15) !important;
        }
        body.light-mode .donut-card {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .donut-card span,
        body.light-mode .donut-card [style*="color: rgba(255,255,255,0.8)"] {
          color: #1a1a2e !important;
        }
        body.light-mode .donut-card [style*="color: rgba(255,255,255,0.55)"] {
          color: #666 !important;
        }
        body.light-mode .summary-card,
        body.light-mode [style*="background: rgba(255,255,255,0.07)"] {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .summary-card p,
        body.light-mode [style*="color: rgba(255,255,255,0.5)"] {
          color: #666 !important;
        }
        body.light-mode .bg-green-500/10,
        body.light-mode .bg-red-500/10,
        body.light-mode .bg-purple-500/10,
        body.light-mode .bg-blue-500/10,
        body.light-mode .bg-yellow-500/10,
        body.light-mode .bg-cyan-500/10,
        body.light-mode .bg-emerald-500/10 {
          background: rgba(141, 35, 212, 0.08) !important;
        }
        body.light-mode .text-green-400 {
          color: #059669 !important;
        }
        body.light-mode .text-red-400 {
          color: #dc2626 !important;
        }
        body.light-mode .text-purple-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .text-blue-400 {
          color: #2563eb !important;
        }
        body.light-mode .text-yellow-400 {
          color: #d97706 !important;
        }
        body.light-mode .text-cyan-400 {
          color: #0891b2 !important;
        }
        body.light-mode .text-emerald-400 {
          color: #059669 !important;
        }
        body.light-mode .text-orange-400 {
          color: #ea580c !important;
        }
        body.light-mode select,
        body.light-mode input {
          background: rgba(0, 0, 0, 0.05) !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
          color: #1a1a2e !important;
        }
        body.light-mode select option {
          background: white !important;
          color: #1a1a2e !important;
        }
        body.light-mode .bg-purple-600 {
          background: #8D23D4 !important;
        }
        body.light-mode .bg-purple-600:hover {
          background: #6B21A5 !important;
        }
        body.light-mode button.bg-white\\/10 {
          background: rgba(141, 35, 212, 0.08) !important;
        }
        body.light-mode button.bg-white\\/10:hover {
          background: rgba(141, 35, 212, 0.15) !important;
        }
      `}</style>
    </div>
  );
}