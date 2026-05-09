// frontend/src/page/CompanyActivityLogs.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Activity, Eye, Filter, Calendar, RefreshCw, 
  CheckCircle, XCircle, Clock, FileText, UserPlus, 
  UserMinus, Briefcase, Trash2, Users, Search,
  ArrowLeft, User, Building2, UserCog, LogOut, Moon, Sun
} from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentDashboard.css';
import UserAvatar from '../components/UserAvatar';

const API = 'https://pfe-l31r.onrender.com/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

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

const actionIcons = {
  'create_offer': { icon: Briefcase, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Offer Created' },
  'update_offer': { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Offer Modified' },
  'delete_offer': { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Offer Deleted' },
  'accept_application': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Application Accepted' },
  'reject_application': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Application Rejected' },
  'approve_hiring_manager': { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Hiring Manager Approved' },
  'reject_hiring_manager': { icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Hiring Manager Rejected' }
};

const ActivityLogCard = ({ log }) => {
  const config = actionIcons[log.action_type] || { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-500/10', label: log.action_label };
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
              <p className="text-white/60 text-xs mt-2">
                {log.details.offer_title && `📋 ${log.details.offer_title}`}
                {log.details.student_name && `👤 ${log.details.student_name}`}
                {log.details.reason && `📝 Reason: ${log.details.reason}`}
                {log.details.company_name && `🏢 ${log.details.company_name}`}
              </p>
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

export default function CompanyActivityLogs() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action_type: '',
    start_date: '',
    end_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const isCompanyManager = user?.sub_role === 'company_manager';

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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const res = await fetch(`${API}/activity-logs/company/?${params}`, { headers: authHeaders() });
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
    { value: 'create_offer', label: 'Offer Created' },
    { value: 'update_offer', label: 'Offer Modified' },
    { value: 'delete_offer', label: 'Offer Deleted' },
    { value: 'accept_application', label: 'Application Accepted' },
    { value: 'reject_application', label: 'Application Rejected' },
    { value: 'approve_hiring_manager', label: 'Hiring Manager Approved' },
    { value: 'reject_hiring_manager', label: 'Hiring Manager Rejected' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full fixed left-0 top-0 overflow-y-auto border-r border-purple-500/30">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                 <UserAvatar /> 
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.full_name || user?.email}</p>
              <p className="text-white/50 text-xs">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div>
            <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control & Management</p>
            <div className="space-y-1">
              <Link to="/company/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <User size={16} /> My Profile
              </Link>
              <Link to="/company/company-profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <Building2 size={16} /> Company Profile
              </Link>
              <Link to="/company/manage-offers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <Briefcase size={16} /> Manage Offers
              </Link>
              <Link to="/company/applications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <FileText size={16} /> Student Applications
              </Link>
              {isCompanyManager && (
                <>
                  <Link to="/company-manager/manage-hiring-managers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                    <UserCog size={16} /> Manage Hiring Managers
                  </Link>
                  <Link to="/company-manager/activity-logs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30">
                    <Activity size={16} /> Control HM Activity
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/company-manager/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stats-card bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Actions</p>
                  <p className="text-2xl font-bold text-white">{stats.total_actions || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-400 opacity-60" />
              </div>
            </div>
            <div className="stats-card bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Last 7 Days</p>
                  <p className="text-2xl font-bold text-white">{stats.last_7_days || 0}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-400 opacity-60" />
              </div>
            </div>
            <div className="stats-card bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Offers Created</p>
                  <p className="text-2xl font-bold text-white">{stats.by_type?.create_offer || 0}</p>
                </div>
                <Briefcase className="w-8 h-8 text-green-400 opacity-60" />
              </div>
            </div>
            <div className="stats-card bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Applications Processed</p>
                  <p className="text-2xl font-bold text-white">
                    {(stats.by_type?.accept_application || 0) + (stats.by_type?.reject_application || 0)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-yellow-400 opacity-60" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-white/70 hover:text-white transition"
            >
              <Filter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Action Type</label>
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
                  <label className="block text-white/70 text-sm mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions header */}
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-white">Activity History</h2>
            <div className="flex gap-3">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                {isDarkMode ? <SunIcon size={14} /> : <MoonIcon size={14} />}
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                onClick={fetchLogs}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          {/* Logs list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
              <Activity className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Activity Recorded</h3>
              <p className="text-white/60">Hiring managers' actions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map(log => (
                <ActivityLogCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .w-64 {
            width: 220px !important;
          }
          .ml-64 {
            margin-left: 220px !important;
          }
          .grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem;
          }
          .stats-card {
            padding: 1rem !important;
          }
          .stats-card .text-2xl {
            font-size: 1.3rem !important;
          }
          .stats-card .w-8.h-8 {
            width: 1.5rem;
            height: 1.5rem;
          }
        }
        
        @media (max-width: 580px) {
          .w-64 {
            width: 200px !important;
          }
          .ml-64 {
            margin-left: 200px !important;
          }
          .grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 {
            grid-template-columns: 1fr !important;
          }
          .px-4 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .w-64 {
            width: 180px !important;
          }
          .ml-64 {
            margin-left: 180px !important;
          }
          .flex.justify-between.items-center {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.75rem;
          }
          .text-xl.font-bold {
            font-size: 1.1rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .w-64 {
          background: linear-gradient(180deg, #ffffff 0%, #f5f0ff 100%) !important;
          border-right: 1px solid rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .text-white,
        body.light-mode .text-white/70,
        body.light-mode .text-white/80,
        body.light-mode .text-white/90 {
          color: #1a1a2e !important;
        }
        body.light-mode .text-white/50,
        body.light-mode .text-white/40,
        body.light-mode .text-white/60 {
          color: #666 !important;
        }
        body.light-mode .text-purple-300/60 {
          color: #8D23D4 !important;
          opacity: 0.7;
        }
        body.light-mode .bg-white/10 {
          background: rgba(141, 35, 212, 0.08) !important;
        }
        body.light-mode .bg-white/10.backdrop-blur-lg {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .border-white/20 {
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-slate-800 {
          background: rgba(0, 0, 0, 0.05) !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
          color: #1a1a2e !important;
        }
        body.light-mode .bg-slate-800/60 {
          background: rgba(0, 0, 0, 0.03) !important;
        }
        body.light-mode .bg-slate-800/60 .text-white/80,
        body.light-mode .bg-slate-800/60 .text-white/60 {
          color: #555 !important;
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
        body.light-mode .text-purple-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
        }
        body.light-mode .hover\\:bg-red-500\\/20:hover {
          background: rgba(220, 38, 38, 0.1) !important;
        }
        body.light-mode .bg-green-500/10,
        body.light-mode .bg-blue-500/10,
        body.light-mode .bg-red-500/10,
        body.light-mode .bg-gray-500/10 {
          background: rgba(141, 35, 212, 0.08) !important;
        }
        body.light-mode .text-green-400 {
          color: #059669 !important;
        }
        body.light-mode .text-blue-400 {
          color: #2563eb !important;
        }
        body.light-mode .text-red-400 {
          color: #dc2626 !important;
        }
        body.light-mode .text-yellow-400 {
          color: #d97706 !important;
        }
      `}</style>
    </div>
  );
}