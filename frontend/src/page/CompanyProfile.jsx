// frontend/src/pages/CompanyProfile.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Building2, Edit2, Save, X, Camera, 
  KeyRound, ShieldCheck, Smartphone, Key, Phone,
  Globe, MapPin, Briefcase, Eye, Lock, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import CompanySidebar from '../components/CompanySidebar';
import './CompanyProfile.css';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

const wilayas = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira",
  "Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda",
  "Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara",
  "Ouargla","Oran","El Bayadh","Illizi","Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf",
  "Tissemsilt","El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma",
  "Aïn Témouchent","Ghardaïa","Relizane",
];

const industries = [
  "Informatique & Technologies", "Finance & Assurance", "Marketing & Communication",
  "Commerce & Distribution", "Industrie & Production", "Construction & BTP",
  "Transport & Logistique", "Hôtellerie & Tourisme", "Santé & Social",
  "Éducation & Formation", "Consulting & Services", "Énergie & Environnement",
  "Agriculture & Agroalimentaire", "Médias & Divertissement", "Autre"
];

// OTP Verification Modal
const OTPVerificationModal = ({ email, onVerify, onClose, loading, title = "Vérification de l'email" }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (error) setError('');
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleSubmit = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Le code doit contenir exactement 6 chiffres');
      return;
    }
    setError('');
    await onVerify(fullCode);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-modal-header">
          <Smartphone size={20} />
          <h3>{title}</h3>
          <button className="profile-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="profile-modal-body">
          <p>Un code de vérification a été envoyé à :</p>
          <p className="text-purple-400 font-semibold">{email}</p>
          <p className="text-sm text-white/60 mt-2">Veuillez entrer le code à 6 chiffres reçu par email.</p>
          
          <div className="flex justify-center gap-3 mt-4">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                className="w-12 h-12 text-center text-2xl font-bold bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            ))}
          </div>
          
          {error && (
            <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
              {error}
            </div>
          )}
        </div>
        <div className="profile-modal-footer">
          <button className="profile-modal-cancel" onClick={onClose}>Annuler</button>
          <button className="profile-modal-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Vérification...' : 'Vérifier le code'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Password Change Component
const PasswordChangeWithOTP = ({ onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetEmailMasked, setTargetEmailMasked] = useState('');
  const [usingRecovery, setUsingRecovery] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);

  const handleInitiate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/initiate-password-change/`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTargetEmailMasked(data.target_email_masked);
        setUsingRecovery(data.using_recovery);
        setShowOTPModal(true);
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi du code');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-and-change-password/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          code: code,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Mot de passe changé avec succès !');
        if (onSuccess) onSuccess();
        onClose();
      } else if (data.code_invalid) {
        toast.error(data.error || 'Code invalide. Veuillez réessayer.');
      } else {
        toast.error(data.error || 'Erreur lors du changement');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
      setShowOTPModal(false);
    }
  };

  return (
    <>
      <div className="profile-password-form">
        <p className="text-white/70 text-sm mb-3 flex items-center gap-2">
          <KeyRound size={14} />
          Pour des raisons de sécurité, un code de vérification sera envoyé à {usingRecovery ? 'votre email de récupération' : 'votre email principal'}.
        </p>
        
        <input 
          type="password" 
          placeholder="Nouveau mot de passe" 
          value={newPassword} 
          onChange={(e) => setNewPassword(e.target.value)} 
          className="profile-edit-input" 
        />
        <input 
          type="password" 
          placeholder="Confirmer le nouveau mot de passe" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          className="profile-edit-input" 
        />
        
        <div className="profile-password-actions">
          <button 
            onClick={handleInitiate} 
            disabled={loading || !newPassword || newPassword !== confirmPassword}
            className="profile-save-password-btn"
          >
            {loading ? 'Envoi...' : 'Envoyer le code'}
          </button>
          <button onClick={onClose} className="profile-cancel-password-btn">
            Annuler
          </button>
        </div>
      </div>

      {showOTPModal && (
        <OTPVerificationModal
          email={targetEmailMasked}
          onVerify={handleVerify}
          onClose={() => {
            setShowOTPModal(false);
            onClose();
          }}
          loading={loading}
          title="Vérification pour changement de mot de passe"
        />
      )}
    </>
  );
};

export default function CompanyProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [visibility, setVisibility] = useState({
    email_visible: true,
    phone_visible: true,
    location_visible: true,
    website_visible: true,
    industry_visible: true,
    description_visible: true,
    profile_public: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('public');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Security states
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showRecoveryOTPModal, setShowRecoveryOTPModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [pendingRecoveryEmail, setPendingRecoveryEmail] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [recoveryEmailAdded, setRecoveryEmailAdded] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imageError, setImageError] = useState(false);

  const isCompanyManager = user?.sub_role === 'company_manager';
  const isOwner = true;

  const logoInputRef = React.useRef(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const userRes = await fetch(`${API}/auth/me/`, { headers: authHeaders() });
      const userData = await userRes.json();
      
      if (userData.success) {
        setProfile(userData.user);
        
        const companyRes = await fetch(`${API}/company/profile/`, { 
          headers: authHeaders() 
        });
        const companyData = await companyRes.json();
        
        if (companyData.success) {
          setCompanyInfo(companyData.company);
          if (companyData.visibility) {
            setVisibility(companyData.visibility);
          }
          if (companyData.company?.logo_url) {
            let logoUrl = companyData.company.logo_url;
            if (logoUrl && !logoUrl.startsWith('http')) {
              logoUrl = `http://localhost:8000${logoUrl}`;
            }
            setProfileImage(logoUrl);
          }
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Erreur de chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityStatus = async () => {
    try {
      const res = await fetch(`${API}/auth/security-status/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setTwoFAEnabled(data.two_fa_enabled || false);
        setRecoveryEmailAdded(data.recovery_email_exists || false);
      }
    } catch (err) {
      console.error('Error fetching security status:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchSecurityStatus();
  }, []);

  const handleInputChange = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        company_name: companyInfo?.company_name,
        description: companyInfo?.description,
        location: companyInfo?.location,
        website: companyInfo?.website,
        industry: companyInfo?.industry,
        phone: companyInfo?.phone,
        visibility: visibility
      };
      
      const res = await fetch(`${API}/company/profile/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updateData)
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success('Profil mis à jour avec succès ✅');
        setIsEditing(false);
        await fetchProfile();
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5 MB)');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
      toast.error('Utilisez JPEG, PNG ou GIF');
      return;
    }

    const form = new FormData();
    form.append('logo', file);

    try {
      const res = await fetch(`${API}/company/upload-logo/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Logo mis à jour ✅');
        await fetchProfile();
      } else {
        toast.error(data.error || 'Upload échoué');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erreur de connexion');
    }
  };

  const handleEnable2FA = async () => {
    setLoading2FA(true);
    try {
        const res = await fetch(`${API}/auth/enable-email-2fa/`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (data.success) {
            setTwoFAEnabled(true);
            toast.success('2FA via email enabled! A code will be sent to your email at each login.');
        } else {
            toast.error(data.error || 'Failed to enable 2FA');
        }
    } catch (err) {
        toast.error('Connection error');
    } finally {
        setLoading2FA(false);
        setShow2FAModal(false);
    }
};

  const handleDisable2FA = async () => {
    setLoading2FA(true);
    try {
      const res = await fetch(`${API}/auth/disable-2fa/`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTwoFAEnabled(false);
        toast.success('Authentification à deux facteurs désactivée');
      } else {
        toast.error(data.error || 'Échec de la désactivation');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleAddRecoveryEmail = async () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      toast.error('Veuillez entrer une adresse email valide');
      return;
    }
    
    if (recoveryEmail === user?.email) {
      toast.error('L\'email de récupération ne peut pas être identique à votre email principal');
      return;
    }
    
    setLoadingRecovery(true);
    try {
      const res = await fetch(`${API}/auth/add-recovery-email/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ recovery_email: recoveryEmail })
      });
      const data = await res.json();
      if (data.success) {
        setPendingRecoveryEmail(data.recovery_email);
        setShowRecoveryModal(false);
        setShowRecoveryOTPModal(true);
        toast.success('Code de vérification envoyé à votre email de récupération');
      } else {
        toast.error(data.error || 'Échec de l\'ajout');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoadingRecovery(false);
    }
  };

  const handleVerifyRecoveryOTP = async (otpCode) => {
    setLoadingRecovery(true);
    try {
      const res = await fetch(`${API}/auth/verify-recovery-email/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          email: pendingRecoveryEmail,
          code: otpCode
        })
      });
      const data = await res.json();
      if (data.success) {
        setRecoveryEmailAdded(true);
        toast.success('Email de récupération ajouté avec succès');
        setShowRecoveryOTPModal(false);
        setPendingRecoveryEmail('');
        setRecoveryEmail('');
      } else {
        toast.error(data.error || 'Code invalide');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoadingRecovery(false);
    }
  };

  const handleRemoveRecoveryEmail = async () => {
    setLoadingRecovery(true);
    try {
      const res = await fetch(`${API}/auth/remove-recovery-email/`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setRecoveryEmailAdded(false);
        toast.success('Email de récupération supprimé');
      } else {
        toast.error(data.error || 'Échec de la suppression');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoadingRecovery(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadge = isCompanyManager ? 'Company Manager' : 'Hiring Manager';

  // Display username
  const getDisplayName = () => {
    if (profile?.username) {
      return profile.username;
    }
    if (user?.username) {
      return user.username;
    }
    return 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Profil non trouvé</div>
      </div>
    );
  }

  return (
    <>
      {sidebarOpen && (
        <CompanySidebar
          user={user}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {showRecoveryOTPModal && (
        <OTPVerificationModal
          email={pendingRecoveryEmail}
          onVerify={handleVerifyRecoveryOTP}
          onClose={() => {
            setShowRecoveryOTPModal(false);
            setPendingRecoveryEmail('');
          }}
          loading={loadingRecovery}
          title="Vérification de l'email de récupération"
        />
      )}

      <div className="profile-page">
        <nav className="profile-navbar">
          <div className="profile-navbar-left">
            <button className="profile-hamburger" onClick={() => setSidebarOpen(true)}>
              <span /><span /><span />
            </button>
            <a className="profile-logo" href="/">UnivStage</a>
          </div>
        </nav>

        <div className="profile-container">
          {/* Left Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-avatar-container">
              <div className="profile-avatar">
                {profileImage && !imageError ? (
                  <img 
                    src={profileImage} 
                    alt={companyInfo?.company_name || getDisplayName()} 
                    onError={() => {
                      setImageError(true);
                      setProfileImage(null);
                    }}
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {getInitials()}
                  </div>
                )}
              </div>
              <h2>{getDisplayName()}</h2>
              <p className="profile-username">@{profile?.username}</p>
              <div className="profile-placed-badge" style={{ background: 'rgba(141,35,212,0.2)' }}>
                <Building2 size={14} /> {roleBadge}
              </div>

              {isOwner && (
                <>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                  <button
                    className="profile-upload-picture-btn"
                    onClick={() => logoInputRef.current?.click()}
                    title="Changer le logo"
                  >
                    <Camera size={14} /> Changer le logo
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Content */}
          <div className="profile-main">
            <div className="profile-header">
              <div>
                <h1>Profile</h1>
                <h2 className="profile-subtitle">Company Profile</h2>
                <p className="profile-description">Gérez votre profil public et vos informations personnelles</p>
              </div>
              {!isEditing ? (
                <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
                  <Edit2 size={16} /> Modifier le profil
                </button>
              ) : (
                <div className="profile-edit-actions">
                  <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                    <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button className="profile-cancel-btn" onClick={() => { setIsEditing(false); fetchProfile(); }}>
                    <X size={16} /> Annuler
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
              <button 
                className={`profile-tab-btn ${activeTab === 'public' ? 'active' : ''}`} 
                onClick={() => setActiveTab('public')}
              >
                <Eye size={16} /> Profil public
              </button>
              <button 
                className={`profile-tab-btn ${activeTab === 'private' ? 'active' : ''}`} 
                onClick={() => setActiveTab('private')}
              >
                <Lock size={16} /> Informations privées & Sécurité
              </button>
            </div>

            {/* PUBLIC PROFILE TAB */}
            {activeTab === 'public' && (
              <div className="profile-tab-content">
                <div className="profile-info-card">
                  <div className="profile-info-row">
                    <label>Nom de l'entreprise</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={companyInfo?.company_name || ''} 
                        onChange={(e) => handleInputChange('company_name', e.target.value)} 
                        className="profile-edit-input" 
                      />
                    ) : (
                      <p>{companyInfo?.company_name || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Nom d'utilisateur</label>
                    <p>@{profile?.username || '—'}</p>
                  </div>

                  <div className="profile-info-row">
                    <label>Rôle</label>
                    <p>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">
                        {roleBadge}
                      </span>
                    </p>
                  </div>

                  <div className="profile-info-row">
                    <label>Statut du compte</label>
                    <p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${profile?.status ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                        {profile?.status ? 'Actif' : 'En attente'}
                      </span>
                    </p>
                  </div>

                  <div className="profile-info-row">
                    <label>Secteur d'activité</label>
                    {isEditing ? (
                      <select 
                        value={companyInfo?.industry || ''} 
                        onChange={(e) => handleInputChange('industry', e.target.value)} 
                        className="profile-edit-select"
                      >
                        <option value="">Sélectionner un secteur</option>
                        {industries.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    ) : (
                      <p>{companyInfo?.industry || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Localisation</label>
                    {isEditing ? (
                      <select 
                        value={companyInfo?.location || ''} 
                        onChange={(e) => handleInputChange('location', e.target.value)} 
                        className="profile-edit-select"
                      >
                        <option value="">Sélectionner une wilaya</option>
                        {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    ) : (
                      <p>{companyInfo?.location || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Site web</label>
                    {isEditing ? (
                      <input 
                        type="url" 
                        value={companyInfo?.website || ''} 
                        onChange={(e) => handleInputChange('website', e.target.value)} 
                        className="profile-edit-input" 
                        placeholder="https://..." 
                      />
                    ) : (
                      <p>{companyInfo?.website ? (
                        <a href={companyInfo.website} target="_blank" rel="noopener noreferrer" className="profile-link">
                          {companyInfo.website}
                        </a>
                      ) : '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Description</label>
                    {isEditing ? (
                      <textarea 
                        value={companyInfo?.description || ''} 
                        onChange={(e) => handleInputChange('description', e.target.value)} 
                        className="profile-edit-textarea" 
                        rows="4"
                        placeholder="Présentation de l'entreprise..."
                      />
                    ) : (
                      <p className="profile-bio-text">{companyInfo?.description || '—'}</p>
                    )}
                  </div>

                  {isEditing && (
                    <div className="profile-visibility-section">
                      <div className="profile-visibility-header">
                        <Eye size={16} />
                        <h4>Visibilité du profil public</h4>
                      </div>
                      <div className="profile-visibility-options">
                        <label className="profile-visibility-option">
                          <input 
                            type="checkbox" 
                            checked={visibility.location_visible} 
                            onChange={(e) => setVisibility(prev => ({ ...prev, location_visible: e.target.checked }))}
                          />
                          <span>Afficher la localisation</span>
                        </label>
                        <label className="profile-visibility-option">
                          <input 
                            type="checkbox" 
                            checked={visibility.website_visible} 
                            onChange={(e) => setVisibility(prev => ({ ...prev, website_visible: e.target.checked }))}
                          />
                          <span>Afficher le site web</span>
                        </label>
                        <label className="profile-visibility-option">
                          <input 
                            type="checkbox" 
                            checked={visibility.industry_visible} 
                            onChange={(e) => setVisibility(prev => ({ ...prev, industry_visible: e.target.checked }))}
                          />
                          <span>Afficher le secteur d'activité</span>
                        </label>
                        <label className="profile-visibility-option">
                          <input 
                            type="checkbox" 
                            checked={visibility.description_visible} 
                            onChange={(e) => setVisibility(prev => ({ ...prev, description_visible: e.target.checked }))}
                          />
                          <span>Afficher la description</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PRIVATE TAB */}
            {activeTab === 'private' && (
              <div className="profile-tab-content">
                <div className="profile-info-card">
                  <div className="profile-info-row">
                    <label>Email de contact</label>
                    <p>{profile?.email || '—'}</p>
                  </div>

                  <div className="profile-info-row">
                    <label>Téléphone</label>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        value={companyInfo?.phone || ''} 
                        onChange={(e) => handleInputChange('phone', e.target.value)} 
                        className="profile-edit-input" 
                        placeholder="+213 XX XXX XXXX" 
                      />
                    ) : (
                      <p>{companyInfo?.phone || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Date d'inscription</label>
                    <p>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'}</p>
                  </div>

                  {/* Security Section */}
                  <div className="profile-security-section">
                    <div className="profile-security-header">
                      <ShieldCheck size={18} />
                      <h3>Sécurité</h3>
                    </div>

                    <div className="profile-info-row" style={{ borderBottom: 'none' }}>
                      <label>Mot de passe</label>
                      {!showChangePassword ? (
                        <button className="profile-change-password-btn" onClick={() => setShowChangePassword(true)}>
                          <KeyRound size={14} /> Changer le mot de passe
                        </button>
                      ) : (
                        <PasswordChangeWithOTP 
                          onClose={() => setShowChangePassword(false)}
                          onSuccess={() => setShowChangePassword(false)}
                        />
                      )}
                    </div>
                    
                    <div className="profile-security-option">
                      <div className="security-option-info">
                        <Smartphone size={16} />
                        <span>Authentification à deux facteurs</span>
                        <p>Ajoutez une couche de sécurité supplémentaire à votre compte</p>
                        {twoFAEnabled && <span className="security-enabled-badge">✓ Activé</span>}
                      </div>
                      {!twoFAEnabled ? (
                        <button 
                          className="security-option-btn" 
                          onClick={() => setShow2FAModal(true)}
                          disabled={loading2FA}
                        >
                          {loading2FA ? 'Chargement...' : 'Activer'}
                        </button>
                      ) : (
                        <button 
                          className="security-option-btn security-option-btn-danger" 
                          onClick={handleDisable2FA}
                          disabled={loading2FA}
                        >
                          {loading2FA ? 'Chargement...' : 'Désactiver'}
                        </button>
                      )}
                    </div>
                    
                    <div className="profile-security-option">
                      <div className="security-option-info">
                        <Key size={16} />
                        <span>Email de récupération</span>
                        <p>Ajoutez un email de récupération pour réinitialiser votre mot de passe</p>
                        {recoveryEmailAdded && <span className="security-enabled-badge">✓ Ajouté</span>}
                      </div>
                      {!recoveryEmailAdded ? (
                        <button 
                          className="security-option-btn" 
                          onClick={() => setShowRecoveryModal(true)}
                          disabled={loadingRecovery}
                        >
                          {loadingRecovery ? 'Chargement...' : 'Ajouter'}
                        </button>
                      ) : (
                        <button 
                          className="security-option-btn security-option-btn-danger" 
                          onClick={handleRemoveRecoveryEmail}
                          disabled={loadingRecovery}
                        >
                          {loadingRecovery ? 'Chargement...' : 'Supprimer'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="profile-visibility-section">
                      <div className="profile-visibility-header">
                        <Lock size={16} />
                        <h4>Visibilité des informations privées</h4>
                      </div>
                      <div className="profile-visibility-options">
                        <label className="profile-visibility-option">
                          <input 
                            type="checkbox" 
                            checked={visibility.email_visible} 
                            onChange={(e) => setVisibility(prev => ({ ...prev, email_visible: e.target.checked }))}
                          />
                          <span>Afficher l'email dans le profil public</span>
                        </label>
                        <label className="profile-visibility-option">
                          <input 
                            type="checkbox" 
                            checked={visibility.phone_visible} 
                            onChange={(e) => setVisibility(prev => ({ ...prev, phone_visible: e.target.checked }))}
                          />
                          <span>Afficher le téléphone dans le profil public</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="profile-modal-overlay" onClick={() => setShow2FAModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <Smartphone size={20} />
              <h3>Activer l'authentification à deux facteurs</h3>
              <button className="profile-modal-close" onClick={() => setShow2FAModal(false)}>×</button>
            </div>
            <div className="profile-modal-body">
              <p>L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte.</p>
              <div className="profile-modal-info">
                <strong>Comment ça fonctionne :</strong>
                <ul>
                  <li>Téléchargez une application d'authentification (Google Authenticator, Microsoft Authenticator)</li>
                  <li>Scannez le code QR qui apparaîtra</li>
                  <li>Entrez le code à 6 chiffres de l'application pour vérifier</li>
                </ul>
              </div>
            </div>
            <div className="profile-modal-footer">
              <button className="profile-modal-cancel" onClick={() => setShow2FAModal(false)}>Annuler</button>
              <button className="profile-modal-confirm" onClick={handleEnable2FA}>Activer 2FA</button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Email Modal */}
      {showRecoveryModal && (
        <div className="profile-modal-overlay" onClick={() => setShowRecoveryModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <Key size={20} />
              <h3>Ajouter un email de récupération</h3>
              <button className="profile-modal-close" onClick={() => setShowRecoveryModal(false)}>×</button>
            </div>
            <div className="profile-modal-body">
              <p>Ajoutez un email de récupération pour réinitialiser votre mot de passe si vous perdez l'accès à votre compte.</p>
              <p className="text-sm text-white/50 mt-2">Un code de vérification sera envoyé à cet email.</p>
              <input 
                type="email"
                placeholder="Entrez l'email de récupération"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="profile-modal-input"
              />
            </div>
            <div className="profile-modal-footer">
              <button className="profile-modal-cancel" onClick={() => setShowRecoveryModal(false)}>Annuler</button>
              <button className="profile-modal-confirm" onClick={handleAddRecoveryEmail} disabled={loadingRecovery}>
                {loadingRecovery ? 'Envoi...' : 'Envoyer le code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}