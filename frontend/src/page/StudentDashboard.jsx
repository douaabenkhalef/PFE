// frontend/src/page/StudentDashboard.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bell, CheckCheck, X, FileText, CheckCircle, XCircle, Clock, MessageCircle, Users, Briefcase, MessageSquare, MapPin } from 'lucide-react';
import StudentSidebar from '../components/Studentsidebar';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';
import "./StudentDashboard.css";


const API = "https://pfe-l31r.onrender.com/api";
const BACKEND = "https://pfe-l31r.onrender.com"; 

const token = () => localStorage.getItem("access_token");
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token()}`,
});

// Helper function for image URLs - FIXED to handle all image types
const getImageUrl = (url) => {
  if (!url) return null;
  // If image is base64 (starts with data:image)
  if (url.startsWith('data:image')) {
    return url;
  }
  // If it's a full URL
  if (url.startsWith('http')) {
    return url;
  }
  // If URL starts with /api/
  if (url.startsWith('/api/')) {
    return `${BACKEND}${url}`;
  }
  // If URL starts with /media/
  if (url.startsWith('/media/')) {
    return `${BACKEND}${url}`;
  }
  // Default case
  return `${BACKEND}/api/${url}`;
};

// Types de notifications avec icônes
const NOTIFICATION_ICONS = {
    'application_accepted': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    'application_rejected': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    'convention_validated': { icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10' },
    'convention_rejected': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    'pending_validation': { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    'default': { icon: Bell, color: 'text-purple-400', bg: 'bg-purple-500/10' }
};

// SVG Icons
const wilayas = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira",
  "Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda",
  "Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara",
  "Ouargla","Oran","El Bayadh","Illizi","Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf",
  "Tissemsilt","El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma",
  "Aïn Témouchent","Ghardaïa","Relizane",
];

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
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

function Stars({ n = 5, max = 5 }) {
  return (
    <div className="sd-stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star${i >= n ? " empty" : ""}`}>★</span>
      ))}
    </div>
  );
}

const NotificationItem = ({ notification, onMarkRead, onNavigate }) => {
    const [isHovered, setIsHovered] = useState(false);
    const config = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
    const IconComponent = config.icon;
    
    const isSuccess = notification.message.includes('✅') || notification.message.includes('Félicitations');
    const isError = notification.message.includes('❌');
    
    const handleClick = () => {
        if (!notification.is_read && onMarkRead) {
            onMarkRead(notification.id);
        }
        if (notification.related_id && onNavigate) {
            onNavigate(notification.related_id);
        }
    };
    
    return (
        <div 
            className={`sd-notif-item ${!notification.is_read ? 'unread' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            style={{ cursor: notification.related_id ? 'pointer' : 'default' }}
        >
            <div className={`sd-notif-icon ${config.bg}`}>
                <IconComponent size={14} className={config.color} />
            </div>
            <div className="sd-notif-body">
                <p className={isSuccess ? 'text-green-300' : isError ? 'text-red-300' : 'text-white/90'}>
                    {notification.message}
                </p>
                <span className="sd-notif-time">{notification.created_at}</span>
            </div>
            {!notification.is_read && <div className="sd-notif-unread-dot" />}
            {isHovered && !notification.is_read && (
                <button 
                    className="sd-notif-mark-read"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onMarkRead) onMarkRead(notification.id);
                    }}
                >
                    <CheckCheck size={14} />
                </button>
            )}
        </div>
    );
};

const NotificationsDropdown = ({ notifications, onClose, onMarkRead, onMarkAllRead, onNavigate }) => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    return (
        <div className="sd-notif-dropdown">
            <div className="sd-notif-header">
                <div className="flex items-center gap-2">
                    <Bell size={14} className="text-purple-400" />
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="sd-notif-unread-badge">{unreadCount}</span>}
                </div>
                {unreadCount > 0 && (
                    <button className="sd-notif-clear" onClick={onMarkAllRead}>
                        Tout marquer comme lu
                    </button>
                )}
            </div>
            <div className="sd-notif-list">
                {notifications.length === 0 ? (
                    <div className="sd-notif-empty">
                        <Bell size={32} className="mx-auto mb-2 opacity-30" />
                        <p>Aucune notification</p>
                        <span className="text-xs">Les notifications apparaîtront ici</span>
                    </div>
                ) : (
                    notifications.slice(0, 15).map(notif => (
                        <NotificationItem 
                            key={notif.id}
                            notification={notif}
                            onMarkRead={onMarkRead}
                            onNavigate={onNavigate}
                        />
                    ))
                )}
            </div>
            {notifications.length > 0 && (
                <div className="sd-notif-footer">
                    <button onClick={onClose}>Fermer</button>
                </div>
            )}
        </div>
    );
};

const ApplyModal = ({ offer, onClose, onSuccess }) => {
  const [step, setStep] = useState('check'); 
  const [loading, setLoading] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [missing, setMissing] = useState([]);
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
  const navigate = useNavigate();

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
      if (!res.ok) {
        let errMsg = `Server error: ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch (_) { }
        alert(`Failed to generate CV: ${errMsg}`);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to generate CV: ${errData.error || errData.message || 'Unexpected response'}`);
        return;
      }
      const blob = await res.blob();
      const file = new File([blob], `${cvFields.full_name}_CV.pdf`, { type: 'application/pdf' });
      setCvFile(file);
      setStep('confirm');
    } catch (err) {
      console.error('Generate CV error:', err);
      alert('Failed to generate CV: ' + (err.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    const form = new FormData();
    form.append('cv_file', cvFile);
    form.append('cover_letter', document.getElementById('cover_letter')?.value || '');
    try {
      const res = await fetch(`${API}/student/offers/${offer.id}/apply/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
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
          <button onClick={() => navigate('/student/profile')}>Edit Profile</button>
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
            <div><label>Full Name *</label><input type="text" value={cvFields.full_name} onChange={e => updateCvField('full_name', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" /></div>
            <div><label>Email *</label><input type="email" value={cvFields.email} onChange={e => updateCvField('email', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" /></div>
            <div><label>University *</label><input type="text" value={cvFields.university} onChange={e => updateCvField('university', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" /></div>
            <div><label>Major *</label><input type="text" value={cvFields.major} onChange={e => updateCvField('major', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" /></div>
            <div><label>Education Level *</label><select value={cvFields.education_level} onChange={e => updateCvField('education_level', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2">
              <option value="Licence">Licence</option><option value="Master 1">Master 1</option><option value="Master 2">Master 2</option>
              <option value="Ingénieur">Ingénieur</option><option value="Doctorat">Doctorat</option>
            </select></div>
            <div><label>Graduation Year *</label><input type="number" value={cvFields.graduation_year} onChange={e => updateCvField('graduation_year', e.target.value)} className="w-full bg-white/10 border rounded px-3 py-2" /></div>
            <div><label>Skills (comma-separated)</label><input type="text" value={cvFields.skills.join(', ')} onChange={e => updateCvField('skills', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-white/10 border rounded px-3 py-2" /></div>
            <div><label>Objective (optional)</label><textarea value={cvFields.objective} onChange={e => updateCvField('objective', e.target.value)} rows="3" className="w-full bg-white/10 border rounded px-3 py-2" /></div>
            
            <div>
              <label>Work Experience</label>
              {cvFields.experience.map((exp, idx) => (
                <div key={idx} className="border p-2 mb-2 rounded" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
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
            <button onClick={handleGenerateCV} disabled={loading} className="sd-modal-submit">{loading ? 'Generating...' : 'Generate CV'}</button>
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
            <button onClick={handleConfirm} disabled={loading} className="sd-modal-submit">{loading ? 'Submitting...' : 'Confirm Application'}</button>
            <button onClick={() => setStep('cv')} className="sd-modal-cancel">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

function Toast({ msg, type, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3500);
    return () => clearTimeout(t);
  }, [onHide]);
  return <div className={`sd-toast ${type}`}>{type === "success" ? "✅" : "❌"} {msg}</div>;
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [internships, setInternships] = useState([]);
  const [acceptedInternships, setAcceptedInternships] = useState([]);
  const [loadingComp, setLoadingComp] = useState(true);
  const [loadingInter, setLoadingInter] = useState(true);
  const [loadingAccepted, setLoadingAccepted] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAllInternships, setShowAllInternships] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  
  // États pour le chat
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [activeInternshipChat, setActiveInternshipChat] = useState(null);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);

  const [activeSection, setActiveSection] = useState("home");
  const [filters, setFilters] = useState({
    search: '',
    wilaya: '',
    skills: '',
    company_name: ''
  });

  const [applyOffer, setApplyOffer] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const homeRef = useRef(null);
  const companiesRef = useRef(null);
  const internshipsRef = useRef(null);
  const groupsRef = useRef(null);

  // Display first 3 companies (they are already sorted by active_offers from API)
  const displayedCompanies = showAllCompanies ? companies : companies.slice(0, 3);
  const displayedInternships = showAllInternships ? internships : internships.slice(0, 3);

  const handleStartPrivateChat = (targetUser) => {
    setSelectedChatUser(targetUser);
    setPrivateChatOpen(true);
  };

  const handleClosePrivateChat = () => {
    setPrivateChatOpen(false);
    setSelectedChatUser(null);
  };

  const handleOpenInternshipChat = (offerId) => {
    console.log("🔵 Opening chat for offer:", offerId);
    setActiveInternshipChat(offerId);
    setShowGroupsPanel(false);
  };

  const handleCloseInternshipChat = () => {
    setActiveInternshipChat(null);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setActiveSection(e.target.dataset.section);
      }),
      { threshold: 0.35 }
    );
    [homeRef, companiesRef, internshipsRef, groupsRef].forEach(r => r.current && obs.observe(r.current));
    return () => obs.disconnect();
  }, []);

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

  useEffect(() => {
    (async () => {
      setLoadingComp(true);
      try {
        const res = await fetch(`${API}/companies/list/`, { headers: authHeaders() });
        const data = await res.json();
        setCompanies(Array.isArray(data) ? data : []);
      } catch { setCompanies([]); }
      finally { setLoadingComp(false); }
    })();
  }, []);

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
        setInternships(data.offers || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingInter(false);
    }
  }, [filters]);

  const fetchAcceptedInternships = useCallback(async () => {
    setLoadingAccepted(true);
    try {
      const res = await fetch(`${API}/student/accepted-internships/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const internshipsWithOfferId = (data.internships || []).map(internship => ({
          id: internship.id,
          offer_id: internship.offer_id || internship.id,
          title: internship.title,
          company_name: internship.company_name,
          status: internship.status,
          members_count: internship.members_count || 2
        }));
        setAcceptedInternships(internshipsWithOfferId);
      }
    } catch (err) {
      console.error('Error fetching accepted internships:', err);
    } finally {
      setLoadingAccepted(false);
    }
  }, []);

  useEffect(() => {
    fetchInternships();
    fetchAcceptedInternships();
  }, [fetchInternships, fetchAcceptedInternships]);

  const handleLogout = () => { logout(); navigate("/login"); };
   
  const fetchNotifications = useCallback(async () => {
    try {
        const res = await fetch(`${API}/student/notifications/`, { 
            headers: { 
                'Authorization': `Bearer ${token()}`,
                'Content-Type': 'application/json'
            } 
        });
        const data = await res.json();
        if (data.success) {
            setNotifications(data.notifications || []);
        }
    } catch (err) {
        console.error("Erreur lors du chargement des notifications:", err);
    }
  }, []);

  const markNotificationRead = async (notificationId) => {
    try {
        await fetch(`${API}/student/notifications/${notificationId}/read/`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        setNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
    } catch (err) {
        console.error("Erreur:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
        await fetch(`${API}/student/notifications/read-all/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
        console.error("Erreur:", err);
    }
  };

  const navigateToApplication = (applicationId) => {
    navigate(`/student/applications?app=${applicationId}`);
    setNotifOpen(false);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (notifRef.current && !notifRef.current.contains(event.target)) {
            setNotifOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const scrollTo = (id, ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  const handleApplySuccess = useCallback(() => {
    setToastMsg({ msg: "Candidature soumise avec succès !", type: "success" });
    setTimeout(() => navigate('/student/applications'), 1500);
  }, [navigate]);

  const clearFilters = () => {
    setFilters({ search: '', wilaya: '', skills: '', company_name: '' });
    setShowAdvancedFilters(false);
    fetchInternships();
  };

  const hasActiveFilters = filters.search || filters.wilaya || filters.skills || filters.company_name;

  return (
    <>
      {sidebarOpen && (
        <StudentSidebar
          user={user}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {applyOffer && (
        <ApplyModal
          offer={applyOffer}
          onClose={() => setApplyOffer(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {toastMsg && (
        <Toast msg={toastMsg.msg} type={toastMsg.type} onHide={() => setToastMsg(null)} />
      )}

      {/* Chat de groupe */}
      {activeInternshipChat && (
        <ChatWidget 
          internshipId={activeInternshipChat}
          onClose={handleCloseInternshipChat}
        />
      )}
      
      {/* Chat privé */}
      {privateChatOpen && selectedChatUser && (
        <PrivateChat
          university={user?.university || "Université"}
          currentUser={user}
          targetUser={selectedChatUser}
          onClose={handleClosePrivateChat}
        />
      )}

      {/* BOUTON CHAT FLOTTANT */}
      {!activeInternshipChat && acceptedInternships.length > 0 && (
        <button
          onClick={() => setShowGroupsPanel(!showGroupsPanel)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* PANNEAU DES GROUPES DE CHAT */}
      {showGroupsPanel && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-white" />
              <h3 className="text-white font-semibold text-sm">Mes groupes</h3>
            </div>
            <button onClick={() => setShowGroupsPanel(false)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {acceptedInternships.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Briefcase size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Aucun stage accepté</p>
                <p className="text-xs mt-1">Les groupes apparaîtront ici</p>
              </div>
            ) : (
              acceptedInternships.map(internship => (
                <button
                  key={internship.id}
                  onClick={() => {
                    handleOpenInternshipChat(internship.offer_id);
                  }}
                  className="w-full p-3 text-left hover:bg-white/10 transition flex items-center gap-3 border-b border-slate-700 last:border-b-0"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Briefcase size={18} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{internship.title}</p>
                    <p className="text-white/40 text-xs">{internship.company_name}</p>
                  </div>
                  <MessageCircle size={14} className="text-purple-400" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========== NAVBAR ========== */}
      <nav className="sd-navbar">
        <div className="sd-navbar-left">
          <button className="sd-hamburger" aria-label="Menu" onClick={() => setSidebarOpen(true)}>
            <span /><span /><span />
          </button>
          <div className="sd-logo-container" style={{ cursor: 'default' }}>
            <img src="/images/logo.png" alt="UnivStage Logo" className="sd-logo-img" />
            <span className="sd-site-name">UnivStage</span>
          </div>
        </div>
        <ul className="sd-nav-links">
          <li>
            <a 
              href="#home" 
              className={`sd-nav-link ${activeSection === "home" ? "active" : ""}`} 
              onClick={(e) => { 
                e.preventDefault(); 
                scrollTo("home", homeRef); 
              }}
            >
              Home
            </a>
          </li>
          <li>
            <a 
              href="#companies" 
              className={`sd-nav-link ${activeSection === "companies" ? "active" : ""}`} 
              onClick={(e) => { 
                e.preventDefault(); 
                scrollTo("companies", companiesRef); 
              }}
            >
              Popular Companies
            </a>
          </li>
          <li>
            <a 
              href="#internships" 
              className={`sd-nav-link ${activeSection === "internships" ? "active" : ""}`} 
              onClick={(e) => { 
                e.preventDefault(); 
                scrollTo("internships", internshipsRef); 
              }}
            >
              Popular Internships
            </a>
          </li>
        </ul>
        <div className="sd-navbar-right">
          <div className="sd-notif-wrapper" ref={notifRef}>
            <button className="sd-icon-btn relative" onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications">
              <BellIcon />
              {unreadCount > 0 && <span className="sd-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {notifOpen && (
              <NotificationsDropdown 
                notifications={notifications}
                onClose={() => setNotifOpen(false)}
                onMarkRead={markNotificationRead}
                onMarkAllRead={markAllNotificationsRead}
                onNavigate={navigateToApplication}
              />
            )}
          </div>
          <button className="sd-icon-btn" aria-label="Dark mode">
            <MoonIcon />
          </button>
        </div>
      </nav>

      <main className="sd-main">
        {/* ========== HERO SECTION WITH STUDENT IMAGE ========== */}
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
              
              {/* SECTION RECHERCHE */}
              <div className="sd-search-container" style={{ marginTop: "2rem", width: "100%" }}>
                <div className="sd-search-bar" style={{ 
                  maxWidth: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  background: "rgba(255,255,255,0.08)", 
                  border: "1px solid rgba(255,255,255,0.18)", 
                  borderRadius: "50px", 
                  padding: "10px 16px", 
                  backdropFilter: "blur(8px)" 
                }}>
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Search by title, description, or company..."
                    value={filters.search}
                    onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    onKeyPress={e => e.key === 'Enter' && fetchInternships()}
                    style={{ 
                      background: "transparent", 
                      border: "none", 
                      outline: "none", 
                      color: "#fff", 
                      fontSize: "0.85rem", 
                      fontFamily: "'Poppins', sans-serif", 
                      flex: 1 
                    }}
                  />
                  <button 
                    onClick={fetchInternships}
                    style={{ 
                      background: "linear-gradient(135deg, #B556D7, #8E2FFB)", 
                      border: "none", 
                      borderRadius: "50%", 
                      width: "30px", 
                      height: "30px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      cursor: "pointer", 
                      color: "#fff", 
                      transition: "opacity 0.2s" 
                    }}
                  >
                    <SearchIcon />
                  </button>
                  <button 
                    className="sd-filter-btn"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    style={{ 
                      background: "transparent", 
                      border: "none", 
                      cursor: "pointer", 
                      color: "#8E2FFB", 
                      display: "flex", 
                      alignItems: "center", 
                      transition: "color 0.2s",
                      padding: "5px"
                    }}
                  >
                    <FilterIcon />
                  </button>
                </div>

                {showAdvancedFilters && (
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "16px", 
                    padding: "20px", 
                    background: "rgba(255,255,255,0.05)", 
                    borderRadius: "16px", 
                    marginTop: "12px",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    <div>
                      <label className="block text-white/70 text-sm mb-2" style={{ fontWeight: "500" }}>📍 Wilaya</label>
                      <select
                        value={filters.wilaya}
                        onChange={e => setFilters(prev => ({ ...prev, wilaya: e.target.value }))}
                        style={{ 
                          width: "100%", 
                          background: "rgba(255,255,255,0.1)", 
                          border: "1px solid rgba(255,255,255,0.2)", 
                          borderRadius: "12px", 
                          padding: "10px 12px", 
                          color: "white",
                          cursor: "pointer",
                          outline: "none"
                        }}
                      >
                        <option value="" style={{ background: "#1e293b" }}>All Wilayas</option>
                        {wilayas.map(w => <option key={w} value={w} style={{ background: "#1e293b" }}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm mb-2" style={{ fontWeight: "500" }}>⚡ Skills</label>
                      <input
                        type="text"
                        placeholder="React, Python, Django..."
                        value={filters.skills}
                        onChange={e => setFilters(prev => ({ ...prev, skills: e.target.value }))}
                        style={{ 
                          width: "100%", 
                          background: "rgba(255,255,255,0.1)", 
                          border: "1px solid rgba(255,255,255,0.2)", 
                          borderRadius: "12px", 
                          padding: "10px 12px", 
                          color: "white",
                          outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm mb-2" style={{ fontWeight: "500" }}>🏢 Company</label>
                      <input
                        type="text"
                        placeholder="Company name"
                        value={filters.company_name}
                        onChange={e => setFilters(prev => ({ ...prev, company_name: e.target.value }))}
                        style={{ 
                          width: "100%", 
                          background: "rgba(255,255,255,0.1)", 
                          border: "1px solid rgba(255,255,255,0.2)", 
                          borderRadius: "12px", 
                          padding: "10px 12px", 
                          color: "white",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RESULTS SECTION */}
              {hasActiveFilters && (
                <div style={{ marginTop: "2rem", width: "100%" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-lg">
                      Search Results ({internships.length})
                    </h3>
                    <button 
                      onClick={clearFilters}
                      className="text-white/50 text-sm hover:text-white/80 transition px-3 py-1 rounded-lg hover:bg-white/10"
                    >
                      ✕ Clear filters
                    </button>
                  </div>
                  
                  {loadingInter ? (
                    <div className="sd-loading">
                      <div className="sd-spinner" />
                      <p>Searching internships...</p>
                    </div>
                  ) : internships.length === 0 ? (
                    <div className="sd-empty" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "40px" }}>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
                        No internships found matching your criteria.
                      </p>
                      <button 
                        onClick={clearFilters}
                        className="mt-4 px-4 py-2 bg-purple-600/40 hover:bg-purple-600/60 rounded-lg text-white text-sm transition"
                      >
                        Clear all filters
                      </button>
                    </div>
                  ) : (
                    <div className="sd-internships-grid" style={{ marginTop: "1rem" }}>
                      {internships.slice(0, 6).map(offer => (
                        <div className="sd-internship-card is-visible" key={offer.id}>
                          <div className="sd-intern-img">
                            {offer.image ? (
                              <img 
                                src={getImageUrl(offer.image)} 
                                alt={offer.title}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className="sd-image-placeholder" style={{ display: offer.image ? 'none' : 'flex' }}>
                              internship
                            </div>
                            <div className="sd-intern-top-badges">
                              <span className="sd-badge-level">{offer.level || "Internship"}</span>
                              <span className="sd-badge-type">{offer.type || "Stage"}</span>
                            </div>
                          </div>
                          <div className="sd-intern-info">
                            <div className="sd-intern-title">{offer.title}</div>
                            <div className="sd-intern-meta-row">
                              <div className="sd-intern-applicants">
                                <UsersIcon />
                                <span style={{ color: "#F75AFA", fontWeight: "bold" }}>
                                  {offer.applicants_count ?? 0}
                                </span> Students Applied
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
                                Apply Now
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {internships.length > 6 && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
                      <button className="sd-see-all-btn" onClick={() => document.getElementById('internships')?.scrollIntoView({ behavior: "smooth" })}>
                        See All {internships.length} Internships &nbsp;<ArrowRight />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* ========== STUDENT IMAGE ========== */}
            <div className="sd-hero-image">
              <img 
                src="/images/student.png" 
                alt="Student illustration" 
                className="hero-image"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  borderRadius: '22px'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/500x500/8D23D4/white?text=Student';
                }}
              />
            </div>
          </div>
        </section>

        {/* ========== COMPANIES SECTION - FIXED ========== */}
        <section className="sd-section" id="companies" ref={companiesRef} data-section="companies">
          <div className="sd-section-header">
            <div>
              <h2 className="sd-section-title">
                <span className="t-pink">Popular </span>
                <span className="t-purple">Companies</span>
              </h2>
              <p className="sd-section-subtitle">
                The top companies offering the most internships
              </p>
            </div>
            {companies.length > 0 && (
              <button 
                className="sd-see-all-btn"
                onClick={() => setShowAllCompanies(!showAllCompanies)}
              >
                {showAllCompanies ? "Show Less" : "See All"} &nbsp;<ArrowRight />
              </button>
            )}
          </div>

          {loadingComp ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <p>Loading companies…</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="sd-empty">
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
                This section is not available yet. Please check back later.
              </p>
            </div>
          ) : (
            <div className="sd-companies-grid">
              {displayedCompanies.map((c, index) => (
                <div className="sd-company-card" key={c.id}>
                  <div className="sd-company-img" style={{
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '140px',
                    background: c.cover_picture
                      ? 'transparent'
                      : 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))',
                  }}>
                    {/* Cover picture as full background */}
                    {c.cover_picture && (
                      <img
                        src={getImageUrl(c.cover_picture)}
                        alt="cover"
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          objectFit: 'cover',
                          filter: 'brightness(0.7)',
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}

                    {/* Dark gradient overlay for readability */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.6) 35%, transparent 100%)',
                      pointerEvents: 'none',
                    }} />

                    {/* Logo badge — bottom-left corner */}
                    <div style={{
                      position: 'absolute', bottom: 10, left: 10,
                      width: 56, height: 56,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.35)',
                      background: 'rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(6px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 3,
                    }}>
                      {c.logo ? (
                        <img
                          src={getImageUrl(c.logo)}
                          alt={c.name || c.company_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <Briefcase size={20} style={{ color: 'rgba(255,255,255,0.6)' }} />
                      )}
                    </div>

                    {/* Industry label — bottom-right */}
                    <span style={{
                      position: 'absolute', bottom: 10, right: 10,
                      background: 'rgba(0,0,0,0.45)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 20,
                      padding: '2px 10px',
                      fontSize: '0.65rem',
                      color: 'rgba(255,255,255,0.85)',
                      zIndex: 3,
                    }}>
                      {c.industry || "Company"}
                    </span>
                  </div>
                  <div className="sd-company-info">
                    <div className="sd-company-name">{c.name || c.company_name}</div>
                    {c.description && <p className="sd-company-desc">{c.description.substring(0, 80)}...</p>}
                    <div className="sd-company-meta">
                      <Briefcase size={12} />
                      <span style={{ color: "#F75AFA", fontWeight: "bold" }}>{c.active_offers ?? 0}</span> active offers
                    </div>
                    <div className="sd-company-meta" style={{ marginTop: "4px" }}>
                      <UsersIcon />
                      <span style={{ color: "#F75AFA", fontWeight: "bold" }}>{c.students_applied ?? 0}</span> students applied
                    </div>
                    <button className="sd-learn-btn" onClick={() => scrollTo("internships", internshipsRef)}>
                      View Offers
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingComp && companies.length > 3 && !showAllCompanies && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
              <button 
                className="sd-see-all-btn"
                onClick={() => setShowAllCompanies(true)}
              >
                See All {companies.length} Companies &nbsp;<ArrowRight />
              </button>
            </div>
          )}

          <div className="sd-join-banner">
            <h3>Join Us to Apply for Your dream Internship</h3>
            <button className="sd-join-btn" onClick={() => scrollTo("internships", internshipsRef)}>
              Browse Internships
            </button>
          </div>
        </section>

        {/* ========== INTERNSHIPS SECTION ========== */}
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
            {internships.length > 0 && !hasActiveFilters && (
              <button 
                className="sd-see-all-btn"
                onClick={() => setShowAllInternships(!showAllInternships)}
              >
                {showAllInternships ? "Show Less" : "See All"} &nbsp;<ArrowRight />
              </button>
            )}
          </div>

          {loadingInter && !hasActiveFilters ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <p>Loading internships…</p>
            </div>
          ) : (!hasActiveFilters && internships.length === 0) ? (
            <div className="sd-empty">
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
                This section is not available yet. Please check back later.
              </p>
            </div>
          ) : !hasActiveFilters ? (
            <div className="sd-internships-grid">
              {displayedInternships.map(offer => (
                <div className="sd-internship-card is-visible" key={offer.id}>
                  <div className="sd-intern-img">
                    {offer.image ? (
                      <img 
                        src={getImageUrl(offer.image)} 
                        alt={offer.title}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="sd-image-placeholder" style={{ display: offer.image ? 'none' : 'flex' }}>
                      internship
                    </div>
                    <div className="sd-intern-top-badges">
                      <span className="sd-badge-level">{offer.level || "Internship"}</span>
                      <span className="sd-badge-type">{offer.type || "Stage"}</span>
                    </div>
                  </div>
                  <div className="sd-intern-info">
                    <div className="sd-intern-title">{offer.title}</div>
                    <div className="sd-intern-meta-row">
                      <div className="sd-intern-applicants">
                        <UsersIcon />
                        <span style={{ color: "#F75AFA", fontWeight: "bold" }}>
                          {offer.applicants_count ?? 0}
                        </span> Students Applied
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
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!hasActiveFilters && internships.length > 3 && !showAllInternships && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
              <button 
                className="sd-see-all-btn"
                onClick={() => setShowAllInternships(true)}
              >
                See All {internships.length} Internships &nbsp;<ArrowRight />
              </button>
            </div>
          )}
        </section>

        {/* ========== FOOTER ========== */}
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
                <li><MapPinIcon />123 University Ave, Campus Center, Algiers, Algeria</li>
                <li><PhoneIcon />+213 (0) 23 45 67 89</li>
                <li><MailIcon />contact@univstage.dz</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 UnivStage. All rights reserved.</p>
            <div className="footer-socials">
              <a href="https://www.facebook.com/univstage" target="_blank" rel="noopener noreferrer">f</a>
              <a href="https://www.instagram.com/univstage" target="_blank" rel="noopener noreferrer">𝕏</a>
              <a href="https://www.linkedin.com/company/univstage" target="_blank" rel="noopener noreferrer">in</a>
            </div>
            <div className="footer-bottom-links">
              <a href="/privacy-policy">Privacy Policy</a>
              <span>|</span>
              <a href="/terms-of-service">Terms of Service</a>
              <span>|</span>
              <a href="/faq">FAQ</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}