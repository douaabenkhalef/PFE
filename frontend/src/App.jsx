import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './page/AuthPage';
import ForgotPassword from './page/ForgotPassword';
import Home from './page/Home';
import StudentDashboard from './page/StudentDashboard';
import CompanyDashboard from './page/CompanyDashboard';
import CompanyManagerDashboard from './page/CompanyManagerDashboard';
import AdminDashboard from './page/AdminDashboard';
import CoDeptHeadDashboard from './page/CoDeptHeadDashboard';
import CompanyApplications from './page/CompanyApplications';
import StudentApplications from './page/StudentApplications';
import InternshipOfferManager from './page/InternshipOfferManager';
import CoDeptValidations from './page/CoDeptValidations';
import DeptHeadValidations from './page/DeptHeadValidations';
import UniversityProfile from './page/UniversityProfile';
import CompanyPublicProfile from './page/CompanyPublicProfile';
import MyProfile from './page/MyProfile';
import StudentProfile from './page/StudentProfile';
import MyCV from './page/MyCV';
import CompanyActivityLogs from './page/CompanyActivityLogs';
import DeptHeadActivityLogs from './page/DeptHeadActivityLogs';
import ManageHiringManagers from './page/ManageHiringManagers';
import ManageCoDeptHeads from './page/ManageCoDeptHeads';
import ManageStudents from './page/ManageStudents';
import AdminMyProfile from './page/AdminMyProfile';
import AboutUs from './page/AboutUs';
import UniversityTeam from './page/UniversityTeam';
import CompanyPublicView from './page/CompanyPublicView';
import SuperAdminDashboard from './page/SuperAdminDashboard';
import './App.css';

// Composant pour rediriger après refresh
function AuthRedirect({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && location.pathname === '/') {
      const lastPage = localStorage.getItem('last_visited_page');
      if (lastPage && lastPage !== '/' && lastPage !== '/login') {
        window.location.href = lastPage;
      }
    }
  }, [loading, isAuthenticated, location]);

  // Sauvegarder la page actuelle
  useEffect(() => {
    if (isAuthenticated && location.pathname !== '/login') {
      localStorage.setItem('last_visited_page', location.pathname);
    }
  }, [isAuthenticated, location]);

  return children;
}

const ProtectedRoute = ({ children, allowedRoles, allowedSubRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/login" replace />;
  }

  if (allowedSubRoles && !allowedSubRoles.includes(user?.sub_role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <Router>
      <AuthRedirect>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/company/:companyId" element={<CompanyPublicView />} />
            
            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/applications" element={<ProtectedRoute allowedRoles={['student']}><StudentApplications /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
            <Route path="/student/profile/:username" element={<ProtectedRoute allowedRoles={['student', 'company', 'admin']}><StudentProfile /></ProtectedRoute>} />
            <Route path="/student/cv" element={<ProtectedRoute allowedRoles={['student']}><MyCV /></ProtectedRoute>} />
            
            {/* Company Routes */}
            <Route path="/company/dashboard" element={<ProtectedRoute allowedRoles={['company']}><CompanyDashboard /></ProtectedRoute>} />
            <Route path="/company/applications" element={<ProtectedRoute allowedRoles={['company']}><CompanyApplications /></ProtectedRoute>} />
            <Route path="/company/manage-offers" element={<ProtectedRoute allowedRoles={['company']}><InternshipOfferManager /></ProtectedRoute>} />
            <Route path="/company/company-profile" element={<ProtectedRoute allowedRoles={['company']}><CompanyPublicProfile /></ProtectedRoute>} />
            <Route path="/company/profile" element={<ProtectedRoute allowedRoles={['company']}><MyProfile /></ProtectedRoute>} />
            
            {/* Company Manager Routes */}
            <Route path="/company-manager/dashboard" element={<ProtectedRoute allowedRoles={['company']}><CompanyManagerDashboard /></ProtectedRoute>} />
            <Route path="/company-manager/manage-hiring-managers" element={<ProtectedRoute allowedRoles={['company']}><ManageHiringManagers /></ProtectedRoute>} />
            <Route path="/company-manager/activity-logs" element={<ProtectedRoute allowedRoles={['company']}><CompanyActivityLogs /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/validations" element={<ProtectedRoute allowedRoles={['admin']}><DeptHeadValidations /></ProtectedRoute>} />
            <Route path="/admin/activity-logs" element={<ProtectedRoute allowedRoles={['admin']}><DeptHeadActivityLogs /></ProtectedRoute>} />
            <Route path="/admin/manage-students" element={<ProtectedRoute allowedRoles={['admin']}><ManageStudents /></ProtectedRoute>} />
            <Route path="/admin/university-profile" element={<ProtectedRoute allowedRoles={['admin']}><UniversityProfile /></ProtectedRoute>} />
            <Route path="/admin/manage-co-dept-heads" element={<ProtectedRoute allowedRoles={['admin']}><ManageCoDeptHeads /></ProtectedRoute>} />
            <Route path="/admin/my-profile" element={<ProtectedRoute allowedRoles={['admin']}><AdminMyProfile /></ProtectedRoute>} />
            
            {/* Co Dept Head Routes */}
            <Route path="/co-dept-head/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><CoDeptHeadDashboard /></ProtectedRoute>} />
            <Route path="/co-dept-head/validations" element={<ProtectedRoute allowedRoles={['admin']}><CoDeptValidations /></ProtectedRoute>} />
            <Route path="/co-dept-head/my-profile" element={<ProtectedRoute allowedRoles={['admin']}><AdminMyProfile /></ProtectedRoute>} />
            <Route path="/university/team" element={<ProtectedRoute allowedRoles={['admin']}><UniversityTeam /></ProtectedRoute>} />

            {/* Super Admin Route */}
            <Route path="/super-admin/dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthRedirect>
    </Router>
  );
}

export default App;