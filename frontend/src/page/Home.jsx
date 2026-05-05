// frontend/src/page/Home.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronRight, CheckCircle, Sparkles, GraduationCap, Briefcase, ArrowRight as ArrowRightIcon, Building2, MapPin, Users } from 'lucide-react';

import "./Home.css";

// ==================== ICONS COMPONENTS (DEFINED FIRST) ====================

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15z" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Shield Icon Component
const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ==================== STARS COMPONENT ====================

function Stars({ n = 5, max = 5 }) {
  return (
    <div className="stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star${i >= n ? " empty" : ""}`}>★</span>
      ))}
    </div>
  );
}

// ==================== FUNCTION TO GET IMAGE SOURCE ====================

const getImageSrc = (logo) => {
  if (!logo) return null;
  // If it's a base64 image (starts with data:image)
  if (logo.startsWith('data:image')) {
    return logo;
  }
  // If it's a full URL
  if (logo.startsWith('http')) {
    return logo;
  }
  // If it's a local path
  return `https://pfe-l31r.onrender.com${logo}`;
};

// ==================== SERVICES DATA ====================

const services = [
  { 
    id: 1, 
    title: "Explore offers", 
    desc: "Students can view company offers, search using filters, and apply for internships.",
    image: "/images/service1.png",
    icon: Briefcase,
    details: [
      "Browse through hundreds of internship opportunities",
      "Advanced filtering by sector, location, and duration",
      "Save favorite offers for later review",
      "Receive notifications for new matching offers"
    ]
  },
  { 
    id: 2, 
    title: "Student Applications", 
    desc: "Students can easily submit their applications and upload their CVs through our intuitive platform.",
    image: "/images/service2.png",
    icon: GraduationCap,
    details: [
      "One-click application submission",
      "Upload and manage multiple CV versions",
      "Track application status in real-time",
      "Receive instant feedback from companies"
    ]
  },
  { 
    id: 3, 
    title: "Administration Validation", 
    desc: "Administrators review and validate student applications with powerful management tools.",
    image: "/images/service3.png",
    icon: ShieldIcon,
    details: [
      "Streamlined application review process",
      "Digital signature and official stamp integration",
      "Generate internship agreements automatically",
      "Comprehensive analytics and reporting"
    ]
  },
];

// Guide steps for users
const guideSteps = [
  {
    step: 1,
    title: "Create an Account",
    description: "Sign up as a student, company representative, or administrator to access personalized features.",
    icon: CheckCircle
  },
  {
    step: 2,
    title: "Complete Your Profile",
    description: "Fill in your details, upload your CV, and set your preferences to receive relevant opportunities.",
    icon: CheckCircle
  },
  {
    step: 3,
    title: "Browse & Search",
    description: "Explore available internships using our smart filters to find the perfect match for your skills.",
    icon: CheckCircle
  },
  {
    step: 4,
    title: "Apply with One Click",
    description: "Submit your application directly through the platform and track its progress in real-time.",
    icon: CheckCircle
  },
  {
    step: 5,
    title: "Get Validated",
    description: "Once accepted, your internship agreement will be digitally signed and ready to download.",
    icon: CheckCircle
  }
];

// ==================== SERVICES MODAL COMPONENT ====================

function ServicesModal({ onClose }) {
  return (
    <div className="services-modal-overlay" onClick={onClose}>
      <div className="services-modal-content" onClick={e => e.stopPropagation()}>
        <button className="services-modal-close" onClick={onClose}>
          <CloseIcon />
        </button>
        
        <div className="services-modal-header">
          <Sparkles size={32} className="services-modal-icon" />
          <h2>Our <span>Services</span></h2>
          <p>Discover how UnivStage transforms the internship journey for everyone</p>
        </div>

        <div className="services-modal-services">
          <h3>What We Offer</h3>
          <div className="services-modal-grid">
            {services.map(service => {
              const Icon = service.icon;
              return (
                <div key={service.id} className="services-modal-service-card">
                  <div className="service-card-icon">
                    <Icon size={28} />
                  </div>
                  <h4>{service.title}</h4>
                  <p>{service.desc}</p>
                  <ul className="service-features-list">
                    {service.details.map((detail, idx) => (
                      <li key={idx}>
                        <ChevronRight size={14} />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="services-modal-guide">
          <h3>How to Get Started</h3>
          <div className="guide-steps">
            {guideSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="guide-step">
                  <div className="guide-step-number">{step.step}</div>
                  <div className="guide-step-content">
                    <div className="guide-step-icon">
                      <Icon size={18} />
                    </div>
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="services-modal-cta">
          <button className="modal-cta-btn" onClick={onClose}>
            Get Started Now
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPANIES MODAL COMPONENT ====================

function CompaniesModal({ companies, onClose, onCompanyClick }) {
  if (!companies.length) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        <h2 className="modal-title">All Companies</h2>
        <div className="modal-grid">
          {companies.map(company => (
            <div 
              className="modal-company-card" 
              key={company.id}
              onClick={() => onCompanyClick(company.id, company.company_name)}
              style={{ cursor: 'pointer' }}
            >
              <div className="modal-company-img" style={{
                position: 'relative', overflow: 'hidden', padding: 0,
                background: company.cover_picture
                  ? 'transparent'
                  : 'rgba(168,85,247,0.15)',
              }}>
                {company.cover_picture ? (
                  <img
                    src={getImageSrc(company.cover_picture)}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : null}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 35%, transparent)', pointerEvents: 'none' }} />
                <div style={{
                  position: 'absolute', bottom: 8, left: 8,
                  width: 40, height: 40, borderRadius: 8,
                  overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                }}>
                  {company.logo ? (
                    <img src={getImageSrc(company.logo)} alt={company.company_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <Building2 size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  )}
                </div>
              </div>
              <div className="modal-company-info">
                <h3>{company.company_name}</h3>
                <p>{company.industry || "Company"}</p>
                <div className="modal-company-stats">
                  <span className="stat-badge">
                    <Briefcase size={12} /> {company.active_offers || 0} Offers
                  </span>
                  <span className="stat-badge">
                    <Users size={12} /> {company.students_applied || 0} Applications
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN HOME COMPONENT ====================

export default function Home() {
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeSection, setActiveSection] = useState("home");
  const [showCompaniesModal, setShowCompaniesModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const homeRef = useRef(null);
  const companiesRef = useRef(null);
  const servicesRef = useRef(null);
  const footerRef = useRef(null);

  // Fetch companies from API
  useEffect(() => {
    fetch("https://pfe-l31r.onrender.com/api/companies/list/")
      .then(res => res.json())
      .then(data => {
        // The API already returns companies sorted by active_offers (most offers first)
        setCompanies(Array.isArray(data) ? data : []);
        setLoadingCompanies(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingCompanies(false);
      });
  }, []);

  // Handle search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }
    const filtered = companies.filter(company =>
      company.company_name?.toLowerCase().includes(query.toLowerCase()) ||
      company.industry?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered.slice(0, 5));
  };

  // Handle company click - navigate to company profile
  const handleCompanyClick = (companyId, companyName) => {
    console.log(`Navigating to company profile: ${companyName} (ID: ${companyId})`);
    navigate(`/company-profile/${companyId}`);
  };

  const activateSearch = () => {
    setSearchMode(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const deactivateSearch = () => {
    setSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const scrollToFooter = () => {
    footerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (searchMode) {
      deactivateSearch();
    }
  };

  // Intersection Observer for active section highlighting
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { 
        if (e.isIntersecting) setActiveSection(e.target.dataset.section); 
      }),
      { threshold: 0.4 }
    );
    [homeRef, companiesRef, servicesRef].forEach(r => r.current && obs.observe(r.current));
    return () => obs.disconnect();
  }, []);

  // Reveal animations on scroll
  useEffect(() => {
    const targets = document.querySelectorAll(".company-card, .service-card, .section-title");
    const revealObs = new IntersectionObserver(
      entries => entries.forEach(e => { 
        if (e.isIntersecting) { 
          e.target.classList.add("is-visible"); 
          revealObs.unobserve(e.target); 
        } 
      }),
      { threshold: 0.15 }
    );
    targets.forEach(el => revealObs.observe(el));
    return () => revealObs.disconnect();
  }, [companies]);

  const scrollTo = (id, ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
    if (searchMode) {
      deactivateSearch();
    }
  };

  // Display first 3 companies (they are already sorted by most offers from API)
  const displayedCompanies = showAllCompanies ? companies : companies.slice(0, 3);

  return (
    <>
      {showCompaniesModal && (
        <CompaniesModal 
          companies={companies} 
          onClose={() => setShowCompaniesModal(false)} 
          onCompanyClick={handleCompanyClick}
        />
      )}
      {showServicesModal && <ServicesModal onClose={() => setShowServicesModal(false)} />}

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-logo-container">
            <img src="/images/logo.png" alt="UnivStage Logo" className="navbar-logo-img" />
            <span className="navbar-site-name">UnivStage</span>
          </div>
        </div>
        
        {!searchMode && (
          <ul className="navbar-links">
            <li className="nav-item-with-search">
              <button className="navbar-search-icon-btn" onClick={activateSearch}>
                <Search size={18} />
              </button>
              <a href="#home" className={activeSection === "home" ? "active" : ""} onClick={e => { e.preventDefault(); scrollTo("home", homeRef); }}>Home</a>
            </li>
            <li><a href="#companies" className={activeSection === "companies" ? "active" : ""} onClick={e => { e.preventDefault(); scrollTo("companies", companiesRef); }}>Companies</a></li>
            <li><a href="#services" className={activeSection === "services" ? "active" : ""} onClick={e => { e.preventDefault(); scrollTo("services", servicesRef); }}>Services</a></li>
          </ul>
        )}
        
        {searchMode && (
          <div className="navbar-search-container">
            <div className="navbar-search-wrapper">
              <Search size={16} className="navbar-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="navbar-search-input"
              />
              {searchQuery && (
                <button className="navbar-search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <X size={14} />
                </button>
              )}
              <button className="navbar-search-close" onClick={deactivateSearch}>
                Cancel
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="navbar-search-dropdown">
                {searchResults.map(company => (
                  <div 
                    key={company.id} 
                    className="navbar-search-result"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchMode(false);
                      handleCompanyClick(company.id, company.company_name);
                    }}
                  >
                    <div className="result-icon">🏢</div>
                    <div className="result-info">
                      <div className="result-name">{company.company_name}</div>
                      <div className="result-detail">{company.industry || 'Company'} • {company.active_offers || 0} offers</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery && searchResults.length === 0 && (
              <div className="navbar-search-dropdown">
                <div className="navbar-search-no-results">
                  <span>🔍</span>
                  <p>No companies found</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="navbar-right">
          <button className="btn-contact" onClick={scrollToFooter}>Contact</button>
          <button className="navbar-moon-btn"><MoonIcon /></button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" id="home" ref={homeRef} data-section="home">
        <div className="hero-container">
          <div className="hero-content">
            <h1>Welcome to<br /><span>University Stage</span></h1>
            <p>facilitates the organization of offers into categorized lists based on student search criteria, while also allowing for the immediate review of attached CVs.</p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => navigate("/login")}>Get started</button>
              <button className="btn-outline" onClick={() => navigate('/about')}>About us</button>
            </div>
          </div>
          <div className="hero-image-box">
            <img src="/images/home.png" alt="Hero illustration" className="hero-image" />
          </div>
        </div>
      </section>

      {/* Companies Section - Shows top 3 companies with most offers */}
      <section className="companies-section" id="companies" ref={companiesRef} data-section="companies">
        <h2 className="section-title">
          <span className="word-top">Top </span>
          <span className="word-grad">Companies</span>
        </h2>
        
        <div className="companies-grid">
          {loadingCompanies ? (
            <div className="loading-placeholder">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="empty-placeholder">No companies have completed their profile yet.</div>
          ) : (
            displayedCompanies.map((company, index) => (
              <div 
                className="company-card" 
                key={company.id} 
                data-rank={index + 1}
                onClick={() => handleCompanyClick(company.id, company.company_name)}
                style={{ cursor: 'pointer' }}
              >
                <div className="company-img-box" style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: 0,
                  background: company.cover_picture
                    ? 'transparent'
                    : 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))',
                }}>
                  {/* Cover picture as full background */}
                  {company.cover_picture ? (
                    <img
                      src={getImageSrc(company.cover_picture)}
                      alt=""
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        filter: 'brightness(0.7)',
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : null}

                  {/* Gradient overlay for readability */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 35%, transparent 100%)',
                    pointerEvents: 'none',
                  }} />

                  {/* Logo badge — bottom-left */}
                  <div style={{
                    position: 'absolute', bottom: 10, left: 10,
                    width: 48, height: 48,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '2px solid rgba(255,255,255,0.35)',
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2,
                  }}>
                    {company.logo ? (
                      <img
                        src={getImageSrc(company.logo)}
                        alt={company.company_name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Building2 size={24} style={{ color: 'rgba(255,255,255,0.6)' }} />
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
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.85)',
                    zIndex: 2,
                  }}>
                    {company.industry || "Company"}
                  </span>
                </div>
                <div className="company-info-zone">
                  <div className="company-name">{company.company_name}</div>
                  <div className="company-meta-row">
                    <div className="rep-block">
                      <MapPin size={12} className="rep-icon" />
                      <div>
                        <span className="rep-name">{company.location || "Algeria"}</span>
                        <span className="rep-label">Location</span>
                      </div>
                    </div>
                    <div className="internship-info">
                      <strong>{company.active_offers || 0}</strong>
                      <span>Offers</span>
                    </div>
                  </div>
                  <div className="stars-row">
                    <Stars n={4} />
                    <button 
                      className="see-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompanyClick(company.id, company.company_name);
                      }}
                    >
                      See Details <ArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Show "See All" button only if there are more than 3 companies */}
        {companies.length > 3 && (
          <div className="see-all-btn-wrap">
            <button 
              className="btn-see-all" 
              onClick={() => setShowAllCompanies(!showAllCompanies)}
            >
              {showAllCompanies ? "Show Less" : "See All"} 
              <ArrowRight />
            </button>
          </div>
        )}
      </section>

      {/* Services Section */}
      <section className="services-section" id="services" ref={servicesRef} data-section="services">
        <h2 className="section-title"><span className="word-white">Our </span><span className="word-grad">Services</span></h2>
        <div className="services-grid">
          {services.map(s => {
            const Icon = s.icon;
            return (
              <div className="service-card" key={s.id}>
                <div className="service-img-box">
                  <img src={s.image} alt={s.title} className="service-image" />
                </div>
                <div className="service-card-body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="learn-more-wrap">
          <button className="btn-learn-more" onClick={() => setShowServicesModal(true)}>LEARN MORE</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" ref={footerRef}>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-logo">🎓 UnivStage</div>
            <p>Connecting students with professional opportunities and empowering the next generation of innovators.</p>
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
    </>
  );
}