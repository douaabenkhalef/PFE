import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, Trash2, Edit2, Save, X, CheckCircle, XCircle,
  Shield, Briefcase, Mail, Calendar, UserCheck, Clock, ArrowLeft,
  Search, User, Building2, FileText, UserCog, Activity, LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentDashboard.css';
import UserAvatar from '../components/UserAvatar';

const API = 'https://pfe-l31r.onrender.com/api';
const token = () => localStorage.getItem('access_token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

const PermissionCheckbox = ({ label, checked, onChange, description, disabled }) => (
  <label className={`flex items-start gap-3 p-3 bg-white/5 rounded-lg transition ${!disabled && 'cursor-pointer hover:bg-white/10'}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
    />
    <div>
      <span className="text-white text-sm font-medium">{label}</span>
      {description && <p className="text-white/40 text-xs mt-0.5">{description}</p>}
    </div>
  </label>
);

const HiringManagerCard = ({ manager, onUpdatePermissions, onDelete }) => {
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
              <Briefcase className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{manager.username}</h3>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={12} className="text-white/40" />
                <span className="text-white/60 break-all">{manager.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">
              <UserCheck size={10} className="inline mr-1" />
              Active
            </span>
            <span className="text-white/40 text-xs flex items-center gap-1">
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
            label="Manage applications"
            description="View and respond to student applications"
            checked={permissions.can_manage_applications}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_manage_applications: e.target.checked }))}
            disabled={!isEditing}
          />

          <PermissionCheckbox
            label="Create offers"
            description="Publish new internship offers"
            checked={permissions.can_create_offer}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_create_offer: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Modify offers"
            description="Modify existing offers"
            checked={permissions.can_modify_offer}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_modify_offer: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Delete offers"
            description="Delete internship offers"
            checked={permissions.can_delete_offer}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_delete_offer: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Manage company profile"
            description="Modify company information"
            checked={permissions.can_manage_company_profile}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_manage_company_profile: e.target.checked }))}
            disabled={!isEditing}
          />
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Confirm deletion</h3>
            <p className="text-white/70 mb-6">
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

const PendingManagerCard = ({ manager, onApprove, onReject, processing }) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
    <div className="p-5 border-b border-white/10">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{manager.username}</h3>
            <div className="flex items-center gap-2 text-sm">
              <Mail size={12} className="text-white/40" />
              <span className="text-white/60 break-all">{manager.email}</span>
            </div>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300">
          Pending
        </span>
      </div>
    </div>
    <div className="p-5">
      <p className="text-white/60 text-sm mb-4">This user has requested to become a Hiring Manager.</p>
      <div className="flex gap-3">
        <button
          onClick={() => onApprove(manager.id, manager.username)}
          disabled={processing}
          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle size={16} /> Approve
        </button>
        <button
          onClick={() => onReject(manager.id, manager.username)}
          disabled={processing}
          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <XCircle size={16} /> Reject
        </button>
      </div>
    </div>
  </div>
);

export default function ManageHiringManagers() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [activeManagers, setActiveManagers] = useState([]);
  const [pendingManagers, setPendingManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const isCompanyManager = user?.sub_role === 'company_manager';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activeRes, pendingRes] = await Promise.all([
        fetch(`${API}/company/approved-hiring-managers/`, { headers: authHeaders() }),
        fetch(`${API}/company/pending-hiring-managers/`, { headers: authHeaders() })
      ]);
      const activeData = await activeRes.json();
      const pendingData = await pendingRes.json();
      if (activeData.success) setActiveManagers(activeData.hiring_managers);
      if (pendingData.success) setPendingManagers(pendingData.hiring_managers);
    } catch (err) {
      console.error(err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdatePermissions = async (userId, permissions) => {
    try {
      const res = await fetch(`${API}/company/hiring-managers/${userId}/permissions/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(permissions)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Permissions updated successfully');
        fetchData();
      } else {
        toast.error(data.error || 'Error updating permissions');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  const handleDelete = async (userId, username) => {
    try {
      const res = await fetch(`${API}/company/hiring-managers/${userId}/delete/`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Hiring manager ${username} deleted successfully`);
        fetchData();
      } else {
        toast.error(data.error || 'Error deleting user');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  const handleApprove = async (userId, username) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/company/approve-hiring-manager/${userId}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${username} has been approved.`);
        fetchData();
      } else {
        toast.error(data.message || "Approval failed.");
      }
    } catch {
      toast.error("Connection error.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (userId, username) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/company/reject-hiring-manager/${userId}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${username} has been rejected.`);
        fetchData();
      } else {
        toast.error(data.message || "Rejection failed.");
      }
    } catch {
      toast.error("Connection error.");
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - stays on left, no blur overlay */}
      <div className="w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full fixed left-0 top-0 overflow-y-auto border-r border-purple-500/30">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              <UserAvatar />   
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.full_name || user?.email}</p>
              <p className="text-white/50 text-xs">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div>
            <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control & Management</p>
            <div className="space-y-1">
              <Link to="/company/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <User size={16} /> My Profile
              </Link>
              <Link to="/company/company-profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <Building2 size={16} /> Company Profile
              </Link>
              <Link to="/company/manage-offers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <Briefcase size={16} /> Manage Offers
              </Link>
              <Link to="/company/applications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <FileText size={16} /> Student Applications
              </Link>
              {isCompanyManager && (
                <>
                  <Link to="/company-manager/manage-hiring-managers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30">
                    <UserCog size={16} /> Manage Hiring Managers
                  </Link>
                  <Link to="/company-manager/activity-logs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                    <Activity size={16} /> Control HM Activity
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/company-manager/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Manage Hiring Managers</h1>
            <p className="text-white/60 text-sm">
              Manage permissions of approved hiring managers and approve/reject pending requests.
            </p>
          </div>

          <div className="flex gap-4 mb-6 border-b border-white/20 flex-wrap">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-2 px-4 text-sm font-semibold transition ${
                activeTab === 'active' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60 hover:text-white'
              }`}
            >
              Active ({activeManagers.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-2 px-4 text-sm font-semibold transition ${
                activeTab === 'pending' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60 hover:text-white'
              }`}
            >
              Pending ({pendingManagers.length})
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : activeTab === 'active' ? (
            activeManagers.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No active hiring managers</h3>
                <p className="text-white/60">No hiring managers have been approved for your company yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeManagers.map(manager => (
                  <HiringManagerCard
                    key={manager.id}
                    manager={manager}
                    onUpdatePermissions={handleUpdatePermissions}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )
          ) : (
            pendingManagers.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <Clock className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No pending requests</h3>
                <p className="text-white/60">All requests have been processed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingManagers.map(manager => (
                  <PendingManagerCard
                    key={manager.id}
                    manager={manager}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    processing={processing}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <style>{`
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .w-64 {
            width: 220px !important;
          }
          .ml-64 {
            margin-left: 220px !important;
          }
          .max-w-5xl {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          .flex.justify-between.items-start {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.75rem;
          }
          .p-5 {
            padding: 1rem;
          }
          .text-3xl.font-bold {
            font-size: 1.5rem;
          }
        }
        
        @media (max-width: 580px) {
          .w-64 {
            width: 200px !important;
          }
          .ml-64 {
            margin-left: 200px !important;
          }
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
          .px-4 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .px-4.py-2 {
            padding: 0.4rem 0.75rem;
            font-size: 0.7rem;
          }
          .break-all {
            word-break: break-all;
          }
        }
        
        @media (max-width: 480px) {
          .w-64 {
            width: 180px !important;
          }
          .ml-64 {
            margin-left: 180px !important;
          }
          .text-2xl.sm\\:text-3xl {
            font-size: 1.1rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .w-64 {
          background: linear-gradient(180deg, #ffffff 0%, #f5f0ff 100%) !important;
          border-right: 1px solid rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .text-white,
        body.light-mode .text-white\\/70,
        body.light-mode .text-white\\/80,
        body.light-mode .text-white\\/90 {
          color: #1a1a2e !important;
        }
        body.light-mode .text-white\\/50,
        body.light-mode .text-white\\/60,
        body.light-mode .text-white\\/40,
        body.light-mode .text-white\\/30 {
          color: #666 !important;
        }
        body.light-mode .text-purple-300\\/60 {
          color: #8D23D4 !important;
          opacity: 0.7;
        }
        body.light-mode .bg-white\\/10 {
          background: rgba(141, 35, 212, 0.08) !important;
        }
        body.light-mode .bg-white\\/10.backdrop-blur-lg {
          background: rgba(255, 255, 255, 0.95) !important;
        }
        body.light-mode .border-white\\/10,
        body.light-mode .border-white\\/20 {
          border-color: rgba(141, 35, 212, 0.15) !important;
        }
        body.light-mode .bg-purple-600\\/30 {
          background: rgba(141, 35, 212, 0.15) !important;
        }
        body.light-mode .text-purple-300 {
          color: #8D23D4 !important;
        }
        body.light-mode .hover\\:bg-white\\/10:hover {
          background: rgba(141, 35, 212, 0.1) !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
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
        body.light-mode .bg-yellow-500\\/20 {
          background: rgba(217, 119, 6, 0.1) !important;
        }
        body.light-mode .text-yellow-300 {
          color: #d97706 !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] {
          background: white !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] .text-white {
          color: #1a1a2e !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] .text-white\\/70 {
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
        body.light-mode input {
          color: #1a1a2e !important;
        }
        body.light-mode input::placeholder {
          color: #999 !important;
        }
      `}</style>
    </div>
  );
}