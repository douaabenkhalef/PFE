import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Clock, BookOpen, Users, FileCheck, Clock as ClockIcon } from 'lucide-react';

const CoDeptHeadDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Vérifier si le compte est approuvé
  const isApproved = user?.status !== false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Co Department Head Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name || user?.username}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">
                {user?.university || "En attente"}
              </span>
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
        {!isApproved ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
            <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Compte en attente d'approbation</h3>
            <p className="text-white/60">
              Votre compte est en attente d'approbation par le Department Head.<br />
              Vous recevrez un email une fois votre compte activé.
            </p>
            <div className="mt-6 p-4 bg-white/5 rounded-lg inline-block">
              <p className="text-white/80">
                Université: <span className="text-purple-400">{user?.university || "En attente"}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Carte Étudiants */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Étudiants</p>
                  <p className="text-3xl font-bold text-white">0</p>
                  <p className="text-white/60 text-sm mt-2">Étudiants inscrits</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Carte Stages validés */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Stages validés</p>
                  <p className="text-3xl font-bold text-white">0</p>
                  <p className="text-white/60 text-sm mt-2">Conventions signées</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            {/* Carte En attente */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">En attente</p>
                  <p className="text-3xl font-bold text-white">0</p>
                  <p className="text-white/60 text-sm mt-2">Stages à valider</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Informations université - Pleine largeur */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all col-span-full">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Informations université</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm">Nom de l'université</p>
                  <p className="text-white font-medium">{user?.university || "Non spécifié"}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Email</p>
                  <p className="text-white font-medium">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 col-span-full">
              <h3 className="text-lg font-semibold text-white mb-4">Actions rapides</h3>
              <div className="flex flex-wrap gap-4">
                <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Voir les étudiants
                </button>
                <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Stages à valider
                </button>
                <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Générer conventions
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoDeptHeadDashboard;