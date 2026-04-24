// frontend/src/page/UniversityProfile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Upload, Save, X, Plus, Trash2, ArrowLeft,
  Mail, Phone, MapPin, Globe, Linkedin, Edit2, Lock,
  Building2, BookOpen, Camera, Image, CheckCircle, Loader2, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminSidebarInline } from '../components/AdminSidebar';
import ChatWidget from '../components/ChatWidget';
import './StudentDashboard.css'; // provides radial gradient background

const API = 'http://localhost:8000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

// ==================== No Permission Banner (glassmorphic) ====================
const NoPermissionBanner = ({ message }) => (
  <div className="flex items-center gap-3 bg-red-500/10 backdrop-blur-lg border border-red-500/30 rounded-xl p-4 mb-6">
    <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
    <div>
      <p className="text-red-300 font-medium">Permission refusée</p>
      <p className="text-red-400/80 text-sm">{message}</p>
    </div>
  </div>
);

// ==================== Faculty Tag (glass style) ====================
const FacultyTag = ({ faculty, onRemove, canEdit }) => (
  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-purple-500/30 rounded-lg px-3 py-1.5">
    <BookOpen size={13} className="text-purple-400" />
    <span className="text-purple-200 text-sm">{faculty}</span>
    {canEdit && (
      <button onClick={() => onRemove(faculty)} className="text-purple-400/60 hover:text-red-400 transition ml-1">
        <X size={13} />
      </button>
    )}
  </div>
);

// ==================== Image Upload Area (glass overlay) ====================
const ImageUploadArea = ({ label, value, onChange, canEdit, aspectClass = 'aspect-video', icon: Icon = Image }) => {
  const inputRef = useRef();
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result, file);
    reader.readAsDataURL(file);
  };

  return (
    <div className={`relative w-full ${aspectClass} rounded-xl overflow-hidden bg-white/10 border-2 border-dashed border-white/20 group`}>
      {value ? (
        <img src={value} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-white/40">
          <Icon size={32} />
          <span className="text-sm">{label}</span>
        </div>
      )}
      {canEdit && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2 text-white">
            <Upload size={20} />
            <span className="text-xs">Changer l'image</span>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
};

// ==================== Main Component ====================
export default function UniversityProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDeptHead = user?.sub_role === 'admin';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userPermissions, setUserPermissions] = useState(null);
  const [newFaculty, setNewFaculty] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    wilaya: '',
    website: '',
    linkedin: '',
    logo: '',
    cover_picture: '',
    faculties: [],
  });

  const canEdit = isDeptHead || (userPermissions?.can_manage_university_profile === true);

  useEffect(() => {
    fetchProfile();
    if (!isDeptHead) fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await fetch(`${API}/auth/me/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.user?.permissions) {
        setUserPermissions(data.user.permissions);
      }
    } catch {}
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/university-profile/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setForm({
          name: data.profile.name || '',
          description: data.profile.description || '',
          email: data.profile.email || '',
          phone: data.profile.phone || '',
          address: data.profile.address || '',
          wilaya: data.profile.wilaya || '',
          website: data.profile.website || '',
          linkedin: data.profile.linkedin || '',
          logo: data.profile.logo || '',
          cover_picture: data.profile.cover_picture || '',
          faculties: data.profile.faculties || [],
        });
      }
    } catch (err) {
      toast.error('Erreur de chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/university-profile/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profil université mis à jour');
        setProfile({ ...profile, ...form });
        setIsEditing(false);
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFaculty = () => {
    const trimmed = newFaculty.trim();
    if (!trimmed) return;
    if (form.faculties.includes(trimmed)) {
      toast.error('Cette faculté existe déjà');
      return;
    }
    setForm(prev => ({ ...prev, faculties: [...prev.faculties, trimmed] }));
    setNewFaculty('');
  };

  const handleRemoveFaculty = (faculty) => {
    setForm(prev => ({ ...prev, faculties: prev.faculties.filter(f => f !== faculty) }));
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleEditClick = () => {
    if (!canEdit) {
      toast.error("Vous n'avez pas la permission de modifier le profil université.");
      return;
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        name: profile.name || '',
        description: profile.description || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        wilaya: profile.wilaya || '',
        website: profile.website || '',
        linkedin: profile.linkedin || '',
        logo: profile.logo || '',
        cover_picture: profile.cover_picture || '',
        faculties: profile.faculties || [],
      });
    }
    setIsEditing(false);
  };

  const inputClass = (editable) =>
    `w-full bg-white/10 border rounded-xl px-4 py-2.5 text-sm transition focus:outline-none ${
      editable
        ? 'border-white/20 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-white/40'
        : 'border-transparent text-slate-300 cursor-default'
    }`;

  return (
    <div className="min-h-screen flex">
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      <div className="ml-64 flex-1 min-h-screen py-8 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Back button */}
          <button
            onClick={() => navigate(isDeptHead ? '/admin/dashboard' : '/co-dept-head/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>

          {/* Permission warning for co dept head without permission */}
          {!isDeptHead && userPermissions && !userPermissions.can_manage_university_profile && (
            <NoPermissionBanner message="Vous pouvez consulter le profil université, mais vous n'avez pas la permission de le modifier. Contactez le Department Head pour obtenir cet accès." />
          )}

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={36} className="animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="space-y-6">

              {/* ===== COVER + LOGO HEADER (glass card) ===== */}
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
                    {/* Logo */}
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl border-4 border-white/20 overflow-hidden bg-white/10 shadow-xl">
                        {form.logo ? (
                          <img src={form.logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-purple-500/20">
                            <GraduationCap size={32} className="text-purple-400" />
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

                    {/* Name & edit button */}
                    <div className="flex-1 flex items-center justify-between pt-10">
                      <div>
                        {isEditing ? (
                          <input
                            value={form.name}
                            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            className="text-2xl font-bold bg-transparent border-b border-purple-500 text-white focus:outline-none w-full"
                            placeholder="Nom de l'université"
                          />
                        ) : (
                          <h1 className="text-2xl font-bold text-white">{form.name || 'Université'}</h1>
                        )}
                        <p className="text-purple-400 text-sm mt-1">
                          {isDeptHead ? 'Département Head' : 'Co-Département Head'} · {user?.university}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <button
                            onClick={handleEditClick}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                              canEdit
                                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                : 'bg-white/10 text-white/50 cursor-not-allowed'
                            }`}
                          >
                            {canEdit ? <Edit2 size={15} /> : <Lock size={15} />}
                            {canEdit ? 'Modifier' : 'Accès limité'}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handleCancel}
                              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition"
                            >
                              <X size={15} /> Annuler
                            </button>
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
                            >
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

              {/* ===== GRID: Description + Contact (glass cards) ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Description */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookOpen size={15} className="text-purple-400" />
                    À propos
                  </h3>
                  {isEditing ? (
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={5}
                      placeholder="Description de l'université..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 resize-none"
                    />
                  ) : (
                    <p className="text-white/70 text-sm leading-relaxed">
                      {form.description || <span className="text-white/40 italic">Aucune description</span>}
                    </p>
                  )}
                </div>

                {/* Contact Info */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Mail size={15} className="text-purple-400" />
                    Informations de contact
                  </h3>
                  <div className="space-y-3">
                    {[
                      { icon: Mail, key: 'email', label: 'Email universitaire', type: 'email', placeholder: 'contact@universite.dz' },
                      { icon: Phone, key: 'phone', label: 'Numéro de téléphone', type: 'tel', placeholder: '+213 xx xxx xxxx' },
                      { icon: MapPin, key: 'address', label: 'Adresse', type: 'text', placeholder: '123 rue de l\'université...' },
                      { icon: MapPin, key: 'wilaya', label: 'Wilaya', type: 'text', placeholder: 'Alger' },
                      { icon: Globe, key: 'website', label: 'Site web', type: 'url', placeholder: 'https://universite.dz' },
                      { icon: Linkedin, key: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/school/...' },
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
                              (key === 'website' || key === 'linkedin')
                                ? <a href={form[key]} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">{form[key]}</a>
                                : form[key]
                            ) : (
                              <span className="text-white/40 italic">Non renseigné</span>
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ===== FACULTIES (glass card) ===== */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 size={15} className="text-purple-400" />
                  Facultés & Départements
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {form.faculties.length === 0 ? (
                    <p className="text-white/40 italic text-sm">Aucune faculté renseignée</p>
                  ) : (
                    form.faculties.map(f => (
                      <FacultyTag key={f} faculty={f} onRemove={handleRemoveFaculty} canEdit={isEditing} />
                    ))
                  )}
                </div>
                {isEditing && (
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newFaculty}
                      onChange={(e) => setNewFaculty(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFaculty()}
                      placeholder="Ajouter une faculté (ex: Informatique, Médecine...)"
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={handleAddFaculty}
                      className="flex items-center gap-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition"
                    >
                      <Plus size={15} /> Ajouter
                    </button>
                  </div>
                )}
              </div>

              {/* ===== Cover picture preview note (glass style) ===== */}
              {!isEditing && form.cover_picture && (
                <div className="flex items-center gap-2 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300">
                  <CheckCircle size={15} />
                  La photo de couverture s'affiche sur le côté droit des tableaux de bord Admin et Co-Dept Head.
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      <ChatWidget university={user?.university || 'Université'} />
    </div>
  );
}