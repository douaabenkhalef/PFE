// frontend/src/page/ManageCoDeptHeads.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Trash2, Edit2, Save, X, CheckCircle, XCircle,
  ArrowLeft, Shield, GraduationCap, Mail, Calendar, Settings,
  UserCheck, FileText, Signature, Stamp, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminSidebarInline } from '../components/AdminSidebar';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';
import './StudentDashboard.css';

const API = 'https://pfe-l31r.onrender.com/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const PermissionCheckbox = ({ label, checked, onChange, description, disabled }) => (
  <label className={`flex items-start gap-3 p-3 bg-slate-800/60 rounded-lg transition ${!disabled && 'cursor-pointer hover:bg-slate-800'}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
    />
    <div>
      <span className="text-white text-sm font-medium">{label}</span>
      {description && <p className="text-slate-400 text-xs mt-0.5">{description}</p>}
    </div>
  </label>
);

const CoDeptHeadCard = ({ manager, onUpdatePermissions, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [permissions, setPermissions] = useState(manager.permissions);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onUpdatePermissions(manager.id, permissions);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPermissions(manager.permissions);
    setIsEditing(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{manager.username}</h3>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={12} className="text-slate-400" />
                <span className="text-slate-400">{manager.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">
              <UserCheck size={10} className="inline mr-1" />
              Active
            </span>
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Calendar size={10} />
              {manager.created_at}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <Shield size={14} />
            Permissions
          </h4>
          {!isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition"
              >
                <Save size={14} />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <PermissionCheckbox
            label="Manage conventions"
            description="Validate or reject internship agreements"
            checked={permissions.can_manage_conventions}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_manage_conventions: e.target.checked }))}
            disabled={!isEditing}
          />
          
          <PermissionCheckbox
            label="Add signature"
            description="Sign internship agreements"
            checked={permissions.can_add_signature}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_add_signature: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Add stamp"
            description="Apply official university stamp"
            checked={permissions.can_add_stamp}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_add_stamp: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Manage university profile"
            description="Modify university information"
            checked={permissions.can_manage_university_profile}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_manage_university_profile: e.target.checked }))}
            disabled={!isEditing}
          />
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Confirm deletion</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <strong className="text-purple-400">{manager.username}</strong>?<br/>
              This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => onDelete(manager.id, manager.username)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-semibold transition"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PendingCoDeptCard = ({ head, onApprove, onReject, processing }) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
    <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
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
        <span className="break-all">{head.email}</span>
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
        onClick={() => onApprove(head.id, head.username)} 
        disabled={processing} 
        className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <CheckCircle className="w-4 h-4" /> Approve
      </button>
      <button 
        onClick={() => onReject(head.id, head.username)} 
        disabled={processing} 
        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <XCircle className="w-4 h-4" /> Reject
      </button>
    </div>
  </div>
);

export default function ManageCoDeptHeads() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [coDeptHeads, setCoDeptHeads] = useState([]);
  const [pendingCoDeptHeads, setPendingCoDeptHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  const fetchCoDeptHeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/approved-co-dept-heads/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setCoDeptHeads(data.co_dept_heads);
      } else {
        toast.error(data.error || 'Error loading data');
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCoDeptHeads = async () => {
    try {
      const response = await fetch(`${API}/admin/pending-co-dept-heads/`, { headers: authHeaders() });
      const data = await response.json();
      if (data.success) {
        setPendingCoDeptHeads(data.co_dept_heads);
      }
    } catch (error) {
      toast.error("Connection error");
    }
  };

  useEffect(() => {
    if (activeTab === 'active') fetchCoDeptHeads();
    else fetchPendingCoDeptHeads();
  }, [activeTab]);

  const handleUpdatePermissions = async (userId, permissions) => {
    try {
      const res = await fetch(`${API}/admin/co-dept-heads/${userId}/permissions/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(permissions)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Permissions updated successfully');
        fetchCoDeptHeads();
      } else {
        toast.error(data.error || 'Error updating permissions');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  const handleDelete = async (userId, username) => {
    try {
      const res = await fetch(`${API}/admin/co-dept-heads/${userId}/delete/`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Co Department Head ${username} deleted successfully`);
        fetchCoDeptHeads();
      } else {
        toast.error(data.error || 'Error deleting user');
      }
    } catch (err) {
      toast.error('Connection error');
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
        toast.success(`Co Department Head ${headName} has been approved`);
        fetchPendingCoDeptHeads();
      } else {
        toast.error(data.message || "Error during approval");
      }
    } catch (error) {
      toast.error("Connection error");
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
        toast.success(`Co Department Head ${headName} has been rejected and deleted`);
        fetchPendingCoDeptHeads();
        const currentUserEmail = localStorage.getItem('user_email');
        if (data.deleted && currentUserEmail === headName) {
          toast.info("Your account has been deleted. You will be logged out.");
          setTimeout(() => {
            logout();
            navigate("/login");
          }, 2000);
        }
      } else {
        toast.error(data.message || "Error during rejection");
      }
    } catch (error) {
      toast.error("Connection error");
    } finally {
      setProcessing(false);
    }
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
      <AdminSidebarInline user={user} onLogout={handleLogout} />
      
      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button to admin dashboard */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Manage Co Department Heads</h2>
            <p className="text-white/60">
              Manage permissions of approved co department heads or approve new requests.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-white/20 pb-2 flex-wrap">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'active'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Active Co Dept Heads
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'pending'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Pending Requests
              {pendingCoDeptHeads.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCoDeptHeads.length}</span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : activeTab === 'active' ? (
            coDeptHeads.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No active co department heads</h3>
                <p className="text-white/60">No co department heads have been approved for your university yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coDeptHeads.map(manager => (
                  <CoDeptHeadCard
                    key={manager.id}
                    manager={manager}
                    onUpdatePermissions={handleUpdatePermissions}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )
          ) : (
            pendingCoDeptHeads.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No pending requests</h3>
                <p className="text-white/60">All co department heads have been processed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingCoDeptHeads.map(head => (
                  <PendingCoDeptCard
                    key={head.id}
                    head={head}
                    onApprove={handleApproveCoDept}
                    onReject={handleRejectCoDept}
                    processing={processing}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Chat */}
      <ChatWidget university={user?.university || "University"} />
      {privateChatOpen && selectedChatUser && (
        <PrivateChat
          university={user?.university || "University"}
          currentUser={user}
          targetUser={selectedChatUser}
          onClose={handleClosePrivateChat}
        />
      )}

      <style>{`
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .ml-64 {
            margin-left: 220px !important;
          }
          .max-w-4xl {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          .flex.justify-between.items-start {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.75rem;
          }
          .grid-cols-1.md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          .p-5 {
            padding: 1rem;
          }
        }
        
        @media (max-width: 580px) {
          .ml-64 {
            margin-left: 200px !important;
          }
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
          .text-2xl.font-bold {
            font-size: 1.2rem;
          }
          .px-4.py-2 {
            padding: 0.4rem 0.75rem;
            font-size: 0.7rem;
          }
        }
        
        @media (max-width: 480px) {
          .ml-64 {
            margin-left: 180px !important;
          }
          .break-all {
            word-break: break-all;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .bg-white\\/10 {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .bg-white\\/10.backdrop-blur-lg {
          background: rgba(255, 255, 255, 0.95) !important;
        }
        body.light-mode .text-white,
        body.light-mode .text-white\\/70,
        body.light-mode .text-white\\/80,
        body.light-mode .text-white\\/90 {
          color: #1a1a2e !important;
        }
        body.light-mode .text-white\\/50,
        body.light-mode .text-white\\/60,
        body.light-mode .text-slate-400,
        body.light-mode .text-slate-500 {
          color: #666 !important;
        }
        body.light-mode .border-white\\/20 {
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-slate-800\\/60 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .bg-slate-800\\/60 .text-white {
          color: #1a1a2e !important;
        }
        body.light-mode .bg-slate-800\\/60 .text-slate-400 {
          color: #777 !important;
        }
        body.light-mode .bg-purple-500\\/20 {
          background: rgba(141, 35, 212, 0.1) !important;
        }
        body.light-mode .text-purple-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .bg-green-500\\/20 {
          background: rgba(5, 150, 105, 0.1) !important;
        }
        body.light-mode .text-green-300 {
          color: #059669 !important;
        }
        body.light-mode .bg-blue-500\\/20 {
          background: rgba(37, 99, 235, 0.1) !important;
        }
        body.light-mode .text-blue-300 {
          color: #2563eb !important;
        }
        body.light-mode .bg-red-500\\/20 {
          background: rgba(220, 38, 38, 0.1) !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
        }
        body.light-mode .bg-yellow-500 {
          background: #d97706 !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] {
          background: white !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] .text-white {
          color: #1a1a2e !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] .text-slate-300 {
          color: #555 !important;
        }
        body.light-mode .bg-slate-700 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .bg-slate-700:hover {
          background: rgba(0, 0, 0, 0.1) !important;
        }
        body.light-mode .bg-red-600 {
          background: #dc2626 !important;
        }
        body.light-mode .bg-purple-600 {
          background: #8D23D4 !important;
        }
      `}</style>
    </div>
  );
}