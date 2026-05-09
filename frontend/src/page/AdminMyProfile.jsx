// frontend/src/page/AdminMyProfile.jsx
// Personal profile page for admin users (Department Head / Co‑Department Head)
// Design: inline sidebar + glass cards, like UniversityProfile

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Building2, Edit2, Save, X, Camera, Loader2,
  KeyRound, ShieldCheck, Smartphone, Key, Phone,
  LogOut, Search, Activity, FileText, ArrowLeft, Briefcase,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import ChatWidget from '../components/ChatWidget';
import { AdminSidebarInline } from '../components/AdminSidebar';
import './StudentDashboard.css';

const API = 'https://pfe-l31r.onrender.com/api';
const token = () => localStorage.getItem('access_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

// OTP Verification Modal
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
          placeholder="Confirm new password" 
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

export default function AdminMyProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);     // personal user data from /auth/me/
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('public');
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

  const isDeptHead = user?.sub_role === 'admin';
  const avatarInputRef = useRef(null);

  // ================== Fetch personal user info + security ==================
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/me/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const u = data.user;
        setProfile(u);
        if (u.profile_picture_url) {
          let imgUrl = u.profile_picture_url;
          if (!imgUrl.startsWith('http')) imgUrl = `https://pfe-l31r.onrender.com${imgUrl}`;
          setProfileImage(imgUrl);
        } else {
          setProfileImage(null);
        }
      } else {
        toast.error(data.error || 'Error loading profile');
      }
    } catch (err) {
      toast.error('Connection error');
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

  // ================== Save personal info (bio, phone) ==================
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/my-profile/user/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          bio: profile?.bio || '',
          phone: profile?.phone || ''
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated ✅');
        setIsEditing(false);
        await fetchProfile();
      } else {
        toast.error(data.error || 'Error saving profile');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setSaving(false);
    }
  };

  // ================== Upload personal avatar ==================
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5 MB)'); return; }
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
      toast.error('Use JPEG, PNG or GIF');
      return;
    }
    const form = new FormData();
    form.append('avatar', file);
    try {
      const res = await fetch(`${API}/my-profile/user/upload-avatar/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile picture updated ✅');
        await fetchProfile();
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  // ================== Security / 2FA ==================
  const handleEnable2FA = async () => {
    setLoading2FA(true);
    try {
      const res = await fetch(`${API}/auth/enable-email-2fa/`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTwoFAEnabled(true);
        toast.success('2FA enabled');
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch (err) { toast.error('Connection error'); } finally { setLoading2FA(false); setShow2FAModal(false); }
  };

  const handleDisable2FA = async () => {
    setLoading2FA(true);
    try {
      const res = await fetch(`${API}/auth/disable-2fa/`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTwoFAEnabled(false);
        toast.success('2FA disabled');
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch (err) { toast.error('Connection error'); } finally { setLoading2FA(false); }
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
        method: 'POST', headers: authHeaders(),
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
    } catch (err) { toast.error('Connection error'); } finally { setLoadingRecovery(false); }
  };

  const handleVerifyRecoveryOTP = async (otpCode) => {
    setLoadingRecovery(true);
    try {
      const res = await fetch(`${API}/auth/verify-recovery-email/`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ email: pendingRecoveryEmail, code: otpCode })
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
    } catch (err) { toast.error('Connection error'); } finally { setLoadingRecovery(false); }
  };

  const handleRemoveRecoveryEmail = async () => {
    setLoadingRecovery(true);
    try {
      const res = await fetch(`${API}/auth/remove-recovery-email/`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setRecoveryEmailAdded(false);
        toast.success('Recovery email removed');
      } else {
        toast.error(data.error || 'Failed to remove recovery email');
      }
    } catch (err) { toast.error('Connection error'); } finally { setLoadingRecovery(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleBadge = isDeptHead ? 'Department Head' : 'Co‑Department Head';
  const getInitials = () => profile?.username?.charAt(0).toUpperCase() || 'U';

  const dashboardPath = isDeptHead
    ? '/admin/dashboard'
    : '/co-dept-head/dashboard';

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-purple-400" />
    </div>
  );
  if (!profile) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <div className="text-white text-xl">Profile not found</div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      <div className="ml-64 flex-1 min-h-screen py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate(dashboardPath)} className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6">
            <ArrowLeft size={18} /> Back to Dashboard
          </button>

          {showRecoveryOTPModal && (
            <OTPVerificationModal
              email={pendingRecoveryEmail}
              onVerify={handleVerifyRecoveryOTP}
              onClose={() => { setShowRecoveryOTPModal(false); setPendingRecoveryEmail(''); }}
              loading={loadingRecovery}
              title="Recovery Email Verification"
            />
          )}

          <div className="space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              <div className="px-6 pb-6 pt-6">
                <div className="flex items-end gap-5 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl border-4 border-white/20 overflow-hidden bg-white/10 shadow-xl">
                      {profileImage && !imageError ? (
                        <img src={profileImage} alt={profile?.username} className="w-full h-full object-cover" onError={() => { setImageError(true); setProfileImage(null); }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
                          <span className="text-white text-2xl font-bold">{getInitials()}</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl cursor-pointer opacity-0 hover:opacity-100 transition" title="Change profile picture">
                      <Camera size={16} className="text-white" />
                      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/gif" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <div className="flex-1 flex items-center justify-between pt-10 flex-wrap gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-white">{profile?.full_name || profile?.username}</h1>
                      <p className="text-purple-400 text-sm mt-1">{roleBadge} · {profile?.university || ''}</p>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition"><Edit2 size={15} /> Edit Profile</button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setIsEditing(false); fetchProfile(); }} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition"><X size={15} /> Cancel</button>
                          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/20 pb-2">
              <button onClick={() => setActiveTab('public')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'public' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>Public Profile</button>
              <button onClick={() => setActiveTab('private')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'private' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>Private Info & Security</button>
            </div>

            {/* PUBLIC TAB */}
            {activeTab === 'public' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs text-white/50 font-medium">Username</label>
                    <p className="text-white text-sm mt-1">@{profile?.username || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 font-medium">Role</label>
                    <p className="text-white text-sm mt-1"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">{roleBadge}</span></p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-white/50 font-medium">Bio / Description</label>
                    {isEditing ? (
                      <textarea value={profile?.bio || ''} onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))} rows={3} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none mt-1 resize-none" placeholder="Describe yourself..." />
                    ) : (
                      <p className="text-white/80 text-sm mt-1">{profile?.bio || '—'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PRIVATE TAB */}
            {activeTab === 'private' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="text-xs text-white/50 font-medium">Email</label><p className="text-white text-sm mt-1">{profile?.email || '—'}</p></div>
                  <div>
                    <label className="text-xs text-white/50 font-medium">Phone</label>
                    {isEditing ? (
                      <input type="tel" value={profile?.phone || ''} onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none mt-1" placeholder="+213 XX XXX XXXX" />
                    ) : (
                      <p className="text-white text-sm mt-1">{profile?.phone || '—'}</p>
                    )}
                  </div>
                  <div><label className="text-xs text-white/50 font-medium">Account Status</label><p className="text-white text-sm mt-1"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${profile?.status ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{profile?.status ? 'Active' : 'Pending'}</span></p></div>
                  <div><label className="text-xs text-white/50 font-medium">Registration Date</label><p className="text-white text-sm mt-1">{profile?.created_at || '—'}</p></div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2"><ShieldCheck size={18} /> Security</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-white/50 font-medium">Password</label>
                      {!showChangePassword ? (
                        <button onClick={() => setShowChangePassword(true)} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/20 transition"><KeyRound size={14} /> Change Password</button>
                      ) : (
                        <PasswordChangeWithOTP onClose={() => setShowChangePassword(false)} onSuccess={() => setShowChangePassword(false)} />
                      )}
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                      <div><p className="text-sm font-medium text-white">Two-factor authentication</p><p className="text-xs text-white/50">Add an extra layer of security to your account</p></div>
                      {!twoFAEnabled ? (
                        <button onClick={() => setShow2FAModal(true)} disabled={loading2FA} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">Enable</button>
                      ) : (
                        <button onClick={handleDisable2FA} disabled={loading2FA} className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">Disable</button>
                      )}
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                      <div><p className="text-sm font-medium text-white">Recovery email</p><p className="text-xs text-white/50">Add a recovery email to reset your password</p></div>
                      {!recoveryEmailAdded ? (
                        <button onClick={() => setShowRecoveryModal(true)} disabled={loadingRecovery} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">Add</button>
                      ) : (
                        <button onClick={handleRemoveRecoveryEmail} disabled={loadingRecovery} className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ChatWidget university={user?.university || 'University'} />

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="profile-modal-overlay" onClick={() => setShow2FAModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header"><Smartphone size={20} /><h3>Enable Two-Factor Authentication</h3><button className="profile-modal-close" onClick={() => setShow2FAModal(false)}>×</button></div>
            <div className="profile-modal-body">
              <p>Two-factor authentication adds an extra layer of security to your account.</p>
              <div className="profile-modal-info"><strong>How it works:</strong><ul><li>Download an authenticator app (Google Authenticator, Microsoft Authenticator)</li><li>Scan the QR code that will appear</li><li>Enter the 6-digit code from the app to verify</li></ul></div>
            </div>
            <div className="profile-modal-footer"><button className="profile-modal-cancel" onClick={() => setShow2FAModal(false)}>Cancel</button><button className="profile-modal-confirm" onClick={handleEnable2FA}>Enable 2FA</button></div>
          </div>
        </div>
      )}

      {/* Recovery Email Modal */}
      {showRecoveryModal && (
        <div className="profile-modal-overlay" onClick={() => setShowRecoveryModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header"><Key size={20} /><h3>Add Recovery Email</h3><button className="profile-modal-close" onClick={() => setShowRecoveryModal(false)}>×</button></div>
            <div className="profile-modal-body">
              <p>Add a recovery email to reset your password if you lose access to your account.</p>
              <p className="text-sm text-white/50 mt-2">A verification code will be sent to this email.</p>
              <input type="email" placeholder="Enter recovery email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} className="profile-modal-input" />
            </div>
            <div className="profile-modal-footer"><button className="profile-modal-cancel" onClick={() => setShowRecoveryModal(false)}>Cancel</button><button className="profile-modal-confirm" onClick={handleAddRecoveryEmail} disabled={loadingRecovery}>{loadingRecovery ? 'Sending...' : 'Send Code'}</button></div>
          </div>
        </div>
      )}

      <style>{`
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .ml-64 {
            margin-left: 220px !important;
          }
          .flex.items-end.gap-5 {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .pt-10 {
            padding-top: 0 !important;
          }
          .flex-1.flex.items-center.justify-between {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }
          .grid-cols-1.md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 580px) {
          .ml-64 {
            margin-left: 200px !important;
          }
          .w-20.h-20 {
            width: 60px;
            height: 60px;
          }
          .text-2xl.font-bold {
            font-size: 1.2rem;
          }
        }
        
        @media (max-width: 480px) {
          .ml-64 {
            margin-left: 180px !important;
          }
          .px-6 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .gap-2 {
            gap: 0.5rem;
          }
          .px-4.py-2 {
            padding: 0.5rem 0.75rem;
            font-size: 0.7rem;
          }
          .text-sm {
            font-size: 0.7rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .bg-white\\/10 {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .text-white,
        body.light-mode .text-white\\/70,
        body.light-mode .text-white\\/80,
        body.light-mode .text-white\\/90 {
          color: #1a1a2e !important;
        }
        body.light-mode .text-white\\/50,
        body.light-mode .text-white\\/60 {
          color: #666 !important;
        }
        body.light-mode .text-purple-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .bg-purple-500\\/20 {
          background: rgba(141, 35, 212, 0.1) !important;
        }
        body.light-mode .border-white\\/20 {
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-white\\/5 {
          background: rgba(0, 0, 0, 0.03) !important;
        }
        body.light-mode .bg-purple-600 {
          background: #8D23D4 !important;
        }
        body.light-mode .bg-purple-600:hover {
          background: #6B21A5 !important;
        }
        body.light-mode .bg-green-600 {
          background: #059669 !important;
        }
        body.light-mode .bg-green-600:hover {
          background: #047857 !important;
        }
        body.light-mode .bg-red-600\\/20 {
          background: rgba(220, 38, 38, 0.1) !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
        }
        body.light-mode .text-green-300 {
          color: #059669 !important;
        }
        body.light-mode .text-yellow-300 {
          color: #d97706 !important;
        }
        body.light-mode input,
        body.light-mode textarea {
          color: #1a1a2e !important;
        }
        body.light-mode input::placeholder,
        body.light-mode textarea::placeholder {
          color: #999 !important;
        }
        body.light-mode .bg-black\\/50 {
          background: rgba(0, 0, 0, 0.6) !important;
        }
        body.light-mode .profile-modal {
          background: white !important;
        }
        body.light-mode .profile-modal .text-white,
        body.light-mode .profile-modal .text-white\\/60,
        body.light-mode .profile-modal .text-white\\/50 {
          color: #1a1a2e !important;
        }
        body.light-mode .profile-modal .bg-white\\/10 {
          background: rgba(141, 35, 212, 0.05) !important;
        }
      `}</style>
    </div>
  );
}