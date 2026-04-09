// frontend/src/page/DeptHeadActivityLogs.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Eye, Filter, Calendar, RefreshCw, 
  CheckCircle, XCircle, Clock, FileText, UserPlus, 
  UserMinus, FileSignature, ArrowLeft, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:8000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const actionIcons = {
  'validate_convention': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Validation de convention' },
  'reject_convention': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Refus de convention' },
  'generate_convention': { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Génération de convention' },
  'approve_co_dept_head': { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Approbation Co Dept Head' },
  'reject_co_dept_head': { icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Refus Co Dept Head' }
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
                Par <span className="text-purple-400">{log.user_name}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Clock size={12} />
              {log.created_at}
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-slate-800/60 rounded-lg">
            <p className="text-white/80 text-sm">
              <span className="text-purple-400">Convention:</span> {log.target_name}
            </p>
            {log.details && (
              <div className="mt-2 space-y-1">
                {log.details.student_name && (
                  <p className="text-white/60 text-xs">👤 {log.details.student_name}</p>
                )}
                {log.details.offer_title && (
                  <p className="text-white/60 text-xs">📋 {log.details.offer_title}</p>
                )}
                {log.details.reason && (
                  <p className="text-white/60 text-xs">📝 Motif: {log.details.reason}</p>
                )}
                {log.details.validated_by && (
                  <p className="text-green-400 text-xs">✅ Validé par: {log.details.validated_by}</p>
                )}
                {log.details.company_name && (
                  <p className="text-white/60 text-xs">🏢 {log.details.company_name}</p>
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

export default function DeptHeadActivityLogs() {
  const { user } = useAuth();
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
        toast.error(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const actionTypes = [
    { value: 'validate_convention', label: 'Validations de convention' },
    { value: 'reject_convention', label: 'Refus de convention' },
    { value: 'generate_convention', label: 'Générations de convention' },
    { value: 'approve_co_dept_head', label: 'Approbations Co Dept Head' },
    { value: 'reject_co_dept_head', label: 'Refus Co Dept Head' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2 text-white/70 hover:text-white transition"
              >
                <ArrowLeft size={18} />
                Retour
              </button>
              <span className="text-white/30">|</span>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl font-bold text-white">Contrôle d'Activité - Co Dept Heads</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name || user?.email}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">Department Head</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total actions</p>
                <p className="text-2xl font-bold text-white">{stats.total_actions || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-400 opacity-60" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Validations</p>
                <p className="text-2xl font-bold text-green-400">{stats.validations_count || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400 opacity-60" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Refus</p>
                <p className="text-2xl font-bold text-red-400">{stats.rejections_count || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400 opacity-60" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Générations</p>
                <p className="text-2xl font-bold text-blue-400">{stats.generations_count || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400 opacity-60" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Approbations Co Dept</p>
                <p className="text-2xl font-bold text-purple-400">{stats.approvals_count || 0}</p>
              </div>
              <UserPlus className="w-8 h-8 text-purple-400 opacity-60" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition"
          >
            <Filter size={16} />
            {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </button>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Type d'action</label>
                <select
                  value={filters.action_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Tous</option>
                  {actionTypes.map(at => (
                    <option key={at.value} value={at.value}>{at.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Date début</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Date fin</label>
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Historique des actions des Co Department Heads</h2>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>

        {/* Logs list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
            <Activity className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Aucune activité enregistrée</h3>
            <p className="text-white/60">Les actions des Co Department Heads apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map(log => (
              <ActivityLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}