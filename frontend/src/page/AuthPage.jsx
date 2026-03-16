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
  X,
  Building2,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./AuthPage.css";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showRoles, setShowRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Student registration state
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

  // Company registration state
  const [companyData, setCompanyData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    company_name: "",
    description: "",
    location: "",
    website: "",
    industry: "",
  });

  // Admin registration state (avec wilaya et university)
  const [adminData, setAdminData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    full_name: "",
    wilaya: "",
    university: ""
  });

  const [skillInput, setSkillInput] = useState("");

  const roles = [
    { value: "Student", label: "Student", icon: <GraduationCap size={18} /> },
    { value: "Company", label: "Company", icon: <Briefcase size={18} /> },
    {
      value: "Administration",
      label: "Administration",
      icon: <Shield size={18} />,
    },
  ];

  const wilayas = [
    "Adrar",
    "Chlef",
    "Laghouat",
    "Oum El Bouaghi",
    "Batna",
    "Béjaïa",
    "Biskra",
    "Béchar",
    "Blida",
    "Bouira",
    "Tamanrasset",
    "Tébessa",
    "Tlemcen",
    "Tiaret",
    "Tizi Ouzou",
    "Alger",
    "Djelfa",
    "Jijel",
    "Sétif",
    "Saïda",
    "Skikda",
    "Sidi Bel Abbès",
    "Annaba",
    "Guelma",
    "Constantine",
    "Médéa",
    "Mostaganem",
    "M'Sila",
    "Mascara",
    "Ouargla",
    "Oran",
    "El Bayadh",
    "Illizi",
    "Bordj Bou Arreridj",
    "Boumerdès",
    "El Tarf",
    "Tindouf",
    "Tissemsilt",
    "El Oued",
    "Khenchela",
    "Souk Ahras",
    "Tipaza",
    "Mila",
    "Aïn Defla",
    "Naâma",
    "Aïn Témouchent",
    "Ghardaïa",
    "Relizane",
  ];

  const educationLevels = [
    "Licence",
    "Master 1",
    "Master 2",
    "Ingénieur",
    "Doctorat",
  ];

  const industries = [
    "Informatique",
    "Télécoms",
    "Finance",
    "Commerce",
    "Industrie",
    "Énergie",
    "BTP",
    "Services",
    "Conseil",
    "Marketing",
    "Santé",
    "Autre",
  ];

  const { login, registerStudent, registerCompany, registerAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(loginData.email, loginData.password);

    if (result.success) {
      toast.success("Connexion réussie!");
      navigate(result.redirectUrl);
    } else {
      toast.error(result.message || "Erreur de connexion");
    }

    setLoading(false);
  };

  const handleStudentRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (studentData.password !== studentData.confirm_password) {
      toast.error("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (studentData.skills.length === 0) {
      toast.error("Ajoutez au moins une compétence");
      setLoading(false);
      return;
    }

    const apiData = {
      ...studentData,
      graduation_year: parseInt(studentData.graduation_year),
    };

    const result = await registerStudent(apiData);

    if (result.success) {
      toast.success("Inscription réussie!");
      navigate(result.redirectUrl);
    } else {
      toast.error("Erreur lors de l'inscription");
      if (result.errors) {
        console.error("Erreurs:", result.errors);
      }
    }

    setLoading(false);
  };

  const handleCompanyRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (companyData.password !== companyData.confirm_password) {
      toast.error("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    const result = await registerCompany(companyData);

    if (result.success) {
      toast.success("Inscription réussie!");
      navigate(result.redirectUrl);
    } else {
      toast.error("Erreur lors de l'inscription");
      if (result.errors) {
        console.error("Erreurs:", result.errors);
      }
    }

    setLoading(false);
  };

  const handleAdminRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (adminData.password !== adminData.confirm_password) {
      toast.error("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    const result = await registerAdmin(adminData);

    if (result.success) {
      toast.success("Inscription admin réussie!");
      navigate(result.redirectUrl);
    } else {
      toast.error(result.message || "Erreur d'inscription admin");
    }

    setLoading(false);
  };

  const addSkill = () => {
    if (skillInput.trim() && !studentData.skills.includes(skillInput.trim())) {
      setStudentData({
        ...studentData,
        skills: [...studentData.skills, skillInput.trim()],
      });
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => {
    setStudentData({
      ...studentData,
      skills: studentData.skills.filter((s) => s !== skill),
    });
  };

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
            <h1 className="welcome-text">
              {isLogin ? "WELCOME BACK!" : "WELCOME!"}
            </h1>
            <p className="sub-text">
              {isLogin
                ? "Login to access your internship dashboard."
                : "Create your account to start your internship journey."}
            </p>
          </div>
        </motion.div>

        {/* Login Form */}
        <div
          className={`form-section ${isLogin ? "form-visible" : "form-hidden"}`}
        >
          <h2 className="form-title">Login</h2>
          <form onSubmit={handleLogin} className="input-stack">
            <InputGroup
              icon={<Mail size={20} />}
              label="Email"
              type="email"
              value={loginData.email}
              onChange={(e) =>
                setLoginData({ ...loginData, email: e.target.value })
              }
              required
            />
            <InputGroup
              icon={<Lock size={20} />}
              label="Password"
              type="password"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({ ...loginData, password: e.target.value })
              }
              required
            />

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>

            <p className="toggle-text">
              Don't have an account?{" "}
              <span onClick={() => setIsLogin(false)}>Sign Up</span>
            </p>
          </form>
        </div>

        {/* Sign Up Form */}
        <div
          className={`form-section right ${!isLogin ? "form-visible" : "form-hidden"}`}
        >
          <h2 className="form-title">Sign Up</h2>

          {/* Role Selector */}
          <div className="role-container" style={{ marginBottom: "20px" }}>
            <div
              className="role-selector"
              onClick={() => setShowRoles(!showRoles)}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {selectedRole &&
                  roles.find((r) => r.value === selectedRole)?.icon}
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
                      onClick={() => {
                        setSelectedRole(r.value);
                        setShowRoles(false);
                      }}
                      className="role-item"
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {r.icon}
                        <span>{r.label}</span>
                      </div>
                      {selectedRole === r.value && (
                        <CheckSquare size={14} color="#a855f7" />
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dynamic Forms Based on Role */}
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
                  <h3
                    style={{
                      color: "white",
                      marginBottom: "15px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <GraduationCap size={20} />
                    Student Registration
                  </h3>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<User size={18} />}
                      label="Username"
                      type="text"
                      value={studentData.username}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          username: e.target.value,
                        })
                      }
                      required
                    />
                    <InputGroup
                      icon={<Mail size={18} />}
                      label="Email"
                      type="email"
                      value={studentData.email}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<Lock size={18} />}
                      label="Password"
                      type="password"
                      value={studentData.password}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                    <InputGroup
                      icon={<Lock size={18} />}
                      label="Confirm Password"
                      type="password"
                      value={studentData.confirm_password}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          confirm_password: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<User size={18} />}
                      label="Full Name"
                      type="text"
                      value={studentData.full_name}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          full_name: e.target.value,
                        })
                      }
                      required
                    />
                    <div className="input-group">
                      <select
                        value={studentData.wilaya}
                        onChange={(e) =>
                          setStudentData({
                            ...studentData,
                            wilaya: e.target.value,
                          })
                        }
                        required
                        style={{
                          background: "transparent",
                          color: "white",
                          width: "100%",
                          border: "none",
                          outline: "none",
                        }}
                      >
                        <option value="" style={{ background: "#120d1d" }}>
                          Select Wilaya
                        </option>
                        {wilayas.map((w) => (
                          <option
                            key={w}
                            value={w}
                            style={{ background: "#120d1d" }}
                          >
                            {w}
                          </option>
                        ))}
                      </select>
                      <MapPin size={18} className="icon" />
                    </div>
                  </div>

                  {/* Skills */}
                  <div
                    className="input-group"
                    style={{ flexDirection: "column", alignItems: "stretch" }}
                  >
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="Add a skill"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        style={{
                          background: "transparent",
                          color: "white",
                          border: "none",
                          outline: "none",
                          flex: 1,
                        }}
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        style={{ color: "#a855f7" }}
                      >
                        Add
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                        marginTop: "5px",
                      }}
                    >
                      {studentData.skills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            background: "#2d1b4d",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            style={{ color: "#ef4444" }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<Github size={18} />}
                      label="GitHub (optional)"
                      type="url"
                      value={studentData.github}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          github: e.target.value,
                        })
                      }
                    />
                    <InputGroup
                      icon={<Globe size={18} />}
                      label="Portfolio (optional)"
                      type="url"
                      value={studentData.portfolio}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          portfolio: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="input-group">
                      <select
                        value={studentData.education_level}
                        onChange={(e) =>
                          setStudentData({
                            ...studentData,
                            education_level: e.target.value,
                          })
                        }
                        required
                        style={{
                          background: "transparent",
                          color: "white",
                          width: "100%",
                          border: "none",
                          outline: "none",
                        }}
                      >
                        <option value="" style={{ background: "#120d1d" }}>
                          Education Level
                        </option>
                        {educationLevels.map((level) => (
                          <option
                            key={level}
                            value={level}
                            style={{ background: "#120d1d" }}
                          >
                            {level}
                          </option>
                        ))}
                      </select>
                      <GraduationCap size={18} className="icon" />
                    </div>
                    <InputGroup
                      icon={<BookOpen size={18} />}
                      label="University"
                      type="text"
                      value={studentData.university}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          university: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<Award size={18} />}
                      label="Major"
                      type="text"
                      value={studentData.major}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          major: e.target.value,
                        })
                      }
                      required
                    />
                    <InputGroup
                      icon={<Calendar size={18} />}
                      label="Graduation Year"
                      type="number"
                      value={studentData.graduation_year}
                      onChange={(e) =>
                        setStudentData({
                          ...studentData,
                          graduation_year: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

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
                  <h3
                    style={{
                      color: "white",
                      marginBottom: "15px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Briefcase size={20} />
                    Company Registration
                  </h3>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<User size={18} />}
                      label="Username"
                      type="text"
                      value={companyData.username}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          username: e.target.value,
                        })
                      }
                      required
                    />
                    <InputGroup
                      icon={<Mail size={18} />}
                      label="Email"
                      type="email"
                      value={companyData.email}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<Lock size={18} />}
                      label="Password"
                      type="password"
                      value={companyData.password}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                    <InputGroup
                      icon={<Lock size={18} />}
                      label="Confirm Password"
                      type="password"
                      value={companyData.confirm_password}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          confirm_password: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <InputGroup
                    icon={<Building2 size={18} />}
                    label="Company Name"
                    type="text"
                    value={companyData.company_name}
                    onChange={(e) =>
                      setCompanyData({
                        ...companyData,
                        company_name: e.target.value,
                      })
                    }
                    required
                  />

                  <div className="input-group">
                    <textarea
                      placeholder="Description"
                      value={companyData.description}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          description: e.target.value,
                        })
                      }
                      required
                      rows="2"
                      style={{
                        background: "transparent",
                        color: "white",
                        width: "100%",
                        border: "none",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                    <FileText
                      size={18}
                      className="icon"
                      style={{ top: "10px" }}
                    />
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="input-group">
                      <select
                        value={companyData.location}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            location: e.target.value,
                          })
                        }
                        required
                        style={{
                          background: "transparent",
                          color: "white",
                          width: "100%",
                          border: "none",
                          outline: "none",
                        }}
                      >
                        <option value="" style={{ background: "#120d1d" }}>
                          Location (Wilaya)
                        </option>
                        {wilayas.map((w) => (
                          <option
                            key={w}
                            value={w}
                            style={{ background: "#120d1d" }}
                          >
                            {w}
                          </option>
                        ))}
                      </select>
                      <MapPin size={18} className="icon" />
                    </div>

                    <div className="input-group">
                      <select
                        value={companyData.industry}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            industry: e.target.value,
                          })
                        }
                        required
                        style={{
                          background: "transparent",
                          color: "white",
                          width: "100%",
                          border: "none",
                          outline: "none",
                        }}
                      >
                        <option value="" style={{ background: "#120d1d" }}>
                          Industry
                        </option>
                        {industries.map((ind) => (
                          <option
                            key={ind}
                            value={ind}
                            style={{ background: "#120d1d" }}
                          >
                            {ind}
                          </option>
                        ))}
                      </select>
                      <Briefcase size={18} className="icon" />
                    </div>
                  </div>

                  <InputGroup
                    icon={<Globe size={18} />}
                    label="Website (optional)"
                    type="url"
                    value={companyData.website}
                    onChange={(e) =>
                      setCompanyData({
                        ...companyData,
                        website: e.target.value,
                      })
                    }
                  />

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
                  <h3
                    style={{
                      color: "white",
                      marginBottom: "15px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Shield size={20} />
                    Administration Registration
                  </h3>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<User size={18} />}
                      label="Username"
                      type="text"
                      value={adminData.username}
                      onChange={(e) =>
                        setAdminData({ ...adminData, username: e.target.value })
                      }
                      required
                    />
                    <InputGroup
                      icon={<Mail size={18} />}
                      label="Email"
                      type="email"
                      value={adminData.email}
                      onChange={(e) =>
                        setAdminData({ ...adminData, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2">
                    <InputGroup
                      icon={<Lock size={18} />}
                      label="Password"
                      type="password"
                      value={adminData.password}
                      onChange={(e) =>
                        setAdminData({ ...adminData, password: e.target.value })
                      }
                      required
                    />
                    <InputGroup
                      icon={<Lock size={18} />}
                      label="Confirm Password"
                      type="password"
                      value={adminData.confirm_password}
                      onChange={(e) =>
                        setAdminData({
                          ...adminData,
                          confirm_password: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <InputGroup
                    icon={<User size={18} />}
                    label="Full Name"
                    type="text"
                    value={adminData.full_name}
                    onChange={(e) =>
                      setAdminData({ ...adminData, full_name: e.target.value })
                    }
                    required
                  />

                  <div className="grid grid-cols-2">
                    <div className="input-group">
                      <select
                        value={adminData.wilaya}
                        onChange={(e) =>
                          setAdminData({ ...adminData, wilaya: e.target.value })
                        }
                        required
                        style={{
                          background: "transparent",
                          color: "white",
                          width: "100%",
                          border: "none",
                          outline: "none",
                        }}
                      >
                        <option value="" style={{ background: "#120d1d" }}>
                          Select Wilaya
                        </option>
                        {wilayas.map((w) => (
                          <option
                            key={w}
                            value={w}
                            style={{ background: "#120d1d" }}
                          >
                            {w}
                          </option>
                        ))}
                      </select>
                      <MapPin size={18} className="icon" />
                    </div>

                    <InputGroup
                      icon={<BookOpen size={18} />}
                      label="University"
                      type="text"
                      value={adminData.university}
                      onChange={(e) =>
                        setAdminData({
                          ...adminData,
                          university: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? "Creating..." : "Register as Admin"}
                  </button>
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
    <input
      type={type}
      placeholder={label}
      value={value}
      onChange={onChange}
      required={required}
    />
  </div>
);

export default AuthPage;
