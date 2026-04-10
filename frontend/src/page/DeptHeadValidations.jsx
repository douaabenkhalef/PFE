// frontend/src/page/DeptHeadValidations.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, PenTool } from 'lucide-react';
import PendingValidationsList from '../components/PendingValidationsList';

export default function DeptHeadValidations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2 text-white/70 hover:text-white transition"
              >
                ← Retour
              </button>
              <span className="text-white/30">|</span>
              <h1 className="text-xl font-bold text-white">Conventions de stage</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name || user?.email}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">
                {user?.university || "Université"}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Onglets */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-2 border-b border-white/20">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-purple-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            En attente de validation
          </button>
          <button
            onClick={() => setActiveTab('validated')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg flex items-center gap-2 ${
              activeTab === 'validated'
                ? 'bg-purple-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <PenTool className="w-4 h-4" />
            Validées (prêtes à signer)
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'pending' && (
          <PendingValidationsList
            fetchEndpoint="/dept-head/pending-validations/?status=accepted_by_company"
            validateEndpoint="/dept-head/validate-application/"
            rejectEndpoint="/dept-head/reject-application/"
            downloadConventionEndpoint="co-dept"
            title="Conventions en attente"
            emptyMessage="Aucune convention en attente de validation"
          />
        )}

        {activeTab === 'validated' && (
          <PendingValidationsList
            fetchEndpoint="/dept-head/validated-validations/"
            validateEndpoint="/dept-head/validate-application/"
            rejectEndpoint="/dept-head/reject-application/"
            downloadConventionEndpoint="co-dept"
            title="Conventions prêtes à signer"
            emptyMessage="Aucune convention prête à être signée"
          />
        )}
      </main>
    </div>
  );
}