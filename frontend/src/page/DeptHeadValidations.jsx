// frontend/src/page/CoDeptValidations.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';  // ← IMPORTANT
import PendingValidationsList from '../components/PendingValidationsList';

export default function CoDeptValidations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permissionError, setPermissionError] = useState(null);

  const handlePermissionError = (errorMessage) => {
    console.log("🔴 Permission error received:", errorMessage);
    setPermissionError(errorMessage);
    setTimeout(() => setPermissionError(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/co-dept-head/dashboard')} className="flex items-center gap-2 text-white/70 hover:text-white transition">
                ← Retour
              </button>
              <span className="text-white/30">|</span>
              <h1 className="text-xl font-bold text-white">Validations des conventions</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name || user?.username}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">
                {user?.university || "Université"}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AFFICHAGE DIRECT DE L'ERREUR - SOLUTION SIMPLE */}
        {permissionError && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-orange-300 text-sm">{permissionError}</p>
                <p className="text-orange-300/70 text-xs mt-2">
                  💡 Veuillez contacter votre Department Head pour demander les permissions nécessaires.
                </p>
              </div>
              <button 
                onClick={() => setPermissionError(null)} 
                className="text-orange-400/70 hover:text-orange-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        <PendingValidationsList
          fetchEndpoint="/co-dept/pending-validations/"
          validateEndpoint="/co-dept/validate-application/"
          rejectEndpoint="/co-dept/reject-application/"
          downloadConventionEndpoint="co-dept"
          title="Validations des conventions"
          emptyMessage="Aucune convention en attente"
          onBack={() => navigate('/co-dept-head/dashboard')}
          onPermissionError={handlePermissionError}
        />
      </main>
    </div>
  );
}