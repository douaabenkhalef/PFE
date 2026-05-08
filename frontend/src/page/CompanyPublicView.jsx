// frontend/src/page/CompanyPublicView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Briefcase, Calendar, Users, 
  Mail, Phone, Globe, Linkedin, Twitter, ArrowLeft,
  Clock, Loader2, Search, Filter, ChevronDown, ChevronUp, 
  Star, TrendingUp, ArrowRight, AlertCircle
} from 'lucide-react';
import './CompanyPublicView.css';

const API = 'https://pfe-l31r.onrender.com/api';
const BACKEND = 'https://pfe-l31r.onrender.com';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/')) return `${BACKEND}${url}`;
  if (url.startsWith('/media/')) return `${BACKEND}${url}`;
  return `${BACKEND}/api/${url}`;
};

// ==================== StatusBadge Component ====================
function StatusBadge({ isActive }) {
  return (
    <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
      {isActive ? (
        <>
          <span className="pulse-dot"></span>
          Actif
        </>
      ) : (
        'Inactif'
      )}
    </span>
  );
}

// ==================== OfferCard Component ====================
function OfferCard({ offer, onApply, index }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const imageUrl = offer.image || offer.image_url;
  const isExpired = offer.deadline && new Date(offer.deadline) < new Date();
  const applicantsCount = offer.applicants_count || 0;
  
  return (
    <div 
      className={`offer-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isExpired && onApply(offer)}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {isExpired && (
        <div className="offer-expired-badge">
          <Clock size={14} /> Expiré
        </div>
      )}
      
      <div className="offer-image-wrapper">
        <div className="offer-image">
          {imageUrl && !imgError ? (
            <img 
              src={getImageUrl(imageUrl)} 
              alt={offer.title}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="offer-image-placeholder">
              <Briefcase size={48} strokeWidth={1.5} />
              <span>Image non disponible</span>
            </div>
          )}
        </div>
        <div className="offer-image-overlay">
          <div className="offer-type-badge">{offer.internship_type || 'Stage'}</div>
          <div className="offer-applicants-badge">
            <Users size={12} />
            <span>{applicantsCount}</span>
          </div>
        </div>
      </div>
      
      <div className="offer-content">
        <div className="offer-header">
          <h3 className="offer-title">{offer.title}</h3>
          <StatusBadge isActive={offer.is_active && !isExpired} />
        </div>
        
        <p className="offer-description">
          {offer.description?.substring(0, 120)}
          {offer.description?.length > 120 && '...'}
        </p>
        
        <div className="offer-details-grid">
          <div className="offer-detail">
            <MapPin size={14} />
            <span>{offer.wilaya}</span>
          </div>
          <div className="offer-detail">
            <Clock size={14} />
            <span>{offer.duration}</span>
          </div>
          <div className="offer-detail">
            <Calendar size={14} />
            <span>{offer.deadline ? new Date(offer.deadline).toLocaleDateString('fr-FR') : '—'}</span>
          </div>
        </div>
        
        {offer.required_skills?.length > 0 && (
          <div className="offer-skills">
            {offer.required_skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="skill-tag">{skill}</span>
            ))}
            {offer.required_skills.length > 3 && (
              <span className="skill-tag more">+{offer.required_skills.length - 3}</span>
            )}
          </div>
        )}
        
        <button 
          className={`offer-apply-btn ${isExpired ? 'disabled' : ''}`}
          disabled={isExpired}
          onClick={(e) => {
            e.stopPropagation();
            if (!isExpired) onApply(offer);
          }}
        >
          {isExpired ? 'Offre expirée' : 'Postuler maintenant'}
          {!isExpired && <ArrowRight size={16} className="btn-arrow" />}
        </button>
      </div>
    </div>
  );
}

// ==================== CompanyStats Component (2 stats only) ====================
function CompanyStats({ offers, loading }) {
  if (loading) {
    return (
      <div className="company-stats-grid">
        {[1,2].map(i => (
          <div key={i} className="stat-card animate-pulse">
            <div className="stat-icon" style={{ background: '#ffffff20' }}></div>
            <div className="stat-info">
              <div className="stat-value">---</div>
              <div className="stat-label">---</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeOffers = offers.filter(o => o.is_active).length;
  const totalApplicants = offers.reduce((sum, o) => sum + (o.applicants_count || 0), 0);
  
  const statsItems = [
    { icon: Briefcase, label: 'Offres actives', value: activeOffers, color: '#8b5cf6' },
    { icon: Users, label: 'Candidats', value: totalApplicants, color: '#ec4899' },
  ];
  
  return (
    <div className="company-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {statsItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className="stat-card">
            <div className="stat-icon" style={{ background: `${item.color}20` }}>
              <Icon size={20} color={item.color} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{item.value}</span>
              <span className="stat-label">{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== CompanyContactCard Component ====================
function CompanyContactCard({ company, companyManagerEmail }) {
  const [showAll, setShowAll] = useState(false);
  
  const contactItems = [
    { icon: Mail, label: 'Email contact', value: company.contact_email, link: `mailto:${company.contact_email}` },
    { icon: Mail, label: '📧 Email Manager', value: companyManagerEmail, link: `mailto:${companyManagerEmail}` },
    { icon: Phone, label: 'Téléphone', value: company.phone, link: `tel:${company.phone}` },
    { icon: Globe, label: 'Site web', value: company.website, link: company.website },
    { icon: MapPin, label: 'Adresse', value: company.location || 'Algérie', link: null },
  ].filter(item => item.value);
  
  const socialItems = [
    { icon: Linkedin, label: 'LinkedIn', value: company.linkedin, link: company.linkedin },
    { icon: Twitter, label: 'Twitter', value: company.twitter, link: company.twitter },
  ].filter(item => item.value);
  
  return (
    <div className="info-card contact-card">
      <div className="card-header">
        <div className="card-icon-badge">
          <Mail size={18} />
        </div>
        <h3>Contact & Réseaux</h3>
      </div>
      
      <div className="contact-list">
        {contactItems.slice(0, showAll ? undefined : 5).map((item, idx) => {
          const Icon = item.icon;
          const isManager = item.label === '📧 Email Manager';
          return (
            <div key={idx} className="contact-item">
              <Icon size={16} className="contact-icon" />
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer" style={isManager ? { color: '#F75AFA', fontWeight: '500' } : {}}>
                  {item.value}
                </a>
              ) : (
                <span>{item.value}</span>
              )}
            </div>
          );
        })}
      </div>
      
      {socialItems.length > 0 && (
        <div className="social-links">
          <p className="social-label">Réseaux sociaux</p>
          <div className="social-icons">
            {socialItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="social-icon"
                  title={item.label}
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </div>
        </div>
      )}
      
      {contactItems.length > 5 && !showAll && (
        <button className="show-more-btn" onClick={() => setShowAll(true)}>
          Voir plus <ChevronDown size={14} />
        </button>
      )}
    </div>
  );
}

// ==================== CompanyAboutCard Component ====================
function CompanyAboutCard({ company }) {
  return (
    <div className="info-card about-card">
      <div className="card-header">
        <div className="card-icon-badge">
          <Building2 size={18} />
        </div>
        <h3>À propos</h3>
      </div>
      
      <p className="about-text">
        {company.description || 'Aucune description disponible pour le moment.'}
      </p>
      
      <div className="company-meta">
        <div className="meta-item">
          <Briefcase size={14} />
          <span>Secteur: <strong>{company.industry || 'Non spécifié'}</strong></span>
        </div>
        <div className="meta-item">
          <MapPin size={14} />
          <span>Localisation: <strong>{company.location || 'Algérie'}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================
export default function CompanyPublicView() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [offers, setOffers] = useState([]);
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [companyManagerEmail, setCompanyManagerEmail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [offerTypes, setOfferTypes] = useState([]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. جلب جميع الشركات أولاً (نقطة نهاية موجودة)
        const companiesRes = await fetch(`${API}/companies/list/`);
        const companies = await companiesRes.json();
        
        // البحث عن الشركة بالـ ID
        const foundCompany = companies.find(c => c.id === companyId);
        
        if (!foundCompany) {
          setError('Entreprise non trouvée');
          setLoading(false);
          return;
        }
        
        setCompany(foundCompany);
        
        // 2. جلب البريد الإلكتروني لـ Company Manager - محاولة طرق متعددة
        let managerEmail = null;
        
        // الطريقة الأولى: استخدام endpoint موجود
        try {
          const managerRes = await fetch(`${API}/company/company-manager/?company=${encodeURIComponent(foundCompany.company_name)}`);
          const managerData = await managerRes.json();
          if (managerData.success && managerData.manager) {
            managerEmail = managerData.manager.email;
          }
        } catch (err) {
          console.error('Error fetching company manager (method 1):', err);
        }
        
        // الطريقة الثانية: البحث عن Company Manager من خلال البيانات المتاحة
        if (!managerEmail && foundCompany.email) {
          // إذا كان البريد موجوداً في بيانات الشركة، استخدمه
          managerEmail = foundCompany.email;
        }
        
        // الطريقة الثالثة: استخدام البريد من CompanyProfile إذا وجد
        if (!managerEmail && foundCompany.contact_email) {
          managerEmail = foundCompany.contact_email;
        }
        
        setCompanyManagerEmail(managerEmail);
        
        // 3. جلب العروض باستخدام اسم الشركة
        setLoadingOffers(true);
        try {
          const searchRes = await fetch(`${API}/public/offers/search/?company_name=${encodeURIComponent(foundCompany.company_name)}`);
          const searchData = await searchRes.json();
          
          if (searchData.success && searchData.offers) {
            const activeOffers = searchData.offers.filter(offer => offer.is_active === true);
            setOffers(activeOffers);
            setFilteredOffers(activeOffers);
            
            const types = [...new Set(activeOffers.map(o => o.internship_type).filter(Boolean))];
            setOfferTypes(types);
          } else {
            setOffers([]);
            setFilteredOffers([]);
          }
        } catch (err) {
          console.error('Error fetching offers:', err);
          setOffers([]);
          setFilteredOffers([]);
        } finally {
          setLoadingOffers(false);
        }
        
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError('Erreur de chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId]);

  // Filter offers based on search and type
  useEffect(() => {
    let filtered = [...offers];
    
    if (searchTerm) {
      filtered = filtered.filter(offer => 
        offer.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedType) {
      filtered = filtered.filter(offer => offer.internship_type === selectedType);
    }
    
    setFilteredOffers(filtered);
  }, [searchTerm, selectedType, offers]);

  const handleOfferClick = (offer) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    } else {
      navigate(`/student/dashboard?apply=${offer.id}`);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="error-screen">
        <div className="error-icon">
          <Building2 size={64} strokeWidth={1} />
        </div>
        <h2>{error || 'Entreprise non trouvée'}</h2>
        <p>L'entreprise que vous recherchez n'existe pas ou a été supprimée.</p>
        <button onClick={handleBack} className="back-btn">
          <ArrowLeft size={18} /> Retour à l'accueil
        </button>
      </div>
    );
  }

  const hasActiveOffers = offers.length > 0;

  return (
    <div className="company-page">
      {/* Hero Section - بدون margin-top */}
      <div className="company-hero-section" style={{ marginTop: 0 }}>
        <div className="hero-cover">
          {company.cover_picture ? (
            <img src={getImageUrl(company.cover_picture)} alt="Cover" />
          ) : (
            <div className="hero-cover-placeholder">
              <Building2 size={80} strokeWidth={1} opacity={0.3} />
            </div>
          )}
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content-wrapper">
          <div className="hero-logo-wrapper">
            <div className="hero-logo">
              {company.logo ? (
                <img src={getImageUrl(company.logo)} alt={company.company_name} />
              ) : (
                <Building2 size={40} strokeWidth={1.5} />
              )}
            </div>
          </div>
          
          <div className="hero-title-wrapper">
            <h1 className="company-name">{company.company_name}</h1>
            <div className="company-location">
              <MapPin size={16} />
              <span>{company.location || 'Algérie'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="company-main-content">
        <div className="container">
          {/* Stats Section */}
          <CompanyStats offers={offers} loading={loadingOffers} />
          
          {/* Info Grid */}
          <div className="info-grid">
            <CompanyAboutCard company={company} />
            <CompanyContactCard company={company} companyManagerEmail={companyManagerEmail} />
          </div>
          
          {/* Offers Section */}
          <div className="offers-section">
            <div className="section-header">
              <div className="section-title-wrapper">
                <div className="section-icon">
                  <Briefcase size={22} />
                </div>
                <h2>
                  Offres de stage
                  <span className="offers-count">{filteredOffers.length}</span>
                </h2>
              </div>
              
              {hasActiveOffers && (
                <div className="section-actions">
                  <button 
                    className="filter-toggle-btn"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter size={16} />
                    <span>Filtrer</span>
                    {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              )}
            </div>
            
            {/* Filters Bar */}
            {hasActiveOffers && showFilters && (
              <div className="filters-bar">
                <div className="search-input-wrapper">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Rechercher une offre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="clear-search">
                      ✕
                    </button>
                  )}
                </div>
                
                <select 
                  className="type-filter"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">Tous les types</option>
                  {offerTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                
                {(searchTerm || selectedType) && (
                  <button 
                    className="clear-filters"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedType('');
                    }}
                  >
                    Effacer
                  </button>
                )}
              </div>
            )}
            
            {/* Offers Grid */}
            {loadingOffers ? (
              <div className="loading-offers">
                <div className="spinner-small"></div>
                <p>Chargement des offres...</p>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="no-offers">
                <div className="no-offers-icon">
                  <Briefcase size={64} strokeWidth={1} />
                </div>
                <h3>Aucune offre trouvée</h3>
                <p>
                  {offers.length === 0 
                    ? "Cette entreprise n'a pas encore publié d'offres de stage actives."
                    : "Aucune offre ne correspond à vos critères de recherche."}
                </p>
                {(searchTerm || selectedType) && (
                  <button 
                    className="clear-filters-btn"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedType('');
                    }}
                  >
                    Effacer les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="offers-grid">
                {filteredOffers.map((offer, idx) => (
                  <OfferCard 
                    key={offer.id} 
                    offer={offer} 
                    onApply={handleOfferClick}
                    index={idx}
                  />
                ))}
              </div>
            )}
            
            {/* Message if company has offers but none active */}
            {!loadingOffers && offers.length === 0 && (
              <div className="no-offers">
                <div className="no-offers-icon">
                  <AlertCircle size={64} strokeWidth={1} />
                </div>
                <h3>Aucune offre active</h3>
                <p>Cette entreprise n'a pas d'offres de stage disponibles actuellement.</p>
                <button onClick={handleBack} className="clear-filters-btn">
                  Retour à l'accueil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with only Back button */}
      <footer className="company-footer">
        <div className="container">
          <div className="footer-content">
            <button onClick={handleBack} className="back-btn-footer">
              <ArrowLeft size={18} /> Retour à l'accueil
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}