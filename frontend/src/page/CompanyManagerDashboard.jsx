import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Mail, User, Briefcase } from "lucide-react";

const CompanyManagerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingHiringManagers, setPendingHiringManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  useEffect(() => {
    fetchPendingHiringManagers();
  }, []);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchPendingHiringManagers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://localhost:8000/api/company/pending-hiring-managers/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPendingHiringManagers(data.hiring_managers);
      } else {
        showMsg("error", "Failed to load pending hiring managers.");
      }
    } catch {
      showMsg("error", "Server connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (managerId, managerName) => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `http://localhost:8000/api/company/approve-hiring-manager/${managerId}/`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        showMsg("success", `${managerName} has been approved.`);
        fetchPendingHiringManagers();
      } else {
        showMsg("error", data.message || "Approval failed.");
      }
    } catch {
      showMsg("error", "Server connection error.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (managerId, managerName) => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `http://localhost:8000/api/company/reject-hiring-manager/${managerId}/`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        showMsg("success", `${managerName} has been rejected.`);
        fetchPendingHiringManagers();
      } else {
        showMsg("error", data.message || "Rejection failed.");
      }
    } catch {
      showMsg("error", "Server connection error.");
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900">
      {/* Navbar */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Company Manager Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Manage Offers button */}
              <Link
                to="/company/manage-offers"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-lg"
              >
                Manage Offers
              </Link>
              <span className="text-white/80">{user?.company_name}</span>
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
        {/* Inline message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border text-sm font-medium ${
              message.type === "success"
                ? "bg-green-500/15 border-green-500 text-green-300"
                : "bg-red-500/15 border-red-500 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Pending Hiring Managers</h2>
          <p className="text-white/60">Approve or reject Hiring Manager registration requests.</p>
        </div>

        {pendingHiringManagers.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No pending requests</h3>
            <p className="text-white/60">All hiring managers have been processed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingHiringManagers.map((manager) => (
              <div
                key={manager.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{manager.username}</h3>
                      <p className="text-white/60 text-sm">{manager.company_name}</p>
                    </div>
                  </div>
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
                  <Mail className="w-4 h-4" />
                  <span>{manager.email}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(manager.id, manager.username)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(manager.id, manager.username)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
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

export default CompanyManagerDashboard;