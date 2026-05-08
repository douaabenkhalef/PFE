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

// ... (بقية دوال StatusBadge, OfferCard, CompanyStats, CompanyContactCard, CompanyAboutCard تبقى كما هي دون تغيير)...

export default function CompanyPublicView() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [offers, setOffers] = useState([]);
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [offerTypes, setOfferTypes] = useState([]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch company information using the new public endpoint
        const companyRes = await fetch(`${API}/public/companies/${companyId}/`);
        if (!companyRes.ok) throw new Error(`HTTP ${companyRes.status}`);
        const companyData = await companyRes.json();
        if (!companyData.success) throw new Error(companyData.error || 'Company not found');
        setCompany(companyData.profile);

        // 2. Fetch company offers using the new public endpoint
        setLoadingOffers(true);
        try {
          const offersRes = await fetch(`${API}/public/offers/by-company/${companyId}/`);
          if (!offersRes.ok) throw new Error(`HTTP ${offersRes.status}`);
          const offersData = await offersRes.json();
          if (offersData.success && offersData.offers) {
            const activeOffers = offersData.offers.filter(offer => offer.is_active === true);
            setOffers(activeOffers);
            setFilteredOffers(activeOffers);
            const types = [...new Set(activeOffers.map(o => o.internship_type).filter(Boolean))];
            setOfferTypes(types);
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

    if (companyId) fetchCompanyData();
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
    if (selectedType) filtered = filtered.filter(offer => offer.internship_type === selectedType);
    setFilteredOffers(filtered);
  }, [searchTerm, selectedType, offers]);

  const handleOfferClick = (offer) => {
    const token = localStorage.getItem('access_token');
    token ? navigate(`/student/dashboard?apply=${offer.id}`) : navigate('/login');
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
        <div className="error-icon"><Building2 size={64} strokeWidth={1} /></div>
        <h2>{error || 'Entreprise non trouvée'}</h2>
        <p>L'entreprise que vous recherchez n'existe pas ou a été supprimée.</p>
        <button onClick={() => navigate('/')} className="back-btn"><ArrowLeft size={18} /> Retour à l'accueil</button>
      </div>
    );
  }

  const hasActiveOffers = offers.length > 0;

  return (
    <div className="company-page">
      {/* Header Navigation */}
      <header className="company-header-nav">
        <div className="nav-container">
          <button onClick={() => navigate('/')} className="nav-back"><ArrowLeft size={18} /> Retour</button>
          <div className="nav-logo" onClick={() => navigate('/')}><img src="/images/logo.png" alt="UnivStage" /><span>UnivStage</span></div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="company-hero-section">
        <div className="hero-cover">
          {company.cover_picture ? <img src={getImageUrl(company.cover_picture)} alt="Cover" /> : <div className="hero-cover-placeholder"><Building2 size={80} strokeWidth={1} opacity={0.3} /></div>}
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content-wrapper">
          <div className="hero-logo-wrapper">
            <div className="hero-logo">{company.logo ? <img src={getImageUrl(company.logo)} alt={company.name} /> : <Building2 size={40} strokeWidth={1.5} />}</div>
          </div>
          <div className="hero-title-wrapper">
            <h1 className="company-name">{company.name}</h1>
            <div className="company-location"><MapPin size={16} /><span>{company.location || 'Algérie'}</span></div>
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
            <CompanyContactCard company={company} />
          </div>
          
          {/* Offers Section */}
          <div className="offers-section">
            <div className="section-header">
              <div className="section-title-wrapper">
                <div className="section-icon"><Briefcase size={22} /></div>
                <h2>Offres de stage <span className="offers-count">{filteredOffers.length}</span></h2>
              </div>
              {hasActiveOffers && (
                <div className="section-actions">
                  <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
                    <Filter size={16} /><span>Filtrer</span>{showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              )}
            </div>
            
            {/* Filters Bar */}
            {hasActiveOffers && showFilters && (
              <div className="filters-bar">
                <div className="search-input-wrapper">
                  <Search size={16} />
                  <input type="text" placeholder="Rechercher une offre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  {searchTerm && <button onClick={() => setSearchTerm('')} className="clear-search">✕</button>}
                </div>
                <select className="type-filter" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  <option value="">Tous les types</option>
                  {offerTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                {(searchTerm || selectedType) && <button className="clear-filters" onClick={() => { setSearchTerm(''); setSelectedType(''); }}>Effacer</button>}
              </div>
            )}
            
            {/* Offers Grid */}
            {loadingOffers ? (
              <div className="loading-offers"><div className="spinner-small"></div><p>Chargement des offres...</p></div>
            ) : filteredOffers.length === 0 ? (
              <div className="no-offers">
                <div className="no-offers-icon"><Briefcase size={64} strokeWidth={1} /></div>
                <h3>Aucune offre trouvée</h3>
                <p>{offers.length === 0 ? "Cette entreprise n'a pas encore publié d'offres de stage actives." : "Aucune offre ne correspond à vos critères de recherche."}</p>
                {(searchTerm || selectedType) && <button className="clear-filters-btn" onClick={() => { setSearchTerm(''); setSelectedType(''); }}>Effacer les filtres</button>}
              </div>
            ) : (
              <div className="offers-grid">
                {filteredOffers.map((offer, idx) => <OfferCard key={offer.id} offer={offer} onApply={handleOfferClick} index={idx} />)}
              </div>
            )}
            
            {/* Message if company has offers but none active */}
            {!loadingOffers && offers.length === 0 && (
              <div className="no-offers">
                <div className="no-offers-icon"><AlertCircle size={64} strokeWidth={1} /></div>
                <h3>Aucune offre active</h3>
                <p>Cette entreprise n'a pas d'offres de stage disponibles actuellement.</p>
                <button onClick={() => navigate('/')} className="clear-filters-btn">Retour à l'accueil</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="company-footer">
        <div className="container">
          <div className="footer-content">
            <p>© 2025 UnivStage. Tous droits réservés.</p>
            <div className="footer-links"><a href="/terms">Conditions générales</a><span className="separator">|</span><a href="/privacy">Confidentialité</a></div>
          </div>
        </div>
      </footer>
    </div>
  );
}