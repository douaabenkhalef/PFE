import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

/* ========== SVG ICONS ========== */
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

/* ========== STAR RATING ========== */
function Stars({ n = 5, max = 5 }) {
  return (
    <div className="stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star${i >= n ? " empty" : ""}`}>★</span>
      ))}
    </div>
  );
}

/* ========== DATA ========== */
const companies = [
  { id: 1, name: "Sonatrach",  rep: "Labdi Nouha", count: "100+", stars: 5 },
  { id: 2, name: "Sonelgaz",   rep: "Labdi Nouha", count: "100+", stars: 5 },
  { id: 3, name: "Djezzy",     rep: "Labdi Nouha", count: "100+", stars: 5 },
];

const services = [
  { id: 1, title: "Explore offers",           desc: "Students can view company offers, search using filters, and apply for internships." },
  { id: 2, title: "Student Applications",     desc: "Students can easily submit their applications and upload their CVs through our intuitive platform." },
  { id: 3, title: "Administration Validation",desc: "Administrators review and validate student applications with powerful management tools." },
];

/* ========== SEARCH OVERLAY ========== */
function SearchOverlay({ onClose }) {
  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-overlay-inner" onClick={e => e.stopPropagation()}>
        <input autoFocus className="search-overlay-input"
          placeholder="Rechercher des entreprises, offres, services…" type="text" />
        <button className="search-overlay-close" onClick={onClose}><CloseIcon /></button>
      </div>
    </div>
  );
}

/* ========== MAIN ========== */
export default function Home() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const navigate = useNavigate();

  const homeRef      = useRef(null);
  const companiesRef = useRef(null);
  const servicesRef  = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.dataset.section); }),
      { threshold: 0.4 }
    );
    [homeRef, companiesRef, servicesRef].forEach(r => r.current && obs.observe(r.current));
    return () => obs.disconnect();
  }, []);

  /* ── Scroll animations: add .is-visible when element enters viewport ── */
  useEffect(() => {
    const targets = document.querySelectorAll(
      ".company-card, .service-card, .section-title"
    );
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((el) => revealObs.observe(el));
    return () => revealObs.disconnect();
  }, []);

  const scrollTo = (id, ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  return (
    <>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-logo">UnivStage</div>
          <button className="navbar-search-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
            <SearchIcon />
          </button>
        </div>

        <ul className="navbar-links">
          {[
            { id: "home",      label: "Home",          ref: homeRef },
            { id: "companies", label: "Top companies", ref: companiesRef },
            { id: "services",  label: "Our services",  ref: servicesRef },
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

        <div className="navbar-right">
          <button className="btn-contact">Contact Us</button>
          <button className="navbar-moon-btn" aria-label="Toggle theme">🌙</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section" id="home" ref={homeRef} data-section="home">
        <div className="hero-container">
          <div className="hero-content">
            <h1>University<br /><span>Stage</span></h1>
            <p>
              facilitates the organization of offers into categorized lists based on student
              search criteria, while also allowing for the immediate review of attached CVs.
            </p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => navigate("/login")}>Get started</button>
              <button className="btn-outline">About us</button>
            </div>
          </div>

          <div className="hero-image-box">
            <ImgIcon />
            <img src="images/home.png" alt="image"/>
          </div>
        </div>
      </section>

      {/* TOP COMPANIES */}
      <section className="companies-section" id="companies" ref={companiesRef} data-section="companies">
        <h2 className="section-title">
          <span className="word-top">Top </span>
          <span className="word-grad">Companies</span>
        </h2>

        <div className="companies-grid">
          {companies.map(c => (
            <div className="company-card" key={c.id}>
              <div className="company-img-box">
                <ImgIcon />
                <span>Logo / Photo</span>
              </div>

              <div className="company-info-zone">
                <div className="company-name">{c.name}</div>

                <div className="company-meta-row">
                  <div className="rep-block">
                    <span className="rep-icon">👤</span>
                    <div>
                      <span className="rep-name">{c.rep}</span>
                      <span className="rep-label">Student</span>
                    </div>
                  </div>
                  <div className="internship-info">
                    <strong>{c.count}</strong> Internship
                  </div>
                </div>

                <div className="stars-row">
                  <Stars n={c.stars} />
                  <button className="see-details-btn">
                    See Details <ArrowRight />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="see-all-btn-wrap">
          <button className="btn-see-all">See All <ArrowRight /></button>
        </div>
      </section>

      {/* OUR SERVICES */}
      <section className="services-section" id="services" ref={servicesRef} data-section="services">
        <h2 className="section-title">
          <span className="word-white">Our </span>
          <span className="word-grad">services</span>
        </h2>

        <div className="services-grid">
          {services.map(s => (
            <div className="service-card" key={s.id}>
              <div className="service-img-box">
                <ImgIcon />
                <span>Image</span>
              </div>
              <div className="service-card-body">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="learn-more-wrap">
          <button className="btn-learn-more">LEARN MORE</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-logo">🎓 UnivStage</div>
            <p>Connecting students with professional opportunities and empowering the next generation of innovators.</p>
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
    </>
  );
}