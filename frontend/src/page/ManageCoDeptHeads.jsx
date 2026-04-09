// frontend/src/page/ManageHiringManagers.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Trash2, Edit2, Save, X, CheckCircle, XCircle,
  ArrowLeft, Shield, Briefcase, Mail, Calendar, Settings,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:8000/api';
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
                <Mail size={12} className="text-slate-400" />
                <span className="text-slate-400">{manager.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">
              <UserCheck size={10} className="inline mr-1" />
              Actif
            </span>
            <span className="text-slate-500 text-xs flex items-center gap-1">
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

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h3>
            <p className="text-slate-300 mb-6">
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

export default function ManageHiringManagers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hiringManagers, setHiringManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHiringManagers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/company/approved-hiring-managers/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setHiringManagers(data.hiring_managers);
        console.log("Hiring managers chargés:", data.hiring_managers.length);
      } else {
        toast.error(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      console.error("Erreur:", err);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHiringManagers();
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
        fetchHiringManagers();
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
        fetchHiringManagers();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/company-manager/dashboard')}
                className="flex items-center gap-2 text-white/70 hover:text-white transition"
              >
                <ArrowLeft size={18} />
                Retour
              </button>
              <span className="text-white/30">|</span>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl font-bold text-white">Gestion des Hiring Managers</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.company_name}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">Company Manager</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Hiring Managers Actifs</h2>
          <p className="text-white/60">
            Gérez les permissions des hiring managers approuvés de votre entreprise.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        ) : hiringManagers.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
            <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Aucun hiring manager actif</h3>
            <p className="text-white/60">Aucun hiring manager n'a encore été approuvé pour votre entreprise.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {hiringManagers.map(manager => (
              <HiringManagerCard
                key={manager.id}
                manager={manager}
                onUpdatePermissions={handleUpdatePermissions}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}