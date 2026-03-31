// frontend/src/page/StudentDashboard.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import "./StudentDashboard.css";

const API = "http://localhost:8000/api";

const token = () => localStorage.getItem("access_token");
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token()}`,
});

// SVG Icons (unchanged)
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const wilayas = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira",
  "Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda",
  "Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara",
  "Ouargla","Oran","El Bayadh","Illizi","Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf",
  "Tissemsilt","El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma",
  "Aïn Témouchent","Ghardaïa","Relizane",
];
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const ImgPlaceholder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const UsersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15z" />
  </svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Star component
function Stars({ n = 5, max = 5 }) {
  return (
    <div className="sd-stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star${i >= n ? " empty" : ""}`}>★</span>
      ))}
    </div>
  );
}

// Apply Modal
const ApplyModal = ({ offer, onClose, onSuccess }) => {
  const [step, setStep] = useState('check'); // check, cv, confirm
  const [loading, setLoading] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [formData, setFormData] = useState({});
  const [missing, setMissing] = useState([]);
  const [profileError, setProfileError] = useState(false);

  // CV form fields
  const [cvFields, setCvFields] = useState({
    full_name: '',
    email: '',
    university: '',
    major: '',
    education_level: '',
    graduation_year: '',
    skills: [],
    objective: '',
    experience: [],
    languages: [],
  });

  useEffect(() => {
    fetch(`${API}/student/profile/`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const profile = data.profile;
          const required = ['full_name', 'wilaya', 'skills', 'education_level', 'university', 'major', 'graduation_year'];
          const missingFields = required.filter(f => !profile[f] || (Array.isArray(profile[f]) && profile[f].length === 0));
          if (missingFields.length > 0) {
            setMissing(missingFields);
            setStep('incomplete');
          } else {
            setCvFields({
              full_name: profile.full_name,
              email: profile.email,
              university: profile.university,
              major: profile.major,
              education_level: profile.education_level,
              graduation_year: profile.graduation_year,
              skills: profile.skills,
              objective: '',
              experience: [],
              languages: [],
            });
            setStep('cv');
          }
        } else {
          setProfileError(true);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleGenerateCV = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/student/generate-custom-cv/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(cvFields),
      });
      const blob = await res.blob();
      const file = new File([blob], `${cvFields.full_name}_CV.pdf`, { type: 'application/pdf' });
      setCvFile(file);
      setStep('confirm');
    } catch (err) {
      alert('Failed to generate CV');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    const form = new FormData();
    form.append('cv_file', cvFile);
    form.append('cover_letter', document.getElementById('cover_letter').value);
    try {
      const res = await fetch(`${API}/student/offers/${offer.id}/apply/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(); // call parent's handler
        onClose();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error submitting application');
    } finally {
      setLoading(false);
    }
  };

  const updateCvField = (field, value) => {
    setCvFields(prev => ({ ...prev, [field]: value }));
  };

  const addExperience = () => {
    setCvFields(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', dates: '', description: '' }]
    }));
  };

  const updateExperience = (idx, field, value) => {
    const newExp = [...cvFields.experience];
    newExp[idx][field] = value;
    setCvFields(prev => ({ ...prev, experience: newExp }));
  };

  const removeExperience = (idx) => {
    setCvFields(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx)
    }));
  };

  const addLanguage = () => {
    setCvFields(prev => ({
      ...prev,
      languages: [...prev.languages, { name: '', level: '' }]
    }));
  };

  const updateLanguage = (idx, field, value) => {
    const newLang = [...cvFields.languages];
    newLang[idx][field] = value;
    setCvFields(prev => ({ ...prev, languages: newLang }));
  };

  const removeLanguage = (idx) => {
    setCvFields(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== idx)
    }));
  };

  if (step === 'incomplete') {
    return (
      <div className="sd-modal-overlay" onClick={onClose}>
        <div className="sd-modal" onClick={e => e.stopPropagation()}>
          <button className="sd-modal-close" onClick={onClose}><CloseIcon /></button>
          <h3>Incomplete Profile</h3>
          <p>Please complete the following fields before applying:</p>
          <ul>{missing.map(f => <li key={f}>{f}</li>)}</ul>
          <button onClick={() => {/* navigate to profile edit */}}>Edit Profile</button>
        </div>
      </div>
    );
  }

  if (step === 'cv') {
    return (
      <div className="sd-modal-overlay" onClick={onClose}>
        <div className="sd-modal" style={{ maxWidth: '600px', maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <button className="sd-modal-close" onClick={onClose}><CloseIcon /></button>
          <h3>CV Information</h3>
          <p>Fill in your CV details. You can edit them before generating the final CV.</p>
          <div className="grid grid-cols-1 gap-3 mt-4">
            <div>
              <label>Full Name *</label>
              <input type="text" value={cvFields.full_name} onChange={e => updateCvField('full_name', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" />
            </div>
            <div>
              <label>Email *</label>
              <input type="email" value={cvFields.email} onChange={e => updateCvField('email', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" />
            </div>
            <div>
              <label>University *</label>
              <input type="text" value={cvFields.university} onChange={e => updateCvField('university', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" />
            </div>
            <div>
              <label>Major *</label>
              <input type="text" value={cvFields.major} onChange={e => updateCvField('major', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" />
            </div>
            <div>
              <label>Education Level *</label>
              <select value={cvFields.education_level} onChange={e => updateCvField('education_level', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2">
                <option value="Licence">Licence</option>
                <option value="Master 1">Master 1</option>
                <option value="Master 2">Master 2</option>
                <option value="Ingénieur">Ingénieur</option>
                <option value="Doctorat">Doctorat</option>
              </select>
            </div>
            <div>
              <label>Graduation Year *</label>
              <input type="number" value={cvFields.graduation_year} onChange={e => updateCvField('graduation_year', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" />
            </div>
            <div>
              <label>Skills (comma-separated)</label>
              <input type="text" value={cvFields.skills.join(', ')} onChange={e => updateCvField('skills', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-white/10 border rounded px-3 py-2" />
            </div>
            <div>
              <label>Objective (optional)</label>
              <textarea value={cvFields.objective} onChange={e => updateCvField('objective', e.target.value)} rows="3" className="w-full bg-white/10 border rounded px-3 py-2" />
            </div>
            <div>
              <label>Work Experience</label>
              {cvFields.experience.map((exp, idx) => (
                <div key={idx} className="border p-2 mb-2 rounded">
                  <input placeholder="Title" value={exp.title} onChange={e => updateExperience(idx, 'title', e.target.value)} className="w-full bg-white/10 border rounded px-2 py-1 mb-1" />
                  <input placeholder="Company" value={exp.company} onChange={e => updateExperience(idx, 'company', e.target.value)} className="w-full bg-white/10 border rounded px-2 py-1 mb-1" />
                  <input placeholder="Dates (e.g., Jan 2020 - May 2020)" value={exp.dates} onChange={e => updateExperience(idx, 'dates', e.target.value)} className="w-full bg-white/10 border rounded px-2 py-1 mb-1" />
                  <textarea placeholder="Description" value={exp.description} onChange={e => updateExperience(idx, 'description', e.target.value)} rows="2" className="w-full bg-white/10 border rounded px-2 py-1 mb-1" />
                  <button onClick={() => removeExperience(idx)} className="text-red-400 text-sm">Remove</button>
                </div>
              ))}
              <button onClick={addExperience} className="bg-purple-600 text-white px-3 py-1 rounded text-sm">+ Add Experience</button>
            </div>
            <div>
              <label>Languages</label>
              {cvFields.languages.map((lang, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                  <input placeholder="Language" value={lang.name} onChange={e => updateLanguage(idx, 'name', e.target.value)} className="flex-1 bg-white/10 border rounded px-2 py-1" />
                  <input placeholder="Level" value={lang.level} onChange={e => updateLanguage(idx, 'level', e.target.value)} className="flex-1 bg-white/10 border rounded px-2 py-1" />
                  <button onClick={() => removeLanguage(idx)} className="text-red-400">Remove</button>
                </div>
              ))}
              <button onClick={addLanguage} className="bg-purple-600 text-white px-3 py-1 rounded text-sm">+ Add Language</button>
            </div>
          </div>
          <div className="sd-modal-actions mt-4">
            <button onClick={handleGenerateCV} disabled={loading} className="sd-modal-submit">
              {loading ? 'Generating...' : 'Generate CV'}
            </button>
            <button onClick={onClose} className="sd-modal-cancel">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="sd-modal-overlay" onClick={onClose}>
        <div className="sd-modal" onClick={e => e.stopPropagation()}>
          <button className="sd-modal-close" onClick={onClose}><CloseIcon /></button>
          <h3>Application Confirmation</h3>
          <p>CV generated: <strong>{cvFile?.name}</strong></p>
          <textarea id="cover_letter" placeholder="Cover letter (optional)" className="w-full bg-white/10 border rounded px-3 py-2 mt-2" rows="4"></textarea>
          <div className="sd-modal-actions mt-4">
            <button onClick={handleConfirm} disabled={loading} className="sd-modal-submit">
              {loading ? 'Submitting...' : 'Confirm Application'}
            </button>
            <button onClick={() => setStep('cv')} className="sd-modal-cancel">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Toast
function Toast({ msg, type, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3500);
    return () => clearTimeout(t);
  }, [onHide]);
  return <div className={`sd-toast ${type}`}>{type === "success" ? "✅" : "❌"} {msg}</div>;
}

// Main Component
export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [internships, setInternships] = useState([]);
  const [loadingComp, setLoadingComp] = useState(true);
  const [loadingInter, setLoadingInter] = useState(true);

  const [activeSection, setActiveSection] = useState("home");
  const [filters, setFilters] = useState({
    search: '',
    wilaya: '',
    skills: '',
    company_name: ''
  });

  const [applyOffer, setApplyOffer] = useState(null);
  const [toast, setToast] = useState(null);

  const homeRef = useRef(null);
  const companiesRef = useRef(null);
  const internshipsRef = useRef(null);

  // Scroll spy
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setActiveSection(e.target.dataset.section);
      }),
      { threshold: 0.35 }
    );
    [homeRef, companiesRef, internshipsRef].forEach(r => r.current && obs.observe(r.current));
    return () => obs.disconnect();
  }, []);

  // Reveal animations
  useEffect(() => {
    const els = document.querySelectorAll(".sd-company-card, .sd-internship-card");
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => revealObs.observe(el));
    return () => revealObs.disconnect();
  }, [companies, internships]);

  // Fetch companies
  useEffect(() => {
    (async () => {
      setLoadingComp(true);
      try {
        const res = await fetch(`${API}/companies/list/`, { headers: authHeaders() });
        const data = await res.json();
        setCompanies(data.companies || data || []);
      } catch { setCompanies([]); }
      finally { setLoadingComp(false); }
    })();
  }, []);

  // Fetch internship offers
  const fetchInternships = useCallback(async () => {
    setLoadingInter(true);
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.wilaya) params.append('wilaya', filters.wilaya);
    if (filters.skills) params.append('skills', filters.skills);
    if (filters.company_name) params.append('company_name', filters.company_name);

    try {
      const res = await fetch(`${API}/student/offers/search/?${params.toString()}`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setInternships(data.offers);
      } else {
        console.error('Failed to fetch internships:', data);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingInter(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  const handleLogout = () => { logout(); navigate("/login"); };

  const scrollTo = (id, ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  const handleApplySuccess = useCallback(() => {
    setToast({ msg: "Candidature soumise avec succès !", type: "success" });
    setTimeout(() => navigate('/student/applications'), 1500);
  }, [navigate]);

  const initials = (user?.full_name || user?.email || "U")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      {applyOffer && (
        <ApplyModal
          offer={applyOffer}
          onClose={() => setApplyOffer(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />
      )}

      <nav className="sd-navbar">
        <div className="sd-navbar-left">
          <button className="sd-hamburger" aria-label="Menu">
            <span /><span /><span />
          </button>
          <a className="sd-logo" href="/">UnivStage</a>
        </div>
        <ul className="sd-nav-links">
          {[
            { id: "home",        label: "Home",                ref: homeRef },
            { id: "companies",   label: "popular companies",   ref: companiesRef },
            { id: "internships", label: "popular internships", ref: internshipsRef },
          ].map(({ id, label, ref }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={activeSection === id ? "active" : ""}
                onClick={e => { e.preventDefault(); scrollTo(id, ref); }}
              >{label}</a>
            </li>
          ))}
        </ul>
        <div className="sd-navbar-right">
          <button className="sd-icon-btn" aria-label="Notifications">
            <BellIcon />
            <span className="sd-badge" />
          </button>
          <button className="sd-icon-btn" aria-label="Dark mode">
            <MoonIcon />
          </button>
          <Link to="/student/applications" className="sd-icon-btn" aria-label="Applications">
            <FileText size={20} />
          </Link>
          <div className="sd-avatar" title={user?.full_name || user?.email}>
            {initials}
          </div>
        </div>
      </nav>

      <main className="sd-main">
        <section className="sd-hero" id="home" ref={homeRef} data-section="home">
          <div className="sd-hero-container">
            <div className="sd-hero-content">
              <h1>
                Welcome<br />
                <span className="name-gradient">
                  {user?.full_name?.split(" ")[0] || "UserName"}
                </span>
              </h1>
              <p>
                The page offers you a dashboard to manage your profile,
                upload your CV, browse internships, and track your applications.
              </p>
              <div className="sd-hero-stars">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className="star">★</span>
                ))}
              </div>

              {/* Responsive search bar */}
              <div className="sd-search-container" style={{ marginTop: "2rem", width: "100%" }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                  alignItems: "end"
                }}>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Search</label>
                    <input
                      type="text"
                      placeholder="Title, description, company..."
                      value={filters.search}
                      onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Wilaya</label>
                    <select
                      value={filters.wilaya}
                      onChange={e => setFilters(prev => ({ ...prev, wilaya: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">All Wilayas</option>
                      {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Skills</label>
                    <input
                      type="text"
                      placeholder="e.g., React, Python (comma-separated)"
                      value={filters.skills}
                      onChange={e => setFilters(prev => ({ ...prev, skills: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Company</label>
                    <input
                      type="text"
                      placeholder="Company name"
                      value={filters.company_name}
                      onChange={e => setFilters(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => fetchInternships()}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition w-full"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="sd-hero-image">
              <img
                src="/images/student-hero.png"
                alt="Student dashboard illustration"
                onError={e => { e.target.style.display = "none"; }}
              />
              <ImgPlaceholder />
            </div>
          </div>
        </section>

        <section className="sd-section" id="companies" ref={companiesRef} data-section="companies">
          <div className="sd-section-header">
            <div>
              <h2 className="sd-section-title">
                <span className="t-pink">Popular </span>
                <span className="t-purple">Companies</span>
              </h2>
              <p className="sd-section-subtitle">
                The popular companies offering internships
              </p>
            </div>
            <button className="sd-see-all-btn">
              See All &nbsp;<ArrowRight />
            </button>
          </div>

          {loadingComp ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <p>Chargement des entreprises…</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="sd-empty">
              <ImgPlaceholder />
              <p>Aucune entreprise disponible pour le moment.</p>
            </div>
          ) : (
            <div className="sd-companies-grid">
              {companies.slice(0, 4).map(c => (
                <div className="sd-company-card" key={c.id}>
                  <div className="sd-company-img">
                    {c.logo ? <img src={c.logo} alt={c.name} /> : <ImgPlaceholder />}
                    {c.sector && <span className="sd-company-badge">{c.sector}</span>}
                  </div>
                  <div className="sd-company-info">
                    <div className="sd-company-name">{c.name || c.company_name}</div>
                    {c.description && <p className="sd-company-desc">{c.description}</p>}
                    <div className="sd-company-meta">
                      <UsersIcon />
                      <span>{c.students_applied ?? 0}</span> students applied
                    </div>
                    <button className="sd-learn-btn" onClick={() => scrollTo("internships", internshipsRef)}>
                      Learn More
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sd-join-banner">
            <h3>Join Us to Apply for Your dream Internship</h3>
            <button className="sd-join-btn" onClick={() => scrollTo("internships", internshipsRef)}>
              Browse Internships
            </button>
          </div>
        </section>

        <section className="sd-section" id="internships" ref={internshipsRef} data-section="internships">
          <div className="sd-section-header">
            <div>
              <h2 className="sd-section-title">
                <span className="t-pink">Popular </span>
                <span className="t-purple">Internships</span>
              </h2>
              <p className="sd-section-subtitle">
                Find the perfect opportunity to start your career
              </p>
            </div>
            <button className="sd-see-all-btn">
              See All &nbsp;<ArrowRight />
            </button>
          </div>

          {loadingInter ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <p>Chargement des offres…</p>
            </div>
          ) : internships.length === 0 ? (
            <div className="sd-empty">
              <ImgPlaceholder />
              <p>Aucune offre de stage disponible.</p>
            </div>
          ) : (
            <div className="sd-internships-grid">
              {internships.slice(0, 3).map(offer => (
                <div className="sd-internship-card" key={offer.id}>
                  <div className="sd-intern-img">
                    {offer.image ? <img src={offer.image} alt={offer.title} /> : <ImgPlaceholder />}
                    <div className="sd-intern-top-badges">
                      <span className="sd-badge-level">{offer.level || "To+ Lesses"}</span>
                      <span className="sd-badge-type">{offer.type || "Design"}</span>
                    </div>
                  </div>
                  <div className="sd-intern-info">
                    <div className="sd-intern-title">{offer.title}</div>
                    <div className="sd-intern-meta-row">
                      <div className="sd-intern-applicants">
                        <UsersIcon />
                        {offer.applicants_count ?? offer.students_count ?? 0}+ Students
                      </div>
                    </div>
                    <div className="sd-intern-rep">
                      <div className="sd-intern-rep-avatar">
                        {(offer.contact_name || offer.company_name || "?")[0].toUpperCase()}
                      </div>
                      <span className="sd-intern-rep-name">
                        {offer.contact_name || offer.company_name}
                      </span>
                    </div>
                    <div className="sd-intern-footer">
                      <Stars n={offer.rating ?? 4} />
                      <button className="sd-enroll-btn" onClick={() => setApplyOffer(offer)}>
                        Enroll Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {internships.length > 3 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
              <button className="sd-see-all-btn">
                See All &nbsp;<ArrowRight />
              </button>
            </div>
          )}
        </section>

        <footer className="footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-brand-logo">🎓 UnivStage</div>
              <p>
                Connecting students with professional opportunities and
                empowering the next generation of innovators.
              </p>
            </div>
            <div className="footer-contact">
              <h4>Contact Us</h4>
              <ul>
                <li><MapPinIcon />123 University Ave, Campus Center, CA 94000</li>
                <li><PhoneIcon />+1 (555) 123-4567</li>
                <li><MailIcon />internships@university.edu</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 UnivStage. All rights reserved.</p>
            <div className="footer-socials">
              <a href="#!" aria-label="Facebook">f</a>
              <a href="#!" aria-label="Twitter">𝕏</a>
              <a href="#!" aria-label="LinkedIn">in</a>
              <a href="#!" aria-label="Instagram">◎</a>
            </div>
            <div className="footer-bottom-links">
              <a href="#!">Privacy Policy</a>
              <span>|</span>
              <a href="#!">Terms of Service</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}