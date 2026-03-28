// frontend/src/page/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Mail, User, Shield, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCoDeptHeads, setPendingCoDeptHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingCoDeptHeads();
  }, []);

  const fetchPendingCoDeptHeads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("http://localhost:8000/api/admin/pending-co-dept-heads/", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPendingCoDeptHeads(data.co_dept_heads);
      } else {
        toast.error("Erreur lors du chargement des demandes");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (headId, headName) => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`http://localhost:8000/api/admin/approve-co-dept-head/${headId}/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
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

  const handleReject = async (headId, headName) => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`http://localhost:8000/api/admin/reject-co-dept-head/${headId}/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Co Department Head ${headName} a été refusé`);
        fetchPendingCoDeptHeads();
      } else {
        toast.error(data.message || "Erreur lors du refus");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setProcessing(false);
    }
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

  // Vérifier si c'est un Department Head
  if (user?.sub_role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Accès non autorisé</h1>
          <p className="text-white/60">Seul le Department Head peut accéder à ce dashboard.</p>
          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Department Head Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name || user?.email}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">
                {user?.university || "Université"}
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Co Department Heads en attente</h2>
          <p className="text-white/60">Approuvez ou refusez les demandes d'inscription des Co Department Heads</p>
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
              <div
                key={head.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all"
              >
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
                  {head.wilaya && (
                    <p className="text-white/60 text-sm flex items-center gap-2">
                      📍 {head.wilaya}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleApprove(head.id, head.username)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approuver
                  </button>
                  <button
                    onClick={() => handleReject(head.id, head.username)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;