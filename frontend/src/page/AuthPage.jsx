import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  ChevronDown,
  CheckSquare,
  Briefcase,
  GraduationCap,
  Shield,
  Github,
  Globe,
  MapPin,
  BookOpen,
  Calendar,
  Award,
  Building2,
  FileText,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { VALIDATION_MESSAGES, extractErrors } from "../utils/messages";
import "./AuthPage.css";

// Red error banner shown inside the form
const FormError = ({ messages }) => {
  if (!messages || messages.length === 0) return null;
  return (
    <div
      style={{
        background: "rgba(239,68,68,0.15)",
        border: "1px solid rgba(239,68,68,0.5)",
        borderRadius: "8px",
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#fca5a5",
            fontSize: "13px",
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{msg}</span>
        </div>
      ))}
    </div>
  );
};

// Purple pending banner shown after successful company/admin signup
const PendingBanner = ({ message }) => (
  <div
    style={{
      background: "rgba(168,85,247,0.15)",
      border: "1px solid rgba(168,85,247,0.5)",
      borderRadius: "8px",
      padding: "14px 16px",
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      color: "#d8b4fe",
      fontSize: "13px",
      lineHeight: "1.5",
    }}
  >
    <Clock size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
    <span>{message}</span>
  </div>
);

// OTP Verification Component
const OTPVerification = ({ email, onVerify, onBack, loading, error, setError }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const displayError = error || localError;
  
  const handleChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    if (displayError) {
      if (setError) setError('');
      setLocalError('');
    }
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setLocalError('Le code de vérification doit contenir exactement 6 chiffres.');
      return;
    }
    setLocalError('');
    if (setError) setError('');
    setIsLoading(true);
    try {
      await onVerify(email, fullCode);
    } catch (err) {
      // L'erreur est déjà gérée dans onVerify
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResend = async () => {
    setLocalError('');
    if (setError) setError('');
    try {
      const storedData = localStorage.getItem('pending_signup_data');
      if (storedData) {
        const { role, data } = JSON.parse(storedData);
        const response = await fetch('http://localhost:8000/api/auth/initiate-signup/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, ...data })
        });
        const result = await response.json();
        if (result.success) {
          setCode(['', '', '', '', '', '']);
        } else {
          setLocalError(result.message || 'Erreur lors du renvoi');
        }
      }
    } catch (error) {
      setLocalError('Erreur de connexion');
    }
  };
  
  return (
    <div className="otp-container" style={{ marginTop: "20px" }}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-white text-xl font-semibold">Vérification par email</h3>
        <p className="text-white/60 text-sm mt-2">
          Un code de vérification a été envoyé à <strong>{email}</strong>
        </p>
        <p className="text-white/40 text-xs mt-1">
          Valable 15 minutes
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-3">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              className="w-12 h-12 text-center text-2xl font-bold bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
              autoFocus={index === 0}
            />
          ))}
        </div>
        
        {displayError && (
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
            <span>{displayError}</span>
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading || loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition disabled:opacity-50"
        >
          {isLoading || loading ? "Vérification..." : "Vérifier le code"}
        </button>
        
        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            className="text-purple-400 text-sm hover:underline"
          >
            Renvoyer le code
          </button>
        </div>
        
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2 text-white/60 text-sm hover:text-white transition"
        >
          ← Retour au formulaire
        </button>
      </form>
    </div>
  );
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showRoles, setShowRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpError, setOtpError] = useState("");

  const [loginErrors, setLoginErrors] = useState([]);
  const [studentErrors, setStudentErrors] = useState([]);
  const [companyErrors, setCompanyErrors] = useState([]);
  const [adminErrors, setAdminErrors] = useState([]);
  const [companyPending, setCompanyPending] = useState("");
  const [adminPending, setAdminPending] = useState("");

  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const [studentData, setStudentData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    full_name: "",
    wilaya: "",
    skills: [],
    github: "",
    portfolio: "",
    education_level: "",
    university: "",
    major: "",
    graduation_year: "",
  });

  const [companyData, setCompanyData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    sub_role: "",
    company_manager_email: "",
    company_name_for_hiring: "",
    company_name: "",
    description: "",
    location: "",
    website: "",
    industry: "",
  });

  const [adminData, setAdminData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    sub_role: "",
    dept_head_email: "",
    university_for_verification: "",
    full_name: "",
    wilaya: "",
    university: "",
  });

  const [skillInput, setSkillInput] = useState("");

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

  const roles = [
    { value: "Student", label: "Student", icon: <GraduationCap size={18} /> },
    { value: "Company", label: "Company", icon: <Briefcase size={18} /> },
    { value: "Administration", label: "Administration", icon: <Shield size={18} /> },
  ];

  const wilayas = [
    "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra",
    "Béchar","Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret",
    "Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda","Skikda",
    "Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem",
    "M'Sila","Mascara","Ouargla","Oran","El Bayadh","Illizi",
    "Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf","Tissemsilt",
    "El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla",
    "Naâma","Aïn Témouchent","Ghardaïa","Relizane",
  ];

  const educationLevels = ["Licence","Master 1","Master 2","Ingénieur","Doctorat"];

  const industries = [
    "Informatique","Télécoms","Finance","Commerce","Industrie","Énergie",
    "BTP","Services","Conseil","Marketing","Santé","Autre",
  ];

  const { login, registerStudent, registerCompany, registerAdmin, completeSignup } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErrors([]);
    setLoading(true);
    
    if (!loginData.email || !loginData.password) {
      setLoginErrors([VALIDATION_MESSAGES.LOGIN_CREDENTIALS_REQUIRED]);
      setLoading(false);
      return;
    }
    
    const result = await login(loginData.email, loginData.password);
    if (result.success) {
      navigate(result.redirectUrl);
    } else {
      if (result.message) {
        setLoginErrors([result.message]);
      } else if (result.errors) {
        const errors = extractErrors(result.errors);
        if (errors.length > 0) {
          setLoginErrors(errors);
        } else {
          setLoginErrors([VALIDATION_MESSAGES.LOGIN_INVALID]);
        }
      } else {
        setLoginErrors([VALIDATION_MESSAGES.LOGIN_INVALID]);
      }
    }
    setLoading(false);
  };

  const handleStudentRegister = async (e) => {
    e.preventDefault();
    setStudentErrors([]);
    setCompanyPending("");
    setAdminPending("");

    if (studentData.password !== studentData.confirm_password) {
      setStudentErrors([VALIDATION_MESSAGES.PASSWORD_MISMATCH]);
      return;
    }
    
    const passwordError = validatePassword(studentData.password);
    if (passwordError) {
      setStudentErrors([passwordError]);
      return;
    }
    
    if (studentData.skills.length === 0) {
      setStudentErrors([VALIDATION_MESSAGES.SKILLS_REQUIRED]);
      return;
    }
    
    const email = studentData.email;
    if (!email.includes('univ') || !email.includes('.dz')) {
      setStudentErrors([VALIDATION_MESSAGES.STUDENT_EMAIL_UNIVERSITY]);
      return;
    }

    setLoading(true);
    
    const result = await registerStudent({
      ...studentData,
      graduation_year: parseInt(studentData.graduation_year),
    });
    
    if (result.success) {
      setPendingEmail(result.email);
      localStorage.setItem('pending_signup_data', JSON.stringify({
        role: 'student',
        data: { ...studentData, graduation_year: parseInt(studentData.graduation_year) }
      }));
      setShowOTP(true);
    } else {
      setStudentErrors(
        result.errors ? extractErrors(result.errors) : [result.message || "Registration failed."]
      );
    }
    setLoading(false);
  };

  const handleCompanyRegister = async (e) => {
    e.preventDefault();
    setCompanyErrors([]);
    setCompanyPending("");

    if (companyData.password !== companyData.confirm_password) {
      setCompanyErrors([VALIDATION_MESSAGES.PASSWORD_MISMATCH]);
      return;
    }
    
    const passwordError = validatePassword(companyData.password);
    if (passwordError) {
      setCompanyErrors([passwordError]);
      return;
    }
    
    if (!companyData.sub_role) {
      setCompanyErrors([VALIDATION_MESSAGES.ROLE_REQUIRED]);
      return;
    }

    setLoading(true);
    
    const result = await registerCompany(companyData);
    
    if (result.success) {
      setPendingEmail(result.email);
      localStorage.setItem('pending_signup_data', JSON.stringify({
        role: 'company',
        data: companyData
      }));
      setShowOTP(true);
    } else {
      setCompanyErrors(
        result.errors ? extractErrors(result.errors) : [result.message || "Registration failed."]
      );
    }
    setLoading(false);
  };

  const handleAdminRegister = async (e) => {
    e.preventDefault();
    setAdminErrors([]);
    setAdminPending("");

    if (adminData.password !== adminData.confirm_password) {
      setAdminErrors([VALIDATION_MESSAGES.PASSWORD_MISMATCH]);
      return;
    }
    
    const passwordError = validatePassword(adminData.password);
    if (passwordError) {
      setAdminErrors([passwordError]);
      return;
    }
    
    if (!adminData.sub_role) {
      setAdminErrors([VALIDATION_MESSAGES.ROLE_REQUIRED]);
      return;
    }

    setLoading(true);
    
    const result = await registerAdmin(adminData);
    
    if (result.success) {
      setPendingEmail(result.email);
      localStorage.setItem('pending_signup_data', JSON.stringify({
        role: 'admin',
        data: adminData
      }));
      setShowOTP(true);
    } else {
      setAdminErrors(
        result.errors ? extractErrors(result.errors) : [result.message || "Registration failed."]
      );
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (email, code) => {
    const result = await completeSignup(email, code);
    
    if (result.success) {
      if (result.redirectUrl) {
        navigate(result.redirectUrl);
      } else if (result.pending) {
        if (result.sub_role === 'company_manager') {
          setCompanyPending("Votre compte a été créé et est en attente d'approbation. Veuillez attendre qu'un administrateur active votre compte.");
        } else if (result.sub_role === 'hiring_manager') {
          setCompanyPending("Votre compte a été créé et est en attente d'approbation. Veuillez attendre que votre Company Manager active votre compte.");
        } else if (result.sub_role === 'admin') {
          setAdminPending("Votre compte a été créé et est en attente d'approbation. Veuillez attendre qu'un administrateur supérieur active votre compte.");
        } else if (result.sub_role === 'co_dept_head') {
          setAdminPending("Votre compte a été créé et est en attente d'approbation. Veuillez attendre que le Department Head de votre université active votre compte.");
        } else {
          setCompanyPending(result.message);
        }
        setShowOTP(false);
        setPendingEmail("");
        localStorage.removeItem('pending_signup_data');
        setOtpError("");
      }
    } else {
      if (result.message) {
        setOtpError(result.message);
      } else if (result.errors) {
        const errorMessages = extractErrors(result.errors);
        if (errorMessages.length > 0) {
          setOtpError(errorMessages[0]);
        } else {
          setOtpError("Code invalide. Veuillez réessayer.");
        }
      } else {
        setOtpError("Code invalide. Veuillez réessayer.");
      }
    }
  };

  const handleBackToForm = () => {
    setShowOTP(false);
    setPendingEmail("");
    localStorage.removeItem('pending_signup_data');
    setOtpError("");
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !studentData.skills.includes(trimmed)) {
      setStudentData({ ...studentData, skills: [...studentData.skills, trimmed] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => {
    setStudentData({ ...studentData, skills: studentData.skills.filter((s) => s !== skill) });
  };

  const selectStyle = {
    background: "transparent",
    color: "white",
    width: "100%",
    border: "none",
    outline: "none",
  };

  const optStyle = { background: "#120d1d" };

  return (
    <div className="auth-page-wrapper">
      <div className="main-container">

        <motion.div
          animate={{ x: isLogin ? "100%" : "0%" }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
          className={`sliding-panel ${isLogin ? "clip-login" : "clip-signup"}`}
        >
          <div className="panel-content">
            <h1 className="welcome-text">{isLogin ? "WELCOME BACK!" : "WELCOME!"}</h1>
            <p className="sub-text">
              {isLogin
                ? "Login to access your internship dashboard."
                : (
                  <>
                    Create your account to start your internship journey.
                    <br />
                    <span className="panel-login-link" onClick={() => setIsLogin(true)}>
                      Already have an account? Log in
                    </span>
                  </>
                )}
            </p>
          </div>
        </motion.div>

        <div className={`form-section ${isLogin ? "form-visible" : "form-hidden"}`}>
          <h2 className="form-title">Login</h2>
          <form onSubmit={handleLogin} className="input-stack">
            <InputGroup
              icon={<Mail size={20} />}
              label="Email"
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              required
            />
            <InputGroup
              icon={<Lock size={20} />}
              label="Password"
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
            />
            <FormError messages={loginErrors} />
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>
            
            <div className="text-right mt-2">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-purple-400 text-sm hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
            
            <p className="toggle-text">
              Don't have an account?{" "}
              <span onClick={() => setIsLogin(false)}>Sign Up</span>
            </p>
          </form>
        </div>

        <div className={`form-section right ${!isLogin ? "form-visible" : "form-hidden"}`}>
          <h2 className="form-title">Sign Up</h2>

          <div className="role-container" style={{ marginBottom: "20px" }}>
            <div className="role-selector" onClick={() => setShowRoles(!showRoles)}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedRole && roles.find((r) => r.value === selectedRole)?.icon}
                <span style={{ color: selectedRole ? "white" : "#9ca3af" }}>
                  {selectedRole
                    ? roles.find((r) => r.value === selectedRole)?.label
                    : "Select your role"}
                </span>
              </div>
              <ChevronDown
                size={18}
                style={{ transform: showRoles ? "rotate(180deg)" : "none" }}
              />
            </div>
            <AnimatePresence>
              {showRoles && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="role-dropdown-bottom"
                >
                  {roles.map((r) => (
                    <div
                      key={r.value}
                      onClick={() => { setSelectedRole(r.value); setShowRoles(false); }}
                      className="role-item"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {r.icon}
                        <span>{r.label}</span>
                      </div>
                      {selectedRole === r.value && <CheckSquare size={14} color="#a855f7" />}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {showOTP ? (
            <OTPVerification
              email={pendingEmail}
              onVerify={handleVerifyOTP}
              onBack={handleBackToForm}
              loading={loading}
              error={otpError}
              setError={setOtpError}
            />
          ) : (
            <>
              {companyPending && <PendingBanner message={companyPending} />}
              {adminPending && <PendingBanner message={adminPending} />}
              
              {!companyPending && !adminPending && (
                <AnimatePresence mode="wait">
                  {selectedRole === "Student" && (
                    <motion.div
                      key="student"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="form-scrollable"
                    >
                      <form onSubmit={handleStudentRegister} className="input-stack">
                        <h3 style={{ color: "white", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <GraduationCap size={20} /> Student Registration
                        </h3>
                        <InputGroup icon={<User size={18} />} label="Username" type="text"
                          value={studentData.username}
                          onChange={(e) => setStudentData({ ...studentData, username: e.target.value })} required />
                        <InputGroup icon={<Mail size={18} />} label="University Email (must contain univ and .dz)" type="email"
                          value={studentData.email}
                          onChange={(e) => setStudentData({ ...studentData, email: e.target.value })} required />
                        <InputGroup icon={<Lock size={18} />} label="Password" type="password"
                          value={studentData.password}
                          onChange={(e) => setStudentData({ ...studentData, password: e.target.value })} required />
                        <InputGroup icon={<Lock size={18} />} label="Confirm Password" type="password"
                          value={studentData.confirm_password}
                          onChange={(e) => setStudentData({ ...studentData, confirm_password: e.target.value })} required />
                        <InputGroup icon={<User size={18} />} label="Full Name" type="text"
                          value={studentData.full_name}
                          onChange={(e) => setStudentData({ ...studentData, full_name: e.target.value })} required />
                        <div className="input-group">
                          <select value={studentData.wilaya}
                            onChange={(e) => setStudentData({ ...studentData, wilaya: e.target.value })}
                            required style={selectStyle}>
                            <option value="" style={optStyle}>Select Wilaya</option>
                            {wilayas.map((w) => <option key={w} value={w} style={optStyle}>{w}</option>)}
                          </select>
                          <MapPin size={18} className="icon" />
                        </div>
                        <div className="input-group" style={{ flexDirection: "column", alignItems: "stretch" }}>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <input type="text" placeholder="Add a skill" value={skillInput}
                              onChange={(e) => setSkillInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                              style={{ background: "transparent", color: "white", border: "none", outline: "none", flex: 1 }} />
                            <button type="button" onClick={addSkill} style={{ color: "#a855f7" }}>Add</button>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "5px" }}>
                            {studentData.skills.map((skill) => (
                              <span key={skill} style={{
                                background: "#2d1b4d", padding: "2px 8px", borderRadius: "12px",
                                fontSize: "12px", display: "flex", alignItems: "center", gap: "4px",
                              }}>
                                {skill}
                                <button type="button" onClick={() => removeSkill(skill)} style={{ color: "#ef4444" }}>×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <InputGroup icon={<Github size={18} />} label="GitHub (optional)" type="url"
                          value={studentData.github}
                          onChange={(e) => setStudentData({ ...studentData, github: e.target.value })} />
                        <InputGroup icon={<Globe size={18} />} label="Portfolio (optional)" type="url"
                          value={studentData.portfolio}
                          onChange={(e) => setStudentData({ ...studentData, portfolio: e.target.value })} />
                        <div className="input-group">
                          <select value={studentData.education_level}
                            onChange={(e) => setStudentData({ ...studentData, education_level: e.target.value })}
                            required style={selectStyle}>
                            <option value="" style={optStyle}>Education Level</option>
                            {educationLevels.map((l) => <option key={l} value={l} style={optStyle}>{l}</option>)}
                          </select>
                          <GraduationCap size={18} className="icon" />
                        </div>
                        <InputGroup icon={<BookOpen size={18} />} label="University" type="text"
                          value={studentData.university}
                          onChange={(e) => setStudentData({ ...studentData, university: e.target.value })} required />
                        <InputGroup icon={<Award size={18} />} label="Major" type="text"
                          value={studentData.major}
                          onChange={(e) => setStudentData({ ...studentData, major: e.target.value })} required />
                        <InputGroup icon={<Calendar size={18} />} label="Graduation Year" type="number"
                          value={studentData.graduation_year}
                          onChange={(e) => setStudentData({ ...studentData, graduation_year: e.target.value })} required />
                        <FormError messages={studentErrors} />
                        <button type="submit" className="auth-btn" disabled={loading}>
                          {loading ? "Creating..." : "Sign up as Student"}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {selectedRole === "Company" && (
                    <motion.div
                      key="company"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="form-scrollable"
                    >
                      <form onSubmit={handleCompanyRegister} className="input-stack">
                        <h3 style={{ color: "white", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Briefcase size={20} /> Company Registration
                        </h3>
                        <InputGroup icon={<User size={18} />} label="Username" type="text"
                          value={companyData.username}
                          onChange={(e) => setCompanyData({ ...companyData, username: e.target.value })} required />
                        <InputGroup icon={<Mail size={18} />} label="Email" type="email"
                          value={companyData.email}
                          onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })} required />
                        <InputGroup icon={<Lock size={18} />} label="Password" type="password"
                          value={companyData.password}
                          onChange={(e) => setCompanyData({ ...companyData, password: e.target.value })} required />
                        <InputGroup icon={<Lock size={18} />} label="Confirm Password" type="password"
                          value={companyData.confirm_password}
                          onChange={(e) => setCompanyData({ ...companyData, confirm_password: e.target.value })} required />
                        <div className="input-group">
                          <select value={companyData.sub_role}
                            onChange={(e) => {
                              setCompanyData({ 
                                ...companyData, 
                                sub_role: e.target.value,
                                company_manager_email: "",
                                company_name_for_hiring: "",
                                company_name: "",
                                description: "",
                                location: "",
                                industry: "",
                                website: ""
                              });
                            }}
                            required style={selectStyle}>
                            <option value="" style={optStyle}>Select your role</option>
                            <option value="company_manager" style={optStyle}>Company Manager</option>
                            <option value="hiring_manager" style={optStyle}>Hiring Manager</option>
                          </select>
                          <Briefcase size={18} className="icon" />
                        </div>
                        {companyData.sub_role === "company_manager" && (
                          <>
                            <InputGroup icon={<Building2 size={18} />} label="Company Name" type="text"
                              value={companyData.company_name}
                              onChange={(e) => setCompanyData({ ...companyData, company_name: e.target.value })} required />
                            <div className="input-group">
                              <textarea placeholder="Description" value={companyData.description}
                                onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                                required rows="2"
                                style={{ background: "transparent", color: "white", width: "100%", border: "none", outline: "none", resize: "vertical" }} />
                              <FileText size={18} className="icon" style={{ top: "10px" }} />
                            </div>
                            <div className="input-group">
                              <select value={companyData.location}
                                onChange={(e) => setCompanyData({ ...companyData, location: e.target.value })}
                                required style={selectStyle}>
                                <option value="" style={optStyle}>Location (Wilaya)</option>
                                {wilayas.map((w) => <option key={w} value={w} style={optStyle}>{w}</option>)}
                              </select>
                              <MapPin size={18} className="icon" />
                            </div>
                            <div className="input-group">
                              <select value={companyData.industry}
                                onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                                required style={selectStyle}>
                                <option value="" style={optStyle}>Industry</option>
                                {industries.map((ind) => <option key={ind} value={ind} style={optStyle}>{ind}</option>)}
                              </select>
                              <Briefcase size={18} className="icon" />
                            </div>
                            <InputGroup icon={<Globe size={18} />} label="Website (optional)" type="url"
                              value={companyData.website}
                              onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })} />
                          </>
                        )}
                        {companyData.sub_role === "hiring_manager" && (
                          <>
                            <InputGroup icon={<Mail size={18} />} label="Company Manager Email" type="email"
                              value={companyData.company_manager_email}
                              onChange={(e) => setCompanyData({ ...companyData, company_manager_email: e.target.value })}
                              required />
                            <InputGroup icon={<Building2 size={18} />} label="Company Name (to verify)" type="text"
                              value={companyData.company_name_for_hiring}
                              onChange={(e) => setCompanyData({ ...companyData, company_name_for_hiring: e.target.value })}
                              placeholder="Enter the company name as registered"
                              required />
                            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "-10px", marginBottom: "10px" }}>
                              ⓘ Entrez le nom exact de l'entreprise du Company Manager
                            </div>
                          </>
                        )}
                        <FormError messages={companyErrors} />
                        <button type="submit" className="auth-btn" disabled={loading}>
                          {loading ? "Creating..." : "Register Company"}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {selectedRole === "Administration" && (
                    <motion.div
                      key="admin"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="form-scrollable"
                    >
                      <form onSubmit={handleAdminRegister} className="input-stack">
                        <h3 style={{ color: "white", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Shield size={20} /> Administration Registration
                        </h3>
                        <InputGroup icon={<User size={18} />} label="Username" type="text"
                          value={adminData.username}
                          onChange={(e) => setAdminData({ ...adminData, username: e.target.value })} required />
                        <InputGroup icon={<Mail size={18} />} label="Email" type="email"
                          value={adminData.email}
                          onChange={(e) => setAdminData({ ...adminData, email: e.target.value })} required />
                        <InputGroup icon={<Lock size={18} />} label="Password" type="password"
                          value={adminData.password}
                          onChange={(e) => setAdminData({ ...adminData, password: e.target.value })} required />
                        <InputGroup icon={<Lock size={18} />} label="Confirm Password" type="password"
                          value={adminData.confirm_password}
                          onChange={(e) => setAdminData({ ...adminData, confirm_password: e.target.value })} required />
                        <div className="input-group">
                          <select value={adminData.sub_role}
                            onChange={(e) => {
                              setAdminData({ 
                                ...adminData, 
                                sub_role: e.target.value,
                                dept_head_email: "",
                                university_for_verification: "",
                                full_name: "",
                                wilaya: "",
                                university: ""
                              });
                            }}
                            required style={selectStyle}>
                            <option value="" style={optStyle}>Select your role</option>
                            <option value="admin" style={optStyle}>Department Head</option>
                            <option value="co_dept_head" style={optStyle}>Co Department Head</option>
                          </select>
                          <Shield size={18} className="icon" />
                        </div>
                        {adminData.sub_role === "admin" && (
                          <>
                            <InputGroup icon={<User size={18} />} label="Full Name" type="text"
                              value={adminData.full_name}
                              onChange={(e) => setAdminData({ ...adminData, full_name: e.target.value })} required />
                            <div className="input-group">
                              <select value={adminData.wilaya}
                                onChange={(e) => setAdminData({ ...adminData, wilaya: e.target.value })}
                                required style={selectStyle}>
                                <option value="" style={optStyle}>Select Wilaya</option>
                                {wilayas.map((w) => <option key={w} value={w} style={optStyle}>{w}</option>)}
                              </select>
                              <MapPin size={18} className="icon" />
                            </div>
                            <InputGroup icon={<BookOpen size={18} />} label="University" type="text"
                              value={adminData.university}
                              onChange={(e) => setAdminData({ ...adminData, university: e.target.value })} required />
                          </>
                        )}
                        {adminData.sub_role === "co_dept_head" && (
                          <>
                            <InputGroup icon={<Mail size={18} />} label="Department Head Email" type="email"
                              value={adminData.dept_head_email}
                              onChange={(e) => setAdminData({ ...adminData, dept_head_email: e.target.value })}
                              placeholder="Email of the Department Head"
                              required />
                            <InputGroup icon={<BookOpen size={18} />} label="University (to verify)" type="text"
                              value={adminData.university_for_verification}
                              onChange={(e) => setAdminData({ ...adminData, university_for_verification: e.target.value })}
                              placeholder="Enter the university name as registered"
                              required />
                            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "-10px", marginBottom: "10px" }}>
                              ⓘ Entrez le nom exact de l'université du Department Head
                            </div>
                          </>
                        )}
                        <FormError messages={adminErrors} />
                        <button type="submit" className="auth-btn" disabled={loading}>
                          {loading ? "Creating..." : "Register as Admin"}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </>
          )}

          {!selectedRole && !isLogin && !showOTP && !companyPending && !adminPending && (
            <p className="toggle-text" style={{ marginTop: "20px" }}>
              Already have an account?{" "}
              <span onClick={() => setIsLogin(true)}>Login</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ icon, label, type, value, onChange, required }) => (
  <div className="input-group">
    {icon && <span className="icon">{icon}</span>}
    <input type={type} placeholder={label} value={value} onChange={onChange} required={required} />
  </div>
);

export default AuthPage;