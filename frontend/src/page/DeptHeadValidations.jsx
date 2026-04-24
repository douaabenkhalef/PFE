// frontend/src/page/DeptHeadValidations.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PendingValidationsList from '../components/PendingValidationsList';
import { AdminSidebarInline } from '../components/AdminSidebar';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';
import './StudentDashboard.css';

export default function DeptHeadValidations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

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
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Convention Requests</h2>
            <p className="text-white/60">
              Review and validate internship convention requests submitted by students.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-white/20 pb-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'pending'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Conventions en attente
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'ready'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Prêtes à signer
            </button>
          </div>

          {/* Glassmorphic list – same logic, new look */}
          <div className="mt-4">
            {activeTab === 'pending' && (
              <PendingValidationsList
                fetchEndpoint="/dept-head/pending-validations/"
                validateEndpoint="/dept-head/validate-application/"
                rejectEndpoint="/dept-head/reject-application/"
                downloadConventionEndpoint="co-dept"
                title="Conventions en attente"
                emptyMessage="Aucune convention en attente de validation"
              />
            )}
            {activeTab === 'ready' && (
              <PendingValidationsList
                fetchEndpoint="/dept-head/validated-validations/"
                validateEndpoint="/dept-head/validate-application/"
                rejectEndpoint="/dept-head/reject-application/"
                downloadConventionEndpoint="co-dept"
                title="Conventions prêtes à signer"
                emptyMessage="Aucune convention prête à être signée"
              />
            )}
          </div>
        </div>
      </div>

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