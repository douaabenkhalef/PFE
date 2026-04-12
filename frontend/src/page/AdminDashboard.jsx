// frontend/src/page/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

import { 
  CheckCircle, XCircle, Clock, Mail, User, Shield, 
  GraduationCap, FileText, Eye, Check, X, Loader2,
  Building2, MapPin, Calendar, Code, BookOpen, Award, Github, Globe,
  BarChart3, Users, PenTool, Download, Bell
} from "lucide-react";
import toast from "react-hot-toast";
import SignaturePad from "../components/SignaturePad";
import PendingValidationsList from "../components/PendingValidationsList";
import UniversityUsersStatus from "../components/UniversityUsersStatus";
import ChatWidget from "../components/ChatWidget";
import PrivateChat from "../components/PrivateChat";

const API = 'http://localhost:8000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCoDeptHeads, setPendingCoDeptHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('co_dept_heads');
  const [validationsTab, setValidationsTab] = useState('pending');
  
  // État pour le chat privé
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  useEffect(() => {
    fetchPendingCoDeptHeads();
  }, []);

  const fetchPendingCoDeptHeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/admin/pending-co-dept-heads/`, { headers: authHeaders() });
      const data = await response.json();
      if (data.success) {
        setPendingCoDeptHeads(data.co_dept_heads);
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCoDept = async (headId, headName) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API}/admin/approve-co-dept-head/${headId}/`, {
        method: "POST",
        headers: authHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Co Department Head ${headName} a été approuvé`);
        fetchPendingCoDeptHeads();
      } else {
        toast.error(data.message || "Erreur lors de l'approbation");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCoDept = async (headId, headName) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API}/admin/reject-co-dept-head/${headId}/`, {
        method: "POST",
        headers: authHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Co Department Head ${headName} a été refusé et supprimé de la base de données`);
        fetchPendingCoDeptHeads();
        
        const currentUserEmail = localStorage.getItem('user_email');
        if (data.deleted && currentUserEmail === headName) {
          toast.info("Votre compte a été supprimé. Vous allez être déconnecté.");
          setTimeout(() => {
            logout();
            navigate("/login");
          }, 2000);
        }
      } else {
        toast.error(data.message || "Erreur lors du refus");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setProcessing(false);
    }
  };

  const handleStartPrivateChat = (targetUser) => {
    setSelectedChatUser(targetUser);
    setPrivateChatOpen(true);
  };

  const handleClosePrivateChat = () => {
    setPrivateChatOpen(false);
    setSelectedChatUser(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (user?.sub_role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Accès non autorisé</h1>
          <p className="text-white/60">Seul le Department Head peut accéder à ce dashboard.</p>
          <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition">Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Department Head Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/admin/activity-logs"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-2"
              >
                <BarChart3 size={16} />
                Contrôle d'Activité
              </Link>

              <Link
                to="/admin/manage-co-dept-heads"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-2"
              >
                <Users size={16} />
                Gérer Co Dept Heads
              </Link>

              <Link
                to="/admin/manage-students"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition shadow-lg flex items-center gap-2"
              >
                <GraduationCap size={16} />
                Gérer Étudiants
              </Link>

              <span className="text-white/80">{user?.full_name || user?.email}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">{user?.university || "Université"}</span>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-2 border-b border-white/20">
          <button
            onClick={() => setActiveTab('co_dept_heads')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg flex items-center gap-2 ${
              activeTab === 'co_dept_heads'
                ? 'bg-purple-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Co Department Heads
            {pendingCoDeptHeads.length > 0 && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCoDeptHeads.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('validations')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg flex items-center gap-2 ${
              activeTab === 'validations'
                ? 'bg-purple-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            Conventions
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg flex items-center gap-2 ${
              activeTab === 'team'
                ? 'bg-purple-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            Équipe
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'co_dept_heads' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Co Department Heads en attente</h2>
              <p className="text-white/60">Approuvez ou refusez les demandes d'inscription des Co Department Heads</p>
              <p className="text-red-400/60 text-sm mt-1">⚠️ Attention : Un refus supprimera définitivement le compte du Co Department Head.</p>
            </div>

            {pendingCoDeptHeads.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Aucune demande en attente</h3>
                <p className="text-white/60">Tous les co department heads ont été traités.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingCoDeptHeads.map((head) => (
                  <div key={head.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{head.username}</h3>
                          <p className="text-white/60 text-sm">{head.full_name}</p>
                        </div>
                      </div>
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Mail className="w-4 h-4" />
                        <span>{head.email}</span>
                      </div>
                      {head.university && (
                        <p className="text-white/60 text-sm flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          {head.university}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => handleApproveCoDept(head.id, head.username)} 
                        disabled={processing} 
                        className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" /> Approuver
                      </button>
                      <button 
                        onClick={() => handleRejectCoDept(head.id, head.username)} 
                        disabled={processing} 
                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'validations' && (
          <>
            <div className="flex gap-2 mb-6 border-b border-white/20 pb-2">
              <button
                onClick={() => setValidationsTab('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  validationsTab === 'pending'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                En attente de validation
              </button>
              <button
                onClick={() => setValidationsTab('validated')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  validationsTab === 'validated'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Validées (prêtes à signer)
              </button>
            </div>

            {validationsTab === 'pending' && (
              <PendingValidationsList
                fetchEndpoint="/dept-head/pending-validations/"
                validateEndpoint="/dept-head/validate-application/"
                rejectEndpoint="/dept-head/reject-application/"
                downloadConventionEndpoint="co-dept"
                title="Conventions en attente"
                emptyMessage="Aucune convention en attente de validation"
              />
            )}

            {validationsTab === 'validated' && (
              <PendingValidationsList
                fetchEndpoint="/dept-head/validated-validations/"
                validateEndpoint="/dept-head/validate-application/"
                rejectEndpoint="/dept-head/reject-application/"
                downloadConventionEndpoint="co-dept"
                title="Conventions prêtes à signer"
                emptyMessage="Aucune convention prête à être signée"
              />
            )}
          </>
        )}

        {activeTab === 'team' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Équipe universitaire</h2>
              <p className="text-white/60">Visualisez les membres de votre université et leur statut en ligne</p>
            </div>
            <UniversityUsersStatus onStartPrivateChat={handleStartPrivateChat} />
          </div>
        )}
      </main>
      
      {/* Chat de groupe */}
      {user?.university && (
        <ChatWidget university={user.university} />
      )}
      
      {/* Chat privé */}
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
};

export default AdminDashboard;