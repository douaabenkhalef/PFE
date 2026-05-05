// frontend/src/page/UniversityTeam.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Circle, UserCheck, Clock, RefreshCw, MessageCircle,
  ArrowLeft, LogOut, Search, User, Building2, FileText, Activity,
  GraduationCap, LayoutDashboard, UsersRound
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

// Composant UserAvatar
const UserAvatar = ({ name, isOnline }) => (
  <div className="relative">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
      isOnline ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'
    }`}>
      {name}
    </div>
    {isOnline && (
      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
    )}
  </div>
);

// Composant StatusBadge
const StatusBadge = ({ isOnline }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
    isOnline 
      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
      : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
  }`}>
    <Circle size={8} className={isOnline ? 'text-green-400 fill-green-400' : 'text-gray-400 fill-gray-400'} />
    {isOnline ? 'En ligne' : 'Hors ligne'}
  </span>
);

// Composant principal
export default function UniversityTeam() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ online_count: 0, total_count: 0, university: '' });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  const isDeptHead = user?.sub_role === 'admin';
  const isCoDeptHead = user?.sub_role === 'co_dept_head';

  // Récupérer les utilisateurs
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/university-users-status/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setStats({
          online_count: data.online_count,
          total_count: data.total_count,
          university: data.university
        });
      } else {
        toast.error(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Filtrer les utilisateurs par recherche
  const filteredUsers = users.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.full_name && member.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const handleStartPrivateChat = (targetUser) => {
    setSelectedChatUser(targetUser);
    setPrivateChatOpen(true);
  };

  const handleClosePrivateChat = () => {
    setPrivateChatOpen(false);
    setSelectedChatUser(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (isDeptHead) return '/admin/dashboard';
    if (isCoDeptHead) return '/co-dept-head/dashboard';
    return '/login';
  };

  const currentUserId = localStorage.getItem('user_id');

  return (
    <div className="min-h-screen flex">
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Bouton retour */}
          <button
            onClick={() => navigate(getDashboardPath())}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>

          {/* En-tête */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <UsersRound className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Équipe universitaire</h1>
                <p className="text-white/60 text-sm mt-1">
                  {stats.online_count} en ligne / {stats.total_count} membres · {stats.university}
                </p>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total membres</p>
                  <p className="text-3xl font-bold text-white">{stats.total_count}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400 opacity-60" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">En ligne</p>
                  <p className="text-3xl font-bold text-green-400">{stats.online_count}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-400 opacity-60" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Hors ligne</p>
                  <p className="text-3xl font-bold text-gray-400">{stats.total_count - stats.online_count}</p>
                </div>
                <Clock className="w-8 h-8 text-gray-400 opacity-60" />
              </div>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-5 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={fetchUsers}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Actualiser
              </button>
            </div>
          </div>

          {/* Liste des membres */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
              <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Aucun membre trouvé</h3>
              <p className="text-white/60">Modifiez votre recherche pour trouver des membres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredUsers.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const roleLabel = member.sub_role === 'admin' ? 'Department Head' : 'Co Department Head';
                const roleColor = member.sub_role === 'admin' ? 'text-purple-400' : 'text-cyan-400';
                
                return (
                  <div
                    key={member.id}
                    className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-5 hover:border-purple-500/50 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member.avatar} isOnline={member.is_online} />
                        <div>
                          <h3 className="text-white font-semibold">{member.full_name || member.username}</h3>
                          <p className={`text-xs ${roleColor}`}>{roleLabel}</p>
                        </div>
                      </div>
                      <StatusBadge isOnline={member.is_online} />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{member.email}</span>
                      </div>
                      {member.last_activity && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <Clock size={12} className="text-slate-500" />
                          <span>{member.status_text}</span>
                        </div>
                      )}
                    </div>
                    
                    {!isCurrentUser && (
                      <button
                        onClick={() => handleStartPrivateChat(member)}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 py-2 rounded-lg transition text-sm font-medium"
                      >
                        <MessageCircle size={14} />
                        Envoyer un message
                      </button>
                    )}
                    
                    {isCurrentUser && (
                      <div className="mt-4 text-center text-xs text-white/40 border-t border-white/10 pt-3">
                        🔹 Vous êtes connecté
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ChatWidget university={user?.university || "Université"} />
      
      {privateChatOpen && selectedChatUser && (
        <PrivateChat
          university={user?.university || "Université"}
          currentUser={user}
          targetUser={selectedChatUser}
          onClose={handleClosePrivateChat}
        />
      )}
    </div>
  );
}