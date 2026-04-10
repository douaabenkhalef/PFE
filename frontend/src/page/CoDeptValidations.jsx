// src/page/CoDeptValidations.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PendingValidationsList from '../components/PendingValidationsList';
import FormError from '../components/FormError';
import { ERROR_MESSAGES } from '../utils/messages';

export default function CoDeptValidations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permissionError, setPermissionError] = useState(null);

  const handlePermissionError = (errorMessage) => {
    setPermissionError(errorMessage);
    // Effacer l'erreur après 5 secondes
    setTimeout(() => setPermissionError(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/co-dept-head/dashboard')}
                className="flex items-center gap-2 text-white/70 hover:text-white transition"
              >
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
        {/* Affichage de l'erreur de permission comme sur AuthPage */}
        <FormError 
          messages={permissionError} 
          onClose={() => setPermissionError(null)}
        />

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