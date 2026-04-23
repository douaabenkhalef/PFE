// frontend/src/components/CompanySidebar.jsx

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Users, Activity, FileText, UserCog, LogOut, Search, User, Building2 } from 'lucide-react';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');

const CompanySidebar = ({ user, onLogout, onClose }) => {
  const location = useLocation();
  const [profileImage, setProfileImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [profile, setProfile] = useState(null);

  const isCompanyManager = user?.sub_role === 'company_manager';

  // جلب معلومات المستخدم واللوجو (مثل CompanyProfile.jsx)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        // جلب معلومات المستخدم
        const userRes = await fetch(`${API}/auth/me/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        if (userData.success) {
          setProfile(userData.user);
        }
        
        // جلب صورة الشركة
        const companyRes = await fetch(`${API}/company/profile/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const companyData = await companyRes.json();
        if (companyData.success && companyData.company && companyData.company.logo_url) {
          let logoUrl = companyData.company.logo_url;
          if (logoUrl && !logoUrl.startsWith('http')) {
            logoUrl = `http://localhost:8000${logoUrl}`;
          }
          setProfileImage(logoUrl);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  // 🔥 عرض اسم المستخدم (مثل CompanyProfile.jsx)
  const getDisplayName = () => {
    if (profile?.username) {
      return profile.username;
    }
    if (user?.username) {
      return user.username;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  // 🔥 الحرف الأول من اسم المستخدم
  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  // البريد الإلكتروني
  const getDisplayEmail = () => {
    return profile?.email || user?.email || '';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full shadow-xl border-r border-purple-500/30 flex flex-col animate-slide-in">
        
        {/* Header with Logo/Image - مثل CompanyProfile.jsx */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold overflow-hidden">
              {profileImage && !imageError ? (
                <img 
                  src={profileImage} 
                  alt={getDisplayName()} 
                  className="w-full h-full object-cover"
                  onError={() => {
                    setImageError(true);
                    setProfileImage(null);
                  }}
                />
              ) : (
                <span>{getInitials()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {/* 🔥 عرض اسم المستخدم (مثل CompanyProfile.jsx) */}
              <p className="text-white font-medium text-sm truncate">{getDisplayName()}</p>
              <p className="text-white/50 text-xs truncate">{getDisplayEmail()}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div>
            <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control & Management</p>
            <div className="space-y-1">
              <Link 
                to={isCompanyManager ? "/company-manager/profile" : "/company/profile"} 
                onClick={onClose} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  location.pathname === (isCompanyManager ? "/company-manager/profile" : "/company/profile") 
                    ? 'bg-purple-600/30 text-purple-300' 
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <User size={16} /> My Profile
              </Link>
              <Link 
                to="/company/company-profile" 
                onClick={onClose} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  location.pathname === "/company/company-profile" 
                    ? 'bg-purple-600/30 text-purple-300' 
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <Building2 size={16} /> Company Profile
              </Link>
              <Link 
                to="/company/manage-offers" 
                onClick={onClose} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  location.pathname === "/company/manage-offers" 
                    ? 'bg-purple-600/30 text-purple-300' 
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <Briefcase size={16} /> Manage offers
              </Link>
              <Link 
                to="/company/applications" 
                onClick={onClose} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  location.pathname === "/company/applications" 
                    ? 'bg-purple-600/30 text-purple-300' 
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <FileText size={16} /> Student Application
              </Link>
              {isCompanyManager && (
                <>
                  <Link 
                    to="/company-manager/manage-hiring-managers" 
                    onClick={onClose} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      location.pathname === "/company-manager/manage-hiring-managers" 
                        ? 'bg-purple-600/30 text-purple-300' 
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <UserCog size={16} /> Manage Hiring Managers
                  </Link>
                  <Link 
                    to="/company-manager/activity-logs" 
                    onClick={onClose} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      location.pathname === "/company-manager/activity-logs" 
                        ? 'bg-purple-600/30 text-purple-300' 
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Activity size={16} /> Control Hiring Manager Activity
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySidebar;