import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CompanyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Company Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.company_name}</span>
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
          {/* Profil entreprise */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Profil</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">Entreprise:</span> {user?.company_name}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">Rôle:</span> Entreprise</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Statistiques</h3>
            <div className="space-y-2 text-white/80">
              <p>📋 Offres actives: 0</p>
              <p>👥 Candidatures reçues: 0</p>
              <p>✅ Candidats acceptés: 0</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Actions rapides</h3>
            <button className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg transition mb-2">
              + Publier une offre
            </button>
            <button className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition">
              👁️ Voir les candidatures
            </button>
          </div>
        </div>

        {/* Offres publiées */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Mes offres de stage</h2>
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center">
            <p className="text-white/60">Aucune offre publiée pour le moment</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompanyDashboard;