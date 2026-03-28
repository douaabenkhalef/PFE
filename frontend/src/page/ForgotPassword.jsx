import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

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

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    if (/^\d+$/.test(password)) {
      return 'Le mot de passe ne peut pas être composé uniquement de chiffres.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Le mot de passe doit contenir au moins une lettre majuscule.';
    }
    if (!/[a-z]/.test(password)) {
      return 'Le mot de passe doit contenir au moins une lettre minuscule.';
    }
    if (!/[0-9]/.test(password)) {
      return 'Le mot de passe doit contenir au moins un chiffre.';
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
      setEmailError('L\'email est requis.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.email_exists === false || (data.success === false && data.message === 'Aucun compte trouvé avec cet email.')) {
          setEmailError(data.message || 'Aucun compte trouvé avec cet email.');
          setLoading(false);
          return;
        }
        
        if (data.success) {
          setStep('otp');
        } else {
          setEmailError(data.message || 'Erreur lors de l\'envoi du code');
        }
      } else {
        setEmailError(data.message || 'Erreur lors de l\'envoi du code');
      }
    } catch (error) {
      setEmailError('Erreur de connexion au serveur');
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
      setOtpError('Le code de vérification doit contenir exactement 6 chiffres.');
      return;
    }
    
    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
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
          setOtpError(data.message);
          setCode(['', '', '', '', '', '']);
        } else {
          setPasswordError(data.message);
        }
      }
    } catch (error) {
      setOtpError('Erreur de connexion au serveur');
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
      const response = await fetch('http://localhost:8000/api/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success && data.email_exists !== false) {
        setCode(['', '', '', '', '', '']);
      } else {
        setOtpError('Aucun compte trouvé avec cet email.');
        setStep('email');
      }
    } catch (error) {
      setOtpError('Erreur de connexion');
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
              Retour
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Mot de passe oublié ?</h2>
              <p className="text-white/60 mt-2">
                Entrez votre email et nous vous enverrons un code de réinitialisation
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
                {loading ? 'Envoi...' : 'Envoyer le code'}
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
              Retour
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Vérification</h2>
              <p className="text-white/60 mt-2">
                Un code a été envoyé à <strong>{email}</strong>
              </p>
              <p className="text-white/40 text-xs mt-1">
                Valable 15 minutes
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="text-white/80 text-sm block mb-2">Code de vérification (6 chiffres)</label>
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
                <label className="text-white/80 text-sm block mb-2">Nouveau mot de passe</label>
                <div className="border-b border-white/20 py-3 flex items-center">
                  <Lock className="w-5 h-5 text-white/60" />
                  <input
                    type="password"
                    placeholder="Nouveau mot de passe"
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
                  Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
                </p>
              </div>

              <div>
                <label className="text-white/80 text-sm block mb-2">Confirmer le mot de passe</label>
                <div className="border-b border-white/20 py-3 flex items-center">
                  <Lock className="w-5 h-5 text-white/60" />
                  <input
                    type="password"
                    placeholder="Confirmer le mot de passe"
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
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-purple-400 text-sm hover:underline"
                >
                  Renvoyer le code
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
            <h2 className="text-2xl font-bold text-white mb-2">Mot de passe réinitialisé !</h2>
            <p className="text-white/60 mb-6">
              Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition"
            >
              Se connecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;