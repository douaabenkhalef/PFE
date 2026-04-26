// frontend/src/page/ForgotPassword.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [usingRecovery, setUsingRecovery] = useState(false);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (/^\d+$/.test(password)) {
      return 'Password cannot be only digits.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter.';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number.';
    }
    return null;
  };

  const FormError = ({ message }) => {
    if (!message) return null;
    return (
      <div
        style={{
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.5)",
          borderRadius: "8px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#fca5a5",
          fontSize: "13px",
        }}
      >
        <AlertCircle size={14} style={{ flexShrink: 0 }} />
        <span>{message}</span>
      </div>
    );
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setEmailError('');
    
    if (!email) {
      setEmailError('Email is required.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Use the endpoint that supports recovery email
      const response = await fetch('http://localhost:8000/api/auth/forgot-password-recovery/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.email_exists === false) {
          setEmailError(data.message || 'No account found with this email.');
          setLoading(false);
          return;
        }
        
        // Show appropriate message based on whether recovery email was used
        toast.success(data.message);
        setUsingRecovery(data.using_recovery || false);
        setStep('otp');
      } else {
        setEmailError(data.message || 'Error sending code');
      }
    } catch (error) {
      setEmailError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setOtpError('');
    setPasswordError('');
    
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      setOtpError('The verification code must contain exactly 6 digits.');
      return;
    }
    
    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: fullCode,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStep('success');
      } else {
        if (data.code_invalid) {
          setOtpError(data.message || 'Invalid code. Please try again.');
          setCode(['', '', '', '', '', '']);
        } else {
          setPasswordError(data.message || 'Error resetting password');
        }
      }
    } catch (error) {
      setOtpError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    if (otpError) setOtpError('');
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleResendCode = async () => {
    setOtpError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/forgot-password-recovery/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success && data.email_exists !== false) {
        setCode(['', '', '', '', '', '']);
        setOtpError('');
        toast.success('New code sent to your email');
      } else {
        setOtpError('No account found with this email.');
        setStep('email');
      }
    } catch (error) {
      setOtpError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        {step === 'email' && (
          <>
            <button
              onClick={() => navigate('/login')}
              className="mb-4 text-white/60 hover:text-white transition flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Forgot Password?</h2>
              <p className="text-white/60 mt-2">
                Enter your email and we'll send you a reset code
              </p>
            </div>

            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="border-b border-white/20 py-3 flex items-center">
                <Mail className="w-5 h-5 text-white/60" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className="bg-transparent flex-1 ml-3 text-white outline-none"
                  required
                />
              </div>

              <FormError message={emailError} />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <button
              onClick={() => setStep('email')}
              className="mb-4 text-white/60 hover:text-white transition flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Verification</h2>
              <p className="text-white/60 mt-2">
                A code has been sent to {usingRecovery ? 'your recovery email' : <strong>{email}</strong>}
              </p>
              {usingRecovery && (
                <p className="text-purple-400 text-xs mt-1">
                  🔐 Using your recovery email for security
                </p>
              )}
              <p className="text-white/40 text-xs mt-1">
                Valid for 15 minutes
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="text-white/80 text-sm block mb-2">Verification code (6 digits)</label>
                <div className="flex justify-center gap-3">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      className="w-12 h-12 text-center text-2xl font-bold bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
                <FormError message={otpError} />
              </div>

              <div>
                <label className="text-white/80 text-sm block mb-2">New Password</label>
                <div className="border-b border-white/20 py-3 flex items-center">
                  <Lock className="w-5 h-5 text-white/60" />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    className="bg-transparent flex-1 ml-3 text-white outline-none"
                    required
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">
                  Min. 8 characters, 1 uppercase, 1 lowercase, 1 number
                </p>
              </div>

              <div>
                <label className="text-white/80 text-sm block mb-2">Confirm Password</label>
                <div className="border-b border-white/20 py-3 flex items-center">
                  <Lock className="w-5 h-5 text-white/60" />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    className="bg-transparent flex-1 ml-3 text-white outline-none"
                    required
                  />
                </div>
              </div>

              <FormError message={passwordError} />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-purple-400 text-sm hover:underline"
                >
                  Resend code
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-white/60 mb-6">
              Your password has been successfully changed. You can now log in with your new password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;