// frontend/src/page/AboutUs.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, FileText, CheckCircle, 
  GraduationCap, Building2, Shield, Users,
  Briefcase, Eye, FileCheck, MessageCircle,
  Mail, Phone, MapPin
} from 'lucide-react';
import './AboutUs.css';

// تعريف أيقونة BarChart3 خارج المكون
const BarChart3Icon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const AboutUs = () => {
  const navigate = useNavigate();

  // Steps for Students
  const stepsForStudent = [
    { icon: Search, title: "Search", desc: "Browse internship offers by field, location, or skills" },
    { icon: FileText, title: "Apply", desc: "Submit your CV and cover letter in just a few clicks" },
    { icon: Eye, title: "Track", desc: "Check your application status in real-time" },
    { icon: FileCheck, title: "Contract", desc: "Download your internship agreement once validated" }
  ];

  // Steps for Companies
  const stepsForCompany = [
    { icon: Briefcase, title: "Post", desc: "Create and publish your internship offers easily" },
    { icon: Users, title: "Manage", desc: "Review and manage student applications" },
    { icon: CheckCircle, title: "Respond", desc: "Accept or reject applications" },
    { icon: MessageCircle, title: "Chat", desc: "Communicate directly with candidates" }
  ];

  // Steps for Universities (Administration)
  const stepsForUniversity = [
    { icon: Shield, title: "Validate", desc: "Review and validate internship agreements" },
    { icon: FileText, title: "Sign", desc: "Add your signature and official stamp" },
    { icon: Users, title: "Track", desc: "Monitor student placements" },
    { icon: BarChart3Icon, title: "Statistics", desc: "View placement statistics for your university", isCustom: true }
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="about-us-page">
      {/* Hero Section */}
      <div className="about-hero">
        <h1>About <span>UnivStage</span></h1>
        <p>
          UnivStage is an innovative platform that connects students, companies, and universities 
          to facilitate internship search and management in Algeria.
        </p>
      </div>

      {/* How It Works - General */}
      <div className="about-how-it-works">
        <h2>How It <span>Works</span></h2>
        <div className="about-steps">
          <div className="about-step">
            <div className="about-step-icon"><Search size={28} /></div>
            <h3>Search</h3>
            <p>Find the perfect internship opportunity</p>
          </div>
          <div className="about-step">
            <div className="about-step-icon"><FileText size={28} /></div>
            <h3>Apply</h3>
            <p>Submit your application with CV</p>
          </div>
          <div className="about-step">
            <div className="about-step-icon"><CheckCircle size={28} /></div>
            <h3>Validate</h3>
            <p>Get your signed internship agreement</p>
          </div>
        </div>
      </div>

      {/* For Students Section */}
      <section id="students" className="about-role-section">
        <div className="about-role-header">
          <div className="about-role-icon student">
            <GraduationCap size={32} />
          </div>
          <h2>For <span>Students</span></h2>
          <p>Everything you need to find your ideal internship</p>
        </div>
        <div className="about-role-grid">
          {stepsForStudent.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="about-role-card">
                <div className="about-role-card-icon">
                  <Icon size={24} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* For Companies Section */}
      <section id="companies" className="about-role-section">
        <div className="about-role-header">
          <div className="about-role-icon company">
            <Building2 size={32} />
          </div>
          <h2>For <span>Companies</span></h2>
          <p>Find the best talent for your organization</p>
        </div>
        <div className="about-role-grid">
          {stepsForCompany.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="about-role-card">
                <div className="about-role-card-icon">
                  <Icon size={24} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* For Universities Section */}
      <section id="universities" className="about-role-section">
        <div className="about-role-header">
          <div className="about-role-icon university">
            <Shield size={32} />
          </div>
          <h2>For <span>Universities</span></h2>
          <p>Manage and validate student internships efficiently</p>
        </div>
        <div className="about-role-grid">
          {stepsForUniversity.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="about-role-card">
                <div className="about-role-card-icon">
                  <Icon size={24} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Back to Home Button */}
      <div className="about-back-home">
        <button className="about-back-home-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default AboutUs;