import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useNavigate } from "react-router-dom";
import "./AuthPage.css";

// Flatten { field: ["msg"] } → ["msg", ...]
const extractErrors = (errors) => {
  if (!errors) return [];
  return Object.values(errors).flatMap((v) => (Array.isArray(v) ? v : [v]));
};

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

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showRoles, setShowRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);

  // Per-form error & pending state
  const [loginErrors, setLoginErrors] = useState([]);
  const [studentErrors, setStudentErrors] = useState([]);
  const [companyErrors, setCompanyErrors] = useState([]);
  const [adminErrors, setAdminErrors] = useState([]);
  const [companyPending, setCompanyPending] = useState("");
  const [adminPending, setAdminPending] = useState("");

  // Login form
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  // Student form
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

  // Company form
  const [companyData, setCompanyData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    sub_role: "",                 // 'company_manager' | 'hiring_manager'
    company_manager_email: "",    // only used when sub_role === 'hiring_manager'
    company_name: "",
    description: "",
    location: "",
    website: "",
    industry: "",
  });

  // Admin form
  const [adminData, setAdminData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    sub_role: "",                 // 'admin' | 'co_dept_head'
    full_name: "",
    wilaya: "",
    university: "",
  });

  const [skillInput, setSkillInput] = useState("");

  const roles = [
    { value: "Student",        label: "Student",        icon: <GraduationCap size={18} /> },
    { value: "Company",        label: "Company",        icon: <Briefcase size={18} /> },
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

  const { login, registerStudent, registerCompany, registerAdmin } = useAuth();
  const navigate = useNavigate();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErrors([]);
    setLoading(true);
    const result = await login(loginData.email, loginData.password);
    if (result.success) {
      navigate(result.redirectUrl);
    } else {
      setLoginErrors(
        result.errors ? extractErrors(result.errors) : [result.message || "Login failed."]
      );
    }
    setLoading(false);
  };

  const handleStudentRegister = async (e) => {
    e.preventDefault();
    setStudentErrors([]);

    if (studentData.password !== studentData.confirm_password) {
      setStudentErrors(["Passwords do not match."]);
      return;
    }
    if (studentData.password.length < 8) {
      setStudentErrors(["Password must be at least 8 characters."]);
      return;
    }
    if (studentData.skills.length === 0) {
      setStudentErrors(["Please add at least one skill."]);
      return;
    }

    setLoading(true);
    const result = await registerStudent({
      ...studentData,
      graduation_year: parseInt(studentData.graduation_year),
    });
    if (result.success) {
      navigate(result.redirectUrl);
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
      setCompanyErrors(["Passwords do not match."]);
      return;
    }
    if (companyData.password.length < 8) {
      setCompanyErrors(["Password must be at least 8 characters."]);
      return;
    }
    if (!companyData.sub_role) {
      setCompanyErrors(["Please select your role within the company."]);
      return;
    }

    setLoading(true);
    const result = await registerCompany(companyData);
    if (result.success && result.pending) {
      setCompanyPending(result.message);
    } else if (result.success) {
      navigate(result.redirectUrl);
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
      setAdminErrors(["Passwords do not match."]);
      return;
    }
    if (adminData.password.length < 8) {
      setAdminErrors(["Password must be at least 8 characters."]);
      return;
    }
    if (!adminData.sub_role) {
      setAdminErrors(["Please select your role."]);
      return;
    }

    setLoading(true);
    const result = await registerAdmin(adminData);
    if (result.success && result.pending) {
      setAdminPending(result.message);
    } else if (result.success) {
      navigate(result.redirectUrl);
    } else {
      setAdminErrors(
        result.errors ? extractErrors(result.errors) : [result.message || "Registration failed."]
      );
    }
    setLoading(false);
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

  // ── Shared select style ───────────────────────────────────────────────────
  const selectStyle = {
    background: "transparent",
    color: "white",
    width: "100%",
    border: "none",
    outline: "none",
  };
  const optStyle = { background: "#120d1d" };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page-wrapper">
      <div className="main-container">

        {/* Sliding Purple Panel */}
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

        {/* ── LOGIN FORM ── */}
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
            <p className="toggle-text">
              Don't have an account?{" "}
              <span onClick={() => setIsLogin(false)}>Sign Up</span>
            </p>
          </form>
        </div>

        {/* ── SIGN UP FORM ── */}
        <div className={`form-section right ${!isLogin ? "form-visible" : "form-hidden"}`}>
          <h2 className="form-title">Sign Up</h2>

          {/* Role Selector */}
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

          <AnimatePresence mode="wait">

            {/* ════ STUDENT FORM ════ */}
            {selectedRole === "Student" && (
              <motion.div
                key="student"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="form-scrollable"
              >
                <form onSubmit={handleStudentRegister} className="input-stack">
                  <h3 style={{ color: "white", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <GraduationCap size={20} /> Student Registration
                  </h3>

                  <InputGroup icon={<User size={18} />} label="Username" type="text"
                    value={studentData.username}
                    onChange={(e) => setStudentData({ ...studentData, username: e.target.value })} required />

                  <InputGroup icon={<Mail size={18} />} label="University Email (must contain univ.dz)" type="email"
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

                  {/* Skills */}
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

            {/* ════ COMPANY FORM ════ */}
            {selectedRole === "Company" && (
              <motion.div
                key="company"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
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

                  {/* Sub-role selector */}
                  <div className="input-group">
                    <select value={companyData.sub_role}
                      onChange={(e) => setCompanyData({ ...companyData, sub_role: e.target.value, company_manager_email: "" })}
                      required style={selectStyle}>
                      <option value="" style={optStyle}>Select your role</option>
                      <option value="company_manager" style={optStyle}>Company Manager</option>
                      <option value="hiring_manager" style={optStyle}>Hiring Manager</option>
                    </select>
                    <Briefcase size={18} className="icon" />
                  </div>

                  {/* Company manager email — only for hiring managers */}
                  {companyData.sub_role === "hiring_manager" && (
                    <InputGroup icon={<Mail size={18} />} label="Company Manager Email" type="email"
                      value={companyData.company_manager_email}
                      onChange={(e) => setCompanyData({ ...companyData, company_manager_email: e.target.value })}
                      required />
                  )}

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

                  {/* Show pending banner OR errors + submit button */}
                  {companyPending ? (
                    <PendingBanner message={companyPending} />
                  ) : (
                    <>
                      <FormError messages={companyErrors} />
                      <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Creating..." : "Register Company"}
                      </button>
                    </>
                  )}
                </form>
              </motion.div>
            )}

            {/* ════ ADMINISTRATION FORM ════ */}
            {selectedRole === "Administration" && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
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

                  {/* Sub-role selector */}
                  <div className="input-group">
                    <select value={adminData.sub_role}
                      onChange={(e) => setAdminData({ ...adminData, sub_role: e.target.value })}
                      required style={selectStyle}>
                      <option value="" style={optStyle}>Select your role</option>
                      <option value="admin" style={optStyle}>Admin</option>
                      <option value="co_dept_head" style={optStyle}>Co Department Head</option>
                    </select>
                    <Shield size={18} className="icon" />
                  </div>

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

                  {/* Show pending banner OR errors + submit button */}
                  {adminPending ? (
                    <PendingBanner message={adminPending} />
                  ) : (
                    <>
                      <FormError messages={adminErrors} />
                      <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Creating..." : "Register as Admin"}
                      </button>
                    </>
                  )}
                </form>
              </motion.div>
            )}

          </AnimatePresence>

          {!selectedRole && !isLogin && (
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