import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Users, Activity, FileText, UserCog, LogOut, Search, User, Building2 } from 'lucide-react';

const CompanySidebar = ({ user, onLogout, onClose }) => {
  const location = useLocation();
  const isCompanyManager = user?.sub_role === 'company_manager';
  const initials = (user?.full_name || user?.email || "U")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 z-[9999] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full shadow-xl border-r border-purple-500/30 flex flex-col animate-slide-in">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              {initials}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.full_name || user?.email}</p>
              <p className="text-white/50 text-xs">{user?.email}</p>
            </div>
          </div>
        </div>

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

        <nav className="flex-1 overflow-y-auto p-3">
          <div>
            <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control & Management</p>
            <div className="space-y-1">
              <Link to="/company/profile" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <User size={16} /> My Profile
              </Link>
              <Link to="/company/company-profile" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <Building2 size={16} /> Company Profile
              </Link>
              <Link to="/company/manage-offers" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <Briefcase size={16} /> Manage offers
              </Link>
              <Link to="/company/applications" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <FileText size={16} /> Student Application
              </Link>
              {isCompanyManager && (
                <>
                  <Link to="/company-manager/manage-hiring-managers" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                    <UserCog size={16} /> Manage Hiring Managers
                  </Link>
                  <Link to="/company-manager/activity-logs" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                    <Activity size={16} /> Control Hiring Manager Activity
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

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