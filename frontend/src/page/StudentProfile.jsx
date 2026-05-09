// frontend/src/page/StudentProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  User, Mail, MapPin, BookOpen, Award, Code, Github, 
  Phone, Calendar, Briefcase, Edit2, Save, X, Camera, 
  Lock, Eye, KeyRound, ShieldCheck, Smartphone, Key,
  AlertCircle, Users, Search, Filter, ArrowLeft, LogOut,
  Building2, UserCog, Activity, FileText, ClipboardList,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentProfile.css';

const API = 'https://pfe-l31r.onrender.com/api';
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

const educationLevels = ["Bachelor", "Master 1", "Master 2", "Engineering", "Doctorate"];

// OTP Modal component for verification (generic)
const OTPVerificationModal = ({ email, onVerify, onClose, loading, title = "Email Verification" }) => {
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
      setError('The code must contain exactly 6 digits');
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
          <p>A verification code has been sent to:</p>
          <p className="text-purple-400 font-semibold">{email}</p>
          <p className="text-sm text-white/60 mt-2">Please enter the 6-digit code received by email.</p>
          
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
          <button className="profile-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="profile-modal-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Component for password change with OTP
const PasswordChangeWithOTP = ({ onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetEmailMasked, setTargetEmailMasked] = useState('');
  const [usingRecovery, setUsingRecovery] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);

  const handleInitiate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
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
        toast.error(data.error || 'Error sending code');
      }
    } catch (err) {
      toast.error('Connection error');
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
        toast.success('Password changed successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else if (data.code_invalid) {
        toast.error(data.error || 'Invalid code. Please try again.');
      } else {
        toast.error(data.error || 'Error changing password');
      }
    } catch (err) {
      toast.error('Connection error');
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
          For security reasons, a verification code will be sent to {usingRecovery ? 'your recovery email' : 'your primary email'}.
        </p>
        
        <input 
          type="password" 
          placeholder="New password" 
          value={newPassword} 
          onChange={(e) => setNewPassword(e.target.value)} 
          className="profile-edit-input" 
        />
        <input 
          type="password" 
          placeholder="Confirm password" 
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
            {loading ? 'Sending...' : 'Send Code'}
          </button>
          <button onClick={onClose} className="profile-cancel-password-btn">
            Cancel
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
          title="Password Change Verification"
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
        toast.success('2FA via email enabled!');
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

  const handleAddRecoveryEmail = async () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (recoveryEmail === user?.email) {
      toast.error('Recovery email cannot be the same as your primary email');
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
        toast.success('Verification code sent to your recovery email');
      } else {
        toast.error(data.error || 'Failed to add recovery email');
      }
    } catch (err) {
      toast.error('Connection error');
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
        toast.success('Recovery email added successfully');
        setShowRecoveryOTPModal(false);
        setPendingRecoveryEmail('');
        setRecoveryEmail('');
      } else {
        toast.error(data.error || 'Invalid code');
      }
    } catch (err) {
      toast.error('Connection error');
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
        toast.success('Recovery email removed');
      } else {
        toast.error(data.error || 'Failed to remove recovery email');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setLoadingRecovery(false);
    }
  };

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
        toast.success('Profile picture updated ✅');
        setTimeout(async () => {
          await fetchProfile();
        }, 500);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Connection error');
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
          data.profile.profile_picture = `https://pfe-l31r.onrender.com${data.profile.profile_picture}`;
        }
        setProfile(data.profile);
        setVisibility(data.visibility || {});
        setIsOwner(data.is_owner !== undefined ? data.is_owner : true);
      } else {
        toast.error(data.error || 'Error loading profile');
        if (!username) navigate('/student/dashboard');
      }
    } catch (err) {
      console.error(err);
      toast.error('Connection error');
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
        toast.success('Profile updated successfully ✅');
        if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
        setIsEditing(false);
        await fetchProfile();
      } else {
        toast.error(data.error || 'Error updating profile');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Connection error');
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Fixed Sidebar */}
      <div className="w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full fixed left-0 top-0 overflow-y-auto border-r border-purple-500/30">
        {/* Sidebar Header with User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold overflow-hidden">
              {profile.profile_picture ? (
                <img 
                  src={profile.profile_picture} 
                  alt={profile.full_name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<span>${(profile.full_name?.charAt(0) || 'U').toUpperCase()}</span>`;
                  }}
                />
              ) : (
                <span>{(profile.full_name?.charAt(0) || 'U').toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{profile.full_name || user?.username || 'Student'}</p>
              <p className="text-white/50 text-xs truncate">{profile.email || user?.email}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div>
            <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control & Management</p>
            <div className="space-y-1">
              <Link 
                to="/student/profile" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30"
              >
                <User size={16} /> My Profile
              </Link>
              <Link 
                to="/student/cv" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10"
              >
                <FileText size={16} /> My CV
              </Link>
              <Link 
                to="/student/applications" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10"
              >
                <ClipboardList size={16} /> Application status
              </Link>
            </div>
          </div>
        </nav>

        {/* Logout Button */}
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

      {/* Main content area - with glassmorphic effect */}
      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          {/* User info header with avatar */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-3xl overflow-hidden">
                {profile.profile_picture ? (
                  <img src={profile.profile_picture} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span>{(profile.full_name?.charAt(0) || 'U').toUpperCase()}</span>
                )}
              </div>
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
                    onClick={() => pictureInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-2 shadow-lg hover:bg-purple-500 transition"
                    title="Change profile picture"
                  >
                    <Camera size={16} />
                  </button>
                </>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile.full_name}</h1>
              <p className="text-purple-400">@{profile.username}</p>
              {profile.is_placed && (
                <p className="text-green-400 text-sm flex items-center gap-1 mt-1">
                  <Briefcase size={14} /> Placed at {profile.placed_company_name || 'a company'}
                </p>
              )}
            </div>
          </div>

          {/* Header with Edit/Save buttons */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Manage Profile</h2>
              <p className="text-white/60 text-sm">Manage your public profile and personal information</p>
            </div>
            {isOwner && !isEditing ? (
              <button 
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition shadow-lg flex items-center gap-2"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            ) : isOwner && isEditing ? (
              <div className="flex gap-3">
                <button 
                  className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                  onClick={handleSave} 
                  disabled={saving}
                >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                  onClick={() => { setIsEditing(false); fetchProfile(); }}
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            ) : null}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-white/20">
            <button
              onClick={() => setActiveTab('public')}
              className={`pb-2 px-4 text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'public' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60 hover:text-white'
              }`}
            >
              <Eye size={16} /> Public Profile
            </button>
            <button
              onClick={() => setActiveTab('private')}
              className={`pb-2 px-4 text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'private' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60 hover:text-white'
              }`}
            >
              <Lock size={16} /> Personal Information
            </button>
          </div>

          {/* PUBLIC PROFILE TAB - with glassmorphic cards */}
          {activeTab === 'public' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Full Name */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Full Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={profile.full_name || ''} 
                      onChange={(e) => handleInputChange('full_name', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  ) : (
                    <p className="flex-1 text-white">{profile.full_name || '—'}</p>
                  )}
                </div>

                {/* Username */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Username</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={profile.username || ''} 
                      onChange={(e) => handleInputChange('username', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  ) : (
                    <p className="flex-1 text-white">@{profile.username || '—'}</p>
                  )}
                </div>

                {/* Location */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Location (Wilaya)</label>
                  {isEditing ? (
                    <select 
                      value={profile.wilaya || ''} 
                      onChange={(e) => handleInputChange('wilaya', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select Wilaya</option>
                      {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  ) : (
                    <p className="flex-1 text-white">{profile.wilaya || '—'}</p>
                  )}
                </div>

                {/* University */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">University</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={profile.university || ''} 
                      onChange={(e) => handleInputChange('university', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  ) : (
                    <p className="flex-1 text-white">{profile.university || '—'}</p>
                  )}
                </div>

                {/* Major */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Major</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={profile.major || ''} 
                      onChange={(e) => handleInputChange('major', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  ) : (
                    <p className="flex-1 text-white">{profile.major || '—'}</p>
                  )}
                </div>

                {/* Education Level */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Education Level</label>
                  {isEditing ? (
                    <select 
                      value={profile.education_level || ''} 
                      onChange={(e) => handleInputChange('education_level', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select</option>
                      {educationLevels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  ) : (
                    <p className="flex-1 text-white">{profile.education_level || '—'}</p>
                  )}
                </div>

                {/* Graduation Year */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Graduation Year</label>
                  {isEditing ? (
                    <input 
                      type="number" 
                      value={profile.graduation_year || ''} 
                      onChange={(e) => handleInputChange('graduation_year', parseInt(e.target.value) || '')} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="2025" 
                    />
                  ) : (
                    <p className="flex-1 text-white">{profile.graduation_year || '—'}</p>
                  )}
                </div>

                {/* Skills */}
                <div className="flex flex-col md:flex-row gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Skills</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={profile.skills?.join(', ') || ''} 
                      onChange={(e) => handleInputChange('skills', e.target.value.split(',').map(s => s.trim()).filter(s => s))} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="React, Python, Django, ..." 
                    />
                  ) : (
                    <div className="flex-1 flex-wrap gap-2">
                      {profile.skills?.length > 0 ? (
                        profile.skills.map(s => <span key={s} className="bg-purple-900/60 text-purple-300 text-xs px-2.5 py-1 rounded-full">{s}</span>)
                      ) : '—'}
                    </div>
                  )}
                </div>

                {/* Bio */}
                <div className="flex flex-col md:flex-row gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Bio</label>
                  {isEditing ? (
                    <textarea 
                      value={profile.bio || ''} 
                      onChange={(e) => handleInputChange('bio', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                      rows="4"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="flex-1 text-white/80 leading-relaxed">{profile.bio || '—'}</p>
                  )}
                </div>

                {/* GitHub */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">GitHub</label>
                  {isEditing ? (
                    <input 
                      type="url" 
                      value={profile.github || ''} 
                      onChange={(e) => handleInputChange('github', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="https://github.com/..." 
                    />
                  ) : (
                    <p className="flex-1">{profile.github ? (
                      <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">{profile.github}</a>
                    ) : '—'}</p>
                  )}
                </div>

                {/* Portfolio */}
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Portfolio</label>
                  {isEditing ? (
                    <input 
                      type="url" 
                      value={profile.portfolio || ''} 
                      onChange={(e) => handleInputChange('portfolio', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="https://..." 
                    />
                  ) : (
                    <p className="flex-1">{profile.portfolio || '—'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PERSONAL INFORMATION TAB */}
          {activeTab === 'private' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Email */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Email</label>
                  <p className="flex-1 text-white">{profile.email || '—'}</p>
                </div>

                {/* Phone */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Phone</label>
                  {isEditing ? (
                    <input 
                      type="tel" 
                      value={profile.phone || ''} 
                      onChange={(e) => handleInputChange('phone', e.target.value)} 
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="+213 XX XXX XXXX" 
                    />
                  ) : (
                    <p className="flex-1 text-white">{profile.phone || '—'}</p>
                  )}
                </div>

                {/* Password */}
                <div className="flex flex-col md:flex-row gap-4 pb-4 border-b border-white/10">
                  <label className="md:w-32 text-white/60 text-sm font-medium">Password</label>
                  <div className="flex-1">
                    {!showChangePassword ? (
                      <button 
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition flex items-center gap-2"
                        onClick={() => setShowChangePassword(true)}
                      >
                        <KeyRound size={14} /> Change Password
                      </button>
                    ) : (
                      <PasswordChangeWithOTP 
                        onClose={() => setShowChangePassword(false)}
                        onSuccess={handlePasswordChangeSuccess}
                      />
                    )}
                  </div>
                </div>

                {/* Security Section */}
                <div className="pt-2">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} /> Additional Security
                  </h3>
                  
                  {/* Two-factor authentication */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-xl mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Smartphone size={16} className="text-purple-400" />
                        <span className="text-white text-sm font-medium">Two-factor authentication</span>
                        {twoFAEnabled && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full ml-2">✓ Enabled</span>}
                      </div>
                      <p className="text-white/50 text-xs mt-1">Add an extra layer of security to your account</p>
                    </div>
                    {!twoFAEnabled ? (
                      <button 
                        className="mt-3 md:mt-0 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg text-sm transition"
                        onClick={() => setShow2FAModal(true)}
                        disabled={loading2FA}
                      >
                        {loading2FA ? 'Loading...' : 'Enable'}
                      </button>
                    ) : (
                      <button 
                        className="mt-3 md:mt-0 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition"
                        onClick={handleDisable2FA}
                        disabled={loading2FA}
                      >
                        {loading2FA ? 'Loading...' : 'Disable'}
                      </button>
                    )}
                  </div>
                  
                  {/* Recovery email */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-purple-400" />
                        <span className="text-white text-sm font-medium">Recovery email</span>
                        {recoveryEmailAdded && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full ml-2">✓ Added</span>}
                      </div>
                      <p className="text-white/50 text-xs mt-1">Add a recovery email to reset your password</p>
                    </div>
                    {!recoveryEmailAdded ? (
                      <button 
                        className="mt-3 md:mt-0 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg text-sm transition"
                        onClick={() => setShowRecoveryModal(true)}
                        disabled={loadingRecovery}
                      >
                        {loadingRecovery ? 'Loading...' : 'Add'}
                      </button>
                    ) : (
                      <button 
                        className="mt-3 md:mt-0 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition"
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

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShow2FAModal(false)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Smartphone size={20} /> Enable Two-Factor Authentication
            </h3>
            <p className="text-white/70 mb-4">Two-factor authentication adds an extra layer of security to your account.</p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-5">
              <strong className="text-purple-300 text-sm">How it works:</strong>
              <ul className="text-white/60 text-xs mt-2 space-y-1 ml-5 list-disc">
                <li>Download an authenticator app (Google Authenticator, Microsoft Authenticator)</li>
                <li>Scan the QR code that will appear</li>
                <li>Enter the 6-digit code from the app to verify</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition" onClick={() => setShow2FAModal(false)}>Cancel</button>
              <button className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition" onClick={handleEnable2FA}>Enable 2FA</button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Email Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowRecoveryModal(false)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Key size={20} /> Add Recovery Email
            </h3>
            <p className="text-white/70 mb-2">Add a recovery email to reset your password if you lose access to your account.</p>
            <p className="text-white/50 text-sm mb-4">A verification code will be sent to this email.</p>
            <input 
              type="email"
              placeholder="Enter recovery email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm mb-5 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-3">
              <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition" onClick={() => setShowRecoveryModal(false)}>Cancel</button>
              <button className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition" onClick={handleAddRecoveryEmail} disabled={loadingRecovery}>
                {loadingRecovery ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Email OTP Modal */}
      {showRecoveryOTPModal && (
        <OTPVerificationModal
          email={pendingRecoveryEmail}
          onVerify={handleVerifyRecoveryOTP}
          onClose={() => {
            setShowRecoveryOTPModal(false);
            setPendingRecoveryEmail('');
          }}
          loading={loadingRecovery}
          title="Recovery Email Verification"
        />
      )}
    </div>
  );
}