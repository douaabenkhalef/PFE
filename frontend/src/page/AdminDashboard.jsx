import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Statistiques globales */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Étudiants</h3>
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-white/60 text-sm">inscrits</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Entreprises</h3>
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-white/60 text-sm">inscrites</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Offres</h3>
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-white/60 text-sm">publiées</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-2">Stages</h3>
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-white/60 text-sm">validés</p>
          </div>
        </div>

        {/* Validations en attente */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Validations en attente</h2>
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center">
            <p className="text-white/60">Aucune validation en attente</p>
          </div>
        </div>

        {/* Graphiques / Statistiques */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Répartition par wilaya</h3>
            <div className="h-64 flex items-center justify-center text-white/40">
              Graphique à venir
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Stages par filière</h3>
            <div className="h-64 flex items-center justify-center text-white/40">
              Graphique à venir
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;