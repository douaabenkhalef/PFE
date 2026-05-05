// frontend/src/page/CompanyPublicProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Save, X, Edit2, Lock, Mail, Phone, MapPin,
  Globe, Linkedin, Camera, Image, Loader2, Twitter,
  Briefcase, FileText, UserCog, Activity, User, Search, LogOut, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentDashboard.css';
import UserAvatar from '../components/UserAvatar';

const API = 'https://pfe-l31r.onrender.com/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

export default function CompanyPublicProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isCompanyManager = user?.sub_role === 'company_manager';
   
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    website: '',
    industry: '',
    phone: '',
    contact_email: '',
    linkedin: '',
    twitter: '',
    logo: '',
    cover_picture: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/company/profile/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setForm({
          name: data.profile.name || '',
          description: data.profile.description || '',
          location: data.profile.location || '',
          website: data.profile.website || '',
          industry: data.profile.industry || '',
          phone: data.profile.phone || '',
          contact_email: data.profile.contact_email || '',
          linkedin: data.profile.linkedin || '',
          twitter: data.profile.twitter || '',
          logo: data.profile.logo || '',
          cover_picture: data.profile.cover_picture || '',
        });
        setCanEdit(data.profile.can_edit || false);
      } else {
        toast.error(data.error || 'Erreur de chargement');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/company/profile/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profil entreprise mis à jour');
        setProfile({ ...profile, ...form });
        setIsEditing(false);
        window.dispatchEvent(new Event('companyProfileUpdated'));
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = () => {
    if (!canEdit) {
      toast.error("Vous n'avez pas la permission de modifier le profil entreprise.");
      return;
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        name: profile.name || '',
        description: profile.description || '',
        location: profile.location || '',
        website: profile.website || '',
        industry: profile.industry || '',
        phone: profile.phone || '',
        contact_email: profile.contact_email || '',
        linkedin: profile.linkedin || '',
        twitter: profile.twitter || '',
        logo: profile.logo || '',
        cover_picture: profile.cover_picture || '',
      });
    }
    setIsEditing(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const inputClass = (editable) =>
    `w-full bg-white/10 border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none ${
      editable
        ? 'border-white/20 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-white/40'
        : 'border-transparent text-slate-300 cursor-default'
    }`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full fixed left-0 top-0 overflow-y-auto border-r border-purple-500/30">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                 <UserAvatar /> 
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.full_name || user?.email}</p>
              <p className="text-white/50 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text" placeholder="Search"
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control & Management</p>
          <div className="space-y-1">
            <button onClick={() => navigate('/company/profile')} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 w-full text-left">
              <User size={16} /> My Profile
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30 w-full text-left">
              <Building2 size={16} /> Company Profile
            </button>
            <button onClick={() => navigate('/company/manage-offers')} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 w-full text-left">
              <Briefcase size={16} /> Manage Offers
            </button>
            <button onClick={() => navigate('/company/applications')} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 w-full text-left">
              <FileText size={16} /> Student Applications
            </button>
            {isCompanyManager && (
              <>
                <button onClick={() => navigate('/company-manager/manage-hiring-managers')} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 w-full text-left">
                  <UserCog size={16} /> Manage Hiring Managers
                </button>
                <button onClick={() => navigate('/company-manager/activity-logs')} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 w-full text-left">
                  <Activity size={16} /> Control HM Activity
                </button>
              </>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition">
            <LogOut size={16} /><span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1 min-h-screen py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate(isCompanyManager ? '/company-manager/dashboard' : '/company/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            ← Retour au tableau de bord
          </button>

          {!canEdit && user?.sub_role === 'hiring_manager' && (
            <div className="flex items-center gap-3 bg-red-500/10 backdrop-blur-lg border border-red-500/30 rounded-xl p-4 mb-6">
              <Lock className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-red-300 font-medium">Permission refusée</p>
                <p className="text-red-400/80 text-sm">Vous ne pouvez pas modifier le profil entreprise. Seul le Company Manager peut vous accorder cette permission.</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Cover + Logo Header */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              {/* Cover picture */}
              <div className="relative h-48 bg-gradient-to-r from-purple-900/40 to-indigo-900/40">
                {form.cover_picture ? (
                  <img src={form.cover_picture} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <Image size={48} />
                  </div>
                )}
                {isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer group">
                    <div className="flex flex-col items-center gap-2 text-white opacity-0 group-hover:opacity-100 transition">
                      <Camera size={24} />
                      <span className="text-sm font-medium">Changer la photo de couverture</span>
                    </div>
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => setForm(prev => ({ ...prev, cover_picture: ev.target.result }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Logo + Name row */}
              <div className="px-6 pb-6 pt-0">
                <div className="flex items-end gap-5 -mt-10 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl border-4 border-white/20 overflow-hidden bg-white/10 shadow-xl">
                      {form.logo ? (
                        <img src={form.logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-500/20">
                          <Building2 size={32} className="text-purple-400" />
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl cursor-pointer">
                        <Camera size={16} className="text-white" />
                        <input
                          type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => setForm(prev => ({ ...prev, logo: ev.target.result }));
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-between pt-10">
                    <div>
                      {isEditing ? (
                        <input
                          value={form.name}
                          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                          className="text-2xl font-bold bg-transparent border-b border-purple-500 text-white focus:outline-none w-full"
                          placeholder="Nom de l'entreprise"
                        />
                      ) : (
                        <h1 className="text-2xl font-bold text-white">{form.name || 'Entreprise'}</h1>
                      )}
                      <p className="text-purple-400 text-sm mt-1">
                        {isCompanyManager ? 'Company Manager' : 'Hiring Manager'} · {user?.company_name || user?.email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <button
                          onClick={handleEditClick}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                            canEdit ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-white/10 text-white/50 cursor-not-allowed'
                          }`}
                        >
                          {canEdit ? <Edit2 size={15} /> : <Lock size={15} />}
                          {canEdit ? 'Modifier' : 'Accès limité'}
                        </button>
                      ) : (
                        <>
                          <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition">
                            <X size={15} /> Annuler
                          </button>
                          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-60">
                            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            Sauvegarder
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description + Contact Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Description */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 size={15} className="text-purple-400" />
                  À propos
                </h3>
                {isEditing ? (
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={5}
                    placeholder="Description de l'entreprise..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 resize-none"
                  />
                ) : (
                  <p className="text-white/70 text-sm leading-relaxed">
                    {form.description || <span className="text-white/40 italic">Aucune description</span>}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  {[
                    { icon: Briefcase, key: 'industry', label: "Secteur d'activité", type: 'text', placeholder: 'Tech, Finance, Santé...' },
                    { icon: MapPin, key: 'location', label: 'Adresse / Wilaya', type: 'text', placeholder: 'Alger, Constantine...' },
                  ].map(({ icon: Icon, key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-white/50 flex items-center gap-1 mb-1">
                        <Icon size={11} /> {label}
                      </label>
                      {isEditing ? (
                        <input
                          type={type}
                          value={form[key]}
                          onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className={inputClass(true)}
                        />
                      ) : (
                        <p className="text-white/70 text-sm">
                          {form[key] || <span className="text-white/40 italic">Non renseigné</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Mail size={15} className="text-purple-400" />
                  Informations de contact
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: Mail,     key: 'contact_email', label: 'Email de contact', type: 'email', placeholder: 'contact@entreprise.com' },
                    { icon: Phone,    key: 'phone',         label: 'Téléphone',        type: 'tel',   placeholder: '+213 5xx xxx xxx' },
                    { icon: Globe,    key: 'website',       label: 'Site web',         type: 'url',   placeholder: 'https://...' },
                    { icon: Linkedin, key: 'linkedin',      label: 'LinkedIn',         type: 'url',   placeholder: 'https://linkedin.com/company/...' },
                    { icon: Twitter,  key: 'twitter',       label: 'Twitter / X',      type: 'url',   placeholder: 'https://twitter.com/...' },
                  ].map(({ icon: Icon, key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-white/50 flex items-center gap-1 mb-1">
                        <Icon size={11} /> {label}
                      </label>
                      {isEditing ? (
                        <input
                          type={type}
                          value={form[key]}
                          onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className={inputClass(true)}
                        />
                      ) : (
                        <p className="text-white/70 text-sm">
                          {form[key] ? (
                            type === 'url'
                              ? <a href={form[key]} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">{form[key]}</a>
                              : form[key]
                          ) : <span className="text-white/40 italic">Non renseigné</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {!isEditing && form.cover_picture && (
              <div className="flex items-center gap-2 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300">
                <CheckCircle size={15} />
                La photo de couverture s'affiche sur le côté droit des tableaux de bord Company et Company Manager.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}