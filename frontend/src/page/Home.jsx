// frontend/src/page/Home.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./Home.css";

// Icônes (garder les mêmes)
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ImgIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
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
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

function Stars({ n = 5, max = 5 }) {
  return (
    <div className="stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star${i >= n ? " empty" : ""}`}>★</span>
      ))}
    </div>
  );
}

const services = [
  { id: 1, titleKey: "explore_offers", descKey: "explore_offers.desc", image: "/images/service1.png" },
  { id: 2, titleKey: "student_applications", descKey: "student_applications.desc", image: "/images/service2.png" },
  { id: 3, titleKey: "admin_validation", descKey: "admin_validation.desc", image: "/images/service3.png" },
];

function SearchOverlay({ onClose }) {
  const { t } = useTranslation();
  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-overlay-inner" onClick={e => e.stopPropagation()}>
        <input autoFocus className="search-overlay-input" placeholder={t('nav.search') || "Rechercher..."} type="text" />
        <button className="search-overlay-close" onClick={onClose}><CloseIcon /></button>
      </div>
    </div>
  );
}

function CompaniesModal({ companies, onClose }) {
  const { t } = useTranslation();
  if (!companies.length) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        <h2 className="modal-title">{t('home.top_companies')}</h2>
        <div className="modal-grid">
          {companies.map(company => (
            <div className="modal-company-card" key={company.id}>
              <div className="modal-company-img">
                {company.logo ? <img src={company.logo} alt={company.company_name} /> : <ImgIcon />}
              </div>
              <div className="modal-company-info">
                <h3>{company.company_name}</h3>
                <p>{company.sector || t('common.company')}</p>
                <span>{company.students_applied ?? 0} {t('common.applications')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [showCompaniesModal, setShowCompaniesModal] = useState(false);
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const homeRef = useRef(null);
  const companiesRef = useRef(null);
  const servicesRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/companies/list/")
      .then(res => res.json())
      .then(data => {
        setCompanies(Array.isArray(data) ? data : []);
        setLoadingCompanies(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingCompanies(false);
      });
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.dataset.section); }),
      { threshold: 0.4 }
    );
    [homeRef, companiesRef, servicesRef].forEach(r => r.current && obs.observe(r.current));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll(".company-card, .service-card, .section-title");
    const revealObs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-visible"); revealObs.unobserve(e.target); } }),
      { threshold: 0.15 }
    );
    targets.forEach(el => revealObs.observe(el));
    return () => revealObs.disconnect();
  }, [companies]);

  const scrollTo = (id, ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  return (
    <>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      {showCompaniesModal && <CompaniesModal companies={companies} onClose={() => setShowCompaniesModal(false)} />}

      <nav className="navbar">
        <div className="navbar-left">
          <img src="/images/logo.png" alt="UnivStage Logo" className="navbar-logo-img" />
          <button className="navbar-search-btn" onClick={() => setSearchOpen(true)}><SearchIcon /></button>
        </div>
        <ul className="navbar-links">
          <li><a href="#home" className={activeSection === "home" ? "active" : ""} onClick={e => { e.preventDefault(); scrollTo("home", homeRef); }}>{t('nav.home')}</a></li>
          <li><a href="#companies" className={activeSection === "companies" ? "active" : ""} onClick={e => { e.preventDefault(); scrollTo("companies", companiesRef); }}>{t('nav.companies')}</a></li>
          <li><a href="#services" className={activeSection === "services" ? "active" : ""} onClick={e => { e.preventDefault(); scrollTo("services", servicesRef); }}>{t('nav.services')}</a></li>
        </ul>
        <div className="navbar-right">
          <button className="btn-contact">{t('nav.contact')}</button>
          <LanguageSwitcher />
          <button className="navbar-moon-btn"><MoonIcon /></button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" id="home" ref={homeRef} data-section="home">
        <div className="hero-container">
          <div className="hero-content">
            <h1>{t('home.title')}<br /><span>Stage</span></h1>
            <p>{t('home.subtitle')}</p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => navigate("/login")}>{t('home.get_started')}</button>
              <button className="btn-outline">{t('home.about_us')}</button>
            </div>
          </div>
          <div className="hero-image-box">
            <img src="/images/home.png" alt="Hero illustration" className="hero-image" />
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section className="companies-section" id="companies" ref={companiesRef} data-section="companies">
        <h2 className="section-title"><span className="word-top">{t('home.top_companies')} </span><span className="word-grad">Companies</span></h2>
        <div className="companies-grid">
          {loadingCompanies ? (
            <div className="loading-placeholder">{t('home.loading_companies')}</div>
          ) : companies.length === 0 ? (
            <div className="empty-placeholder">{t('home.no_companies')}</div>
          ) : (
            companies.slice(0, 3).map(company => (
              <div className="company-card" key={company.id}>
                <div className="company-img-box">
                  {company.logo ? <img src={company.logo} alt={company.company_name} style={{ width: "80px", height: "80px", objectFit: "contain" }} /> : <ImgIcon />}
                  <span>{company.sector || t('common.company')}</span>
                </div>
                <div className="company-info-zone">
                  <div className="company-name">{company.company_name}</div>
                  <div className="company-meta-row">
                    <div className="rep-block"><span className="rep-icon">👤</span><div><span className="rep-name">Recruteur</span><span className="rep-label">Contact</span></div></div>
                    <div className="internship-info"><strong>{company.students_applied ?? 0}</strong> Candidatures</div>
                  </div>
                  <div className="stars-row"><Stars n={4} /><button className="see-details-btn">{t('home.see_all')} <ArrowRight /></button></div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="see-all-btn-wrap">
          <button className="btn-see-all" onClick={() => setShowCompaniesModal(true)}>{t('home.see_all')} <ArrowRight /></button>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section" id="services" ref={servicesRef} data-section="services">
        <h2 className="section-title"><span className="word-white">{t('home.our_services')} </span><span className="word-grad">services</span></h2>
        <div className="services-grid">
          {services.map(s => {
            const title = t(`services.${s.titleKey}.title`);
            const desc = t(`services.${s.descKey}`);
            return (
              <div className="service-card" key={s.id}>
                <div className="service-img-box"><img src={s.image} alt={title} className="service-image" /></div>
                <div className="service-card-body"><h3>{title}</h3><p>{desc}</p></div>
              </div>
            );
          })}
        </div>
        <div className="learn-more-wrap"><button className="btn-learn-more">{t('home.learn_more')}</button></div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand"><div className="footer-brand-logo">🎓 UnivStage</div><p>Connecting students with professional opportunities and empowering the next generation of innovators.</p></div>
          <div className="footer-contact"><h4>{t('footer.contact_us')}</h4><ul><li><MapPinIcon />123 University Ave, Campus Center, CA 94000</li><li><PhoneIcon />+1 (555) 123-4567</li><li><MailIcon />internships@university.edu</li></ul></div>
        </div>
        <div className="footer-bottom"><p>© 2026 UnivStage. {t('footer.rights')}</p><div className="footer-socials"><a href="#!">f</a><a href="#!">𝕏</a><a href="#!">in</a><a href="#!">◎</a></div><div className="footer-bottom-links"><a href="#!">{t('footer.privacy_policy')}</a><span>|</span><a href="#!">{t('footer.terms')}</a></div></div>
      </footer>
    </>
  );
}