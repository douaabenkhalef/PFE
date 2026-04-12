// frontend/src/components/UniversityUsersStatus.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Circle, UserCheck, Clock, RefreshCw, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:8000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

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

const UniversityUsersStatus = ({ onStartPrivateChat }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ online_count: 0, total_count: 0, university: '' });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchUsers = useCallback(async () => {
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

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
        </div>
      </div>
    );
  }

  const currentUserId = localStorage.getItem('user_id');

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Équipe universitaire</h3>
            <p className="text-white/60 text-sm">
              {stats.online_count} en ligne / {stats.total_count} membres
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchUsers();
            }}
            className="p-2 text-white/60 hover:text-white transition"
            title="Rafraîchir"
          >
            <RefreshCw size={16} />
          </button>
          <span className="text-white/40">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-5 pt-0 border-t border-white/10">
          <div className="mb-4 pb-3 border-b border-white/10">
            <p className="text-purple-400 text-sm">
              🏛️ {stats.university}
            </p>
          </div>
          
          {users.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Aucun membre trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.avatar} isOnline={user.is_online} />
                      <div>
                        <p className="text-white font-medium">{user.full_name || user.username}</p>
                        <p className="text-white/40 text-xs">{user.email}</p>
                        <p className="text-white/30 text-xs mt-0.5">
                          {user.sub_role === 'admin' ? 'Department Head' : 'Co Department Head'}
                          {isCurrentUser && <span className="text-purple-400 ml-2">(Vous)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge isOnline={user.is_online} />
                      {/* 🔥 Bouton de chat privé - visible pour tous sauf soi-même */}
                      {!isCurrentUser && onStartPrivateChat && (
                        <button
                          onClick={() => onStartPrivateChat(user)}
                          className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition flex items-center gap-1"
                          title={`Envoyer un message privé à ${user.full_name || user.username}`}
                        >
                          <MessageCircle size={14} />
                          <span className="text-xs hidden sm:inline">Message</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <p className="text-white/40 text-xs flex items-center justify-center gap-2">
              <Clock size={12} />
              Mise à jour automatique toutes les 30 secondes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityUsersStatus;