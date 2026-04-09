// frontend/src/page/CompanyActivityLogs.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Eye, Filter, Calendar, RefreshCw, 
  CheckCircle, XCircle, Clock, FileText, UserPlus, 
  UserMinus, Briefcase, Trash2, Users, Search,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:8000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const actionIcons = {
  'create_offer': { icon: Briefcase, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Création offre' },
  'update_offer': { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Modification offre' },
  'delete_offer': { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Suppression offre' },
  'accept_application': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Acceptation candidature' },
  'reject_application': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Refus candidature' },
  'approve_hiring_manager': { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Approbation Hiring Manager' },
  'reject_hiring_manager': { icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Refus Hiring Manager' }
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
              <span className="text-purple-400">Cible:</span> {log.target_name}
            </p>
            {log.details && Object.keys(log.details).length > 0 && (
              <p className="text-white/60 text-xs mt-2">
                {log.details.offer_title && `📋 ${log.details.offer_title}`}
                {log.details.student_name && `👤 ${log.details.student_name}`}
                {log.details.reason && `📝 Motif: ${log.details.reason}`}
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
      
      const res = await fetch(`${API}/activity-logs/company/?${params}`, { headers: authHeaders() });
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
    { value: 'create_offer', label: 'Création offre' },
    { value: 'update_offer', label: 'Modification offre' },
    { value: 'delete_offer', label: 'Suppression offre' },
    { value: 'accept_application', label: 'Acceptation candidature' },
    { value: 'reject_application', label: 'Refus candidature' },
    { value: 'approve_hiring_manager', label: 'Approbation Hiring Manager' },
    { value: 'reject_hiring_manager', label: 'Refus Hiring Manager' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/company-manager/dashboard')}
                className="flex items-center gap-2 text-white/70 hover:text-white transition"
              >
                <ArrowLeft size={18} />
                Retour
              </button>
              <span className="text-white/30">|</span>
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl font-bold text-white">Contrôle d'Activité</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.company_name}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">Company Manager</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <p className="text-white/60 text-sm">7 derniers jours</p>
                <p className="text-2xl font-bold text-white">{stats.last_7_days || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400 opacity-60" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Créations offre</p>
                <p className="text-2xl font-bold text-white">{stats.by_type?.create_offer || 0}</p>
              </div>
              <Briefcase className="w-8 h-8 text-green-400 opacity-60" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Candidatures traitées</p>
                <p className="text-2xl font-bold text-white">
                  {(stats.by_type?.accept_application || 0) + (stats.by_type?.reject_application || 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-yellow-400 opacity-60" />
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
          <h2 className="text-xl font-bold text-white">Historique des actions</h2>
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
            <p className="text-white/60">Les actions des hiring managers apparaîtront ici.</p>
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