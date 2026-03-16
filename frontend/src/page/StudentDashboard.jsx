import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
         
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name}</span>
               <br></br>
                <span className="text-white/80">Student</span>
               <br></br>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
       

    
  );
};

export default StudentDashboard;