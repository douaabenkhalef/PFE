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

const API = 'http://localhost:8000/api';
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
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{manager.username}</h3>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={12} className="text-white/40" />
                <span className="text-white/60">{manager.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">
              <UserCheck size={10} className="inline mr-1" />
              Actif
            </span>
            <span className="text-white/40 text-xs flex items-center gap-1">
              <Calendar size={10} />
              {manager.created_at}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
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
            label="Gérer les candidatures"
            description="Voir et répondre aux candidatures des étudiants"
            checked={permissions.can_manage_applications}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_manage_applications: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Gérer les Hiring Managers"
            description="Ajouter, modifier ou supprimer des hiring managers"
            checked={permissions.can_manage_hiring_managers}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_manage_hiring_managers: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Créer des offres"
            description="Publier de nouvelles offres de stage"
            checked={permissions.can_create_offer}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_create_offer: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Modifier des offres"
            description="Modifier les offres existantes"
            checked={permissions.can_modify_offer}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_modify_offer: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Supprimer des offres"
            description="Supprimer les offres de stage"
            checked={permissions.can_delete_offer}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_delete_offer: e.target.checked }))}
            disabled={!isEditing}
          />
          <PermissionCheckbox
            label="Gérer le profil entreprise"
            description="Modifier les informations de l'entreprise"
            checked={permissions.can_manage_company_profile}
            onChange={(e) => setPermissions(prev => ({ ...prev, can_manage_company_profile: e.target.checked }))}
            disabled={!isEditing}
          />
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h3>
            <p className="text-white/70 mb-6">
              Êtes-vous sûr de vouloir supprimer <strong className="text-purple-400">{manager.username}</strong> ?<br/>
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => onDelete(manager.id, manager.username)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-semibold transition"
              >
                Supprimer
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition"
              >
                Annuler
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
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{manager.username}</h3>
            <div className="flex items-center gap-2 text-sm">
              <Mail size={12} className="text-white/40" />
              <span className="text-white/60">{manager.email}</span>
            </div>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300">
          En attente
        </span>
      </div>
    </div>
    <div className="p-5">
      <p className="text-white/60 text-sm mb-4">Cet utilisateur a demandé à devenir Hiring Manager.</p>
      <div className="flex gap-3">
        <button
          onClick={() => onApprove(manager.id, manager.username)}
          disabled={processing}
          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle size={16} /> Approuver
        </button>
        <button
          onClick={() => onReject(manager.id, manager.username)}
          disabled={processing}
          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <XCircle size={16} /> Rejeter
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
  const initials = (user?.full_name || user?.email || "U")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

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
      toast.error('Erreur de connexion');
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
        toast.success('Permissions mises à jour avec succès');
        fetchData();
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
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
        toast.success(`Hiring manager ${username} supprimé avec succès`);
        fetchData();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
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
        toast.success(`${username} a été approuvé.`);
        fetchData();
      } else {
        toast.error(data.message || "Échec de l'approbation.");
      }
    } catch {
      toast.error("Erreur de connexion.");
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
        toast.success(`${username} a été rejeté.`);
        fetchData();
      } else {
        toast.error(data.message || "Échec du rejet.");
      }
    } catch {
      toast.error("Erreur de connexion.");
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
              {initials}
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
                <Briefcase size={16} /> Manage offers
              </Link>
              <Link to="/company/applications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <FileText size={16} /> Student Application
              </Link>
              {isCompanyManager && (
                <>
                  <Link to="/company-manager/manage-hiring-managers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30">
                    <UserCog size={16} /> Manage Hiring Managers
                  </Link>
                  <Link to="/company-manager/activity-logs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                    <Activity size={16} /> Control Hiring Manager Activity
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

      {/* Main content area - no extra background classes, uses CSS radial gradient */}
      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/company-manager/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Gestion des Hiring Managers</h1>
            <p className="text-white/60">
              Gérez les permissions des hiring managers approuvés et approuvez/rejetez les demandes en attente.
            </p>
          </div>

          <div className="flex gap-4 mb-6 border-b border-white/20">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-2 px-4 text-sm font-semibold transition ${
                activeTab === 'active' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60 hover:text-white'
              }`}
            >
              Actifs ({activeManagers.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-2 px-4 text-sm font-semibold transition ${
                activeTab === 'pending' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60 hover:text-white'
              }`}
            >
              En attente ({pendingManagers.length})
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
                <h3 className="text-xl font-semibold text-white mb-2">Aucun hiring manager actif</h3>
                <p className="text-white/60">Aucun hiring manager n'a encore été approuvé pour votre entreprise.</p>
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
                <h3 className="text-xl font-semibold text-white mb-2">Aucune demande en attente</h3>
                <p className="text-white/60">Toutes les demandes ont été traitées.</p>
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
    </div>
  );
}