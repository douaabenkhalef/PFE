// frontend/src/page/StudentProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  User, Mail, MapPin, BookOpen, Award, Code, Github, 
  Phone, Calendar, Briefcase, Edit2, Save, X, Camera, 
  Lock, Eye, KeyRound, ShieldCheck, Smartphone, Key,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentSidebar from '../components/Studentsidebar';
import './StudentProfile.css';

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

const educationLevels = ["Licence", "Master 1", "Master 2", "Ingénieur", "Doctorat"];

// Composant OTP Modal pour la vérification (générique)
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

// Composant pour le changement de mot de passe avec OTP
const PasswordChangeWithOTP = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState('initiate'); // 'initiate' ou 'verify'
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetEmailMasked, setTargetEmailMasked] = useState('');
  const [usingRecovery, setUsingRecovery] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleInitiate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    if (newPassword.isdigit && !isNaN(newPassword)) {
      toast.error('Le mot de passe ne peut pas être uniquement des chiffres');
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
        setStep('verify');
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
          placeholder="New Password" 
          value={newPassword} 
          onChange={(e) => setNewPassword(e.target.value)} 
          className="profile-edit-input" 
        />
        <input 
          type="password" 
          placeholder="Confirm New Password" 
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

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [visibility, setVisibility] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('public');
  const [isOwner, setIsOwner] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pictureInputRef = React.useRef(null);
  
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

  // Fetch security status
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

  // Handle Enable 2FA
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
};g

  // Handle Disable 2FA
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
        toast.success('Two-factor authentication disabled');
      } else {
        toast.error(data.error || 'Failed to disable 2FA');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setLoading2FA(false);
    }
  };

  // Handle Add Recovery Email (Step 1: Send OTP)
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
        toast.error(data.error || 'Échec de l\'ajout de l\'email de récupération');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoadingRecovery(false);
    }
  };

  // Handle Verify Recovery OTP (Step 2: Confirm and save)
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

  // Handle Remove Recovery Email
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
        toast.error(data.error || 'Failed to remove recovery email');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setLoadingRecovery(false);
    }
  };

  // Upload photo de profil
  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5 MB)');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
      toast.error('Use JPEG, PNG or GIF');
      return;
    }

    const form = new FormData();
    form.append('profile_picture', file);

    try {
      const res = await fetch(`${API}/student/profile/upload-picture/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Photo de profil mise à jour ✅');
        setTimeout(async () => {
          await fetchProfile();
        }, 500);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erreur de connexion');
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      let url;
      if (username) {
        url = `${API}/student/profile/by-username/${username}/`;
      } else {
        url = `${API}/student/profile/me/`;
      }
      
      const res = await fetch(url, { headers: authHeaders() });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Profile fetch error:', res.status, errText);
        toast.error(`Error ${res.status}: Could not load profile`);
        if (!username) navigate('/student/dashboard');
        return;
      }

      const data = await res.json();
      
      if (data.success) {
        if (data.profile.profile_picture && !data.profile.profile_picture.startsWith('http')) {
          data.profile.profile_picture = `http://localhost:8000${data.profile.profile_picture}`;
        }
        setProfile(data.profile);
        setVisibility(data.visibility || {});
        setIsOwner(data.is_owner !== undefined ? data.is_owner : true);
      } else {
        toast.error(data.error || 'Erreur de chargement');
        if (!username) navigate('/student/dashboard');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchSecurityStatus();
  }, [username]);

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        full_name: profile.full_name,
        username: profile.username,
        wilaya: profile.wilaya,
        skills: profile.skills,
        github: profile.github || '',
        portfolio: profile.portfolio || '',
        education_level: profile.education_level,
        university: profile.university,
        major: profile.major,
        graduation_year: profile.graduation_year,
        bio: profile.bio || '',
        phone: profile.phone || '',
        visibility: visibility
      };
      
      const res = await fetch(`${API}/student/profile/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Save error:', res.status, errText);
        toast.error(`Save failed (${res.status})`);
        return;
      }
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Profil mis à jour avec succès ✅');
        if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
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

  const handlePasswordChangeSuccess = () => {
    setShowChangePassword(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <StudentSidebar
          user={user}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* OTP Modal for Recovery Email */}
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
          {/* Left Sidebar - Avatar */}
          <div className="profile-sidebar">
            <div className="profile-avatar-container">
              <div className="profile-avatar">
                {profile.profile_picture ? (
                  <img src={profile.profile_picture} alt={profile.full_name} />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2>{profile.full_name}</h2>
              <p className="profile-username">@{profile.username}</p>
              {profile.is_placed && (
                <div className="profile-placed-badge">
                  <Briefcase size={14} /> Placé chez {profile.placed_company_name || 'une entreprise'}
                </div>
              )}

              {isOwner && (
                <>
                  <input
                    ref={pictureInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif"
                    style={{ display: 'none' }}
                    onChange={handlePictureUpload}
                  />
                  <button
                    className="profile-upload-picture-btn"
                    onClick={() => pictureInputRef.current?.click()}
                    title="Change profile picture"
                  >
                    <Camera size={14} /> Change Photo
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Content */}
          <div className="profile-main">
            <div className="profile-header">
              <div>
                <h1>Community</h1>
                <h2 className="profile-subtitle">Manage Profile</h2>
                <p className="profile-description">Manage your public profile and personal information</p>
              </div>
              {isOwner && !isEditing ? (
                <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
                  <Edit2 size={16} /> Edit Profile
                </button>
              ) : isOwner && isEditing ? (
                <div className="profile-edit-actions">
                  <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="profile-cancel-btn" onClick={() => { setIsEditing(false); fetchProfile(); }}>
                    <X size={16} /> Cancel
                  </button>
                </div>
              ) : null}
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
              <button 
                className={`profile-tab-btn ${activeTab === 'public' ? 'active' : ''}`} 
                onClick={() => setActiveTab('public')}
              >
                <Eye size={16} /> Public Profile
              </button>
              <button 
                className={`profile-tab-btn ${activeTab === 'private' ? 'active' : ''}`} 
                onClick={() => setActiveTab('private')}
              >
                <Lock size={16} /> Personal Information
              </button>
            </div>

            {/* PUBLIC PROFILE TAB */}
            {activeTab === 'public' && (
              <div className="profile-tab-content">
                <div className="profile-info-card">
                  <div className="profile-info-row">
                    <label>Full Name</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.full_name || ''} 
                        onChange={(e) => handleInputChange('full_name', e.target.value)} 
                        className="profile-edit-input" 
                      />
                    ) : (
                      <p>{profile.full_name || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Username</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.username || ''} 
                        onChange={(e) => handleInputChange('username', e.target.value)} 
                        className="profile-edit-input" 
                      />
                    ) : (
                      <p>@{profile.username || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Location (Wilaya)</label>
                    {isEditing ? (
                      <select 
                        value={profile.wilaya || ''} 
                        onChange={(e) => handleInputChange('wilaya', e.target.value)} 
                        className="profile-edit-select"
                      >
                        <option value="">Select Wilaya</option>
                        {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    ) : (
                      <p>{profile.wilaya || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>University</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.university || ''} 
                        onChange={(e) => handleInputChange('university', e.target.value)} 
                        className="profile-edit-input" 
                      />
                    ) : (
                      <p>{profile.university || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Major / Field of Study</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.major || ''} 
                        onChange={(e) => handleInputChange('major', e.target.value)} 
                        className="profile-edit-input" 
                      />
                    ) : (
                      <p>{profile.major || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Education Level</label>
                    {isEditing ? (
                      <select 
                        value={profile.education_level || ''} 
                        onChange={(e) => handleInputChange('education_level', e.target.value)} 
                        className="profile-edit-select"
                      >
                        <option value="">Select</option>
                        {educationLevels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    ) : (
                      <p>{profile.education_level || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Graduation Year</label>
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={profile.graduation_year || ''} 
                        onChange={(e) => handleInputChange('graduation_year', parseInt(e.target.value) || '')} 
                        className="profile-edit-input" 
                        placeholder="2025" 
                      />
                    ) : (
                      <p>{profile.graduation_year || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Skills</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.skills?.join(', ') || ''} 
                        onChange={(e) => handleInputChange('skills', e.target.value.split(',').map(s => s.trim()).filter(s => s))} 
                        className="profile-edit-input" 
                        placeholder="React, Python, Django, ..." 
                      />
                    ) : (
                      <div className="profile-skills-list">
                        {profile.skills?.length > 0 ? (
                          profile.skills.map(s => <span key={s} className="profile-skill-tag">{s}</span>)
                        ) : '—'}
                      </div>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Bio / About Me</label>
                    {isEditing ? (
                      <textarea 
                        value={profile.bio || ''} 
                        onChange={(e) => handleInputChange('bio', e.target.value)} 
                        className="profile-edit-textarea" 
                        rows="4"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="profile-bio-text">{profile.bio || '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>GitHub</label>
                    {isEditing ? (
                      <input 
                        type="url" 
                        value={profile.github || ''} 
                        onChange={(e) => handleInputChange('github', e.target.value)} 
                        className="profile-edit-input" 
                        placeholder="https://github.com/..." 
                      />
                    ) : (
                      <p>{profile.github ? (
                        <a href={profile.github} target="_blank" rel="noopener noreferrer" className="profile-link">{profile.github}</a>
                      ) : '—'}</p>
                    )}
                  </div>

                  <div className="profile-info-row">
                    <label>Portfolio</label>
                    {isEditing ? (
                      <input 
                        type="url" 
                        value={profile.portfolio || ''} 
                        onChange={(e) => handleInputChange('portfolio', e.target.value)} 
                        className="profile-edit-input" 
                        placeholder="https://..." 
                      />
                    ) : (
                      <p>{profile.portfolio || '—'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PERSONAL INFORMATION TAB */}
            {activeTab === 'private' && (
              <div className="profile-tab-content">
                <div className="profile-info-card">
                  <div className="profile-info-row">
                    <label>Email</label>
                    <p>{profile.email || '—'}</p>
                  </div>

                  <div className="profile-info-row">
                    <label>Phone Number</label>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        value={profile.phone || ''} 
                        onChange={(e) => handleInputChange('phone', e.target.value)} 
                        className="profile-edit-input" 
                        placeholder="+213 XX XXX XXXX" 
                      />
                    ) : (
                      <p>{profile.phone || '—'}</p>
                    )}
                  </div>
                  
                  <div className="profile-info-row">
                    <label>Password</label>
                    {!showChangePassword ? (
                      <button className="profile-change-password-btn" onClick={() => setShowChangePassword(true)}>
                        <KeyRound size={14} /> Change Password
                      </button>
                    ) : (
                      <PasswordChangeWithOTP 
                        onClose={() => setShowChangePassword(false)}
                        onSuccess={handlePasswordChangeSuccess}
                      />
                    )}
                  </div>

                  {/* Security Section */}
                  <div className="profile-security-section">
                    <div className="profile-security-header">
                      <ShieldCheck size={18} />
                      <h3>Additional Security</h3>
                    </div>
                    
                    {/* Two-factor authentication */}
                    <div className="profile-security-option">
                      <div className="security-option-info">
                        <Smartphone size={16} />
                        <span>Two-factor authentication</span>
                        <p>Add an extra layer of security to your account</p>
                        {twoFAEnabled && <span className="security-enabled-badge">✓ Enabled</span>}
                      </div>
                      {!twoFAEnabled ? (
                        <button 
                          className="security-option-btn" 
                          onClick={() => setShow2FAModal(true)}
                          disabled={loading2FA}
                        >
                          {loading2FA ? 'Loading...' : 'Enable'}
                        </button>
                      ) : (
                        <button 
                          className="security-option-btn security-option-btn-danger" 
                          onClick={handleDisable2FA}
                          disabled={loading2FA}
                        >
                          {loading2FA ? 'Loading...' : 'Disable'}
                        </button>
                      )}
                    </div>
                    
                    {/* Recovery email */}
                    <div className="profile-security-option">
                      <div className="security-option-info">
                        <Key size={16} />
                        <span>Recovery email</span>
                        <p>Add a recovery email to reset your password</p>
                        {recoveryEmailAdded && <span className="security-enabled-badge">✓ Added</span>}
                      </div>
                      {!recoveryEmailAdded ? (
                        <button 
                          className="security-option-btn" 
                          onClick={() => setShowRecoveryModal(true)}
                          disabled={loadingRecovery}
                        >
                          {loadingRecovery ? 'Loading...' : 'Add'}
                        </button>
                      ) : (
                        <button 
                          className="security-option-btn security-option-btn-danger" 
                          onClick={handleRemoveRecoveryEmail}
                          disabled={loadingRecovery}
                        >
                          {loadingRecovery ? 'Loading...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
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
              <h3>Enable Two-Factor Authentication</h3>
              <button className="profile-modal-close" onClick={() => setShow2FAModal(false)}>×</button>
            </div>
            <div className="profile-modal-body">
              <p>Two-factor authentication adds an extra layer of security to your account.</p>
              <div className="profile-modal-info">
                <strong>How it works:</strong>
                <ul>
                  <li>Download an authenticator app (Google Authenticator, Microsoft Authenticator)</li>
                  <li>Scan the QR code that will appear</li>
                  <li>Enter the 6-digit code from the app to verify</li>
                </ul>
              </div>
            </div>
            <div className="profile-modal-footer">
              <button className="profile-modal-cancel" onClick={() => setShow2FAModal(false)}>Cancel</button>
              <button className="profile-modal-confirm" onClick={handleEnable2FA}>Enable 2FA</button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Email Modal (Step 1: Enter email) */}
      {showRecoveryModal && (
        <div className="profile-modal-overlay" onClick={() => setShowRecoveryModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <Key size={20} />
              <h3>Add Recovery Email</h3>
              <button className="profile-modal-close" onClick={() => setShowRecoveryModal(false)}>×</button>
            </div>
            <div className="profile-modal-body">
              <p>Add a recovery email to reset your password if you lose access to your account.</p>
              <p className="text-sm text-white/50 mt-2">A verification code will be sent to this email.</p>
              <input 
                type="email"
                placeholder="Enter recovery email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="profile-modal-input"
              />
            </div>
            <div className="profile-modal-footer">
              <button className="profile-modal-cancel" onClick={() => setShowRecoveryModal(false)}>Cancel</button>
              <button className="profile-modal-confirm" onClick={handleAddRecoveryEmail} disabled={loadingRecovery}>
                {loadingRecovery ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
