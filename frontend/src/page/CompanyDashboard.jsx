import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

const CompanyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900">
      {/* Navbar */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Company Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Manage Offers button — same as company manager */}
              <Link
                to="/company/manage-offers"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-lg"
              >
                Manage Offers
              </Link>
              <span className="text-white/80">{user?.company_name}</span>
              <span className="text-white/50 text-sm">Hiring Manager</span>
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
        <h2 className="text-3xl font-bold text-white mb-2">Welcome, {user?.company_name}</h2>
        <p className="text-white/60">Use the Manage Offers button to create and manage internship offers.</p>
      </main>
    </div>
  );
};

export default CompanyDashboard;