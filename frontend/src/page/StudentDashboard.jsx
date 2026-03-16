import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Statistiques */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Profil</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">Nom:</span> {user?.full_name}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">Rôle:</span> Étudiant</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Compétences</h3>
            <div className="flex flex-wrap gap-2">
              {user?.skills?.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Statistiques</h3>
            <div className="space-y-2 text-white/80">
              <p>📊 Candidatures: 0</p>
              <p>✅ Acceptées: 0</p>
              <p>⏳ En attente: 0</p>
            </div>
          </div>
        </div>

        {/* Offres récentes */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Offres de stage récentes</h2>
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center">
            <p className="text-white/60">Aucune offre disponible pour le moment</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;