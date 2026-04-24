// frontend/src/page/CoDeptValidations.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import PendingValidationsList from '../components/PendingValidationsList';
import { AdminSidebarInline } from '../components/AdminSidebar';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';
import './StudentDashboard.css'; // <-- radial gradient background

export default function CoDeptValidations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [permissionError, setPermissionError] = useState(null);
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  const handlePermissionError = (errorMessage) => {
    console.log("🔴 Permission error received:", errorMessage);
    setPermissionError(errorMessage);
    setTimeout(() => setPermissionError(null), 5000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStartPrivateChat = (targetUser) => {
    setSelectedChatUser(targetUser);
    setPrivateChatOpen(true);
  };

  const handleClosePrivateChat = () => {
    setPrivateChatOpen(false);
    setSelectedChatUser(null);
  };

  return (
    <div className="min-h-screen flex">
      {/* Fixed sidebar */}
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      {/* Main content */}
      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Return button to Co Dept Head dashboard */}
          <button
            onClick={() => navigate('/co-dept-head/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>

          {/* Permission error banner (glassmorphic) */}
          {permissionError && (
            <div className="bg-orange-500/10 backdrop-blur-lg border border-orange-500/30 rounded-xl p-4 mb-6">
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
        </div>
      </div>

      {/* Floating chat */}
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