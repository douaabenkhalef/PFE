// frontend/src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LanguageSelector from './components/LanguageSelector'; // Ajouter cette ligne
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
import './App.css';

// Composant qui applique la langue sauvegardée
const LanguageInitializer = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    const savedLang = localStorage.getItem('selected_language');
    if (savedLang && savedLang !== 'fr') {
      // Optionnel: appliquer la traduction automatiquement
      console.log('Langue sauvegardée:', savedLang);
    }
  }, [location.pathname]);

  return children;
};

const ProtectedRoute = ({ children, allowedRoles, allowedSubRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Chargement...</div>;
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
  return (
    <Router>
      <LanguageInitializer>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Student Routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>
            } />
            <Route path="/student/applications" element={
              <ProtectedRoute allowedRoles={['student']}><StudentApplications /></ProtectedRoute>
            } />
            <Route path="/student/profile" element={
              <ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>
            } />
            <Route path="/student/profile/:username" element={
              <ProtectedRoute allowedRoles={['student', 'company', 'admin']}><StudentProfile /></ProtectedRoute>
            } />
            <Route path="/student/cv" element={
              <ProtectedRoute allowedRoles={['student']}><MyCV /></ProtectedRoute>
            } />
            
            {/* Company Routes */}
            <Route path="/company/dashboard" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['hiring_manager']}><CompanyDashboard /></ProtectedRoute>
            } />
            <Route path="/company/applications" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['hiring_manager', 'company_manager']}><CompanyApplications /></ProtectedRoute>
            } />
            <Route path="/company/manage-offers" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['hiring_manager', 'company_manager']}><InternshipOfferManager /></ProtectedRoute>
            } />
            <Route path="/company/company-profile" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['hiring_manager', 'company_manager']}>
                <CompanyPublicProfile />
              </ProtectedRoute>
            } />
            <Route path="/company/profile" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['hiring_manager', 'company_manager']}><MyProfile /></ProtectedRoute>
            } />
            
            {/* Company Manager Routes */}
            <Route path="/company-manager/dashboard" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['company_manager']}><CompanyManagerDashboard /></ProtectedRoute>
            } />
            <Route path="/company-manager/manage-hiring-managers" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['company_manager']}><ManageHiringManagers /></ProtectedRoute>
            } />
            <Route path="/company-manager/activity-logs" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['company_manager']}><CompanyActivityLogs /></ProtectedRoute>
            } />
            <Route path="/company-manager/profile" element={
              <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['company_manager']}><MyProfile /></ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin']}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/validations" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin']}><DeptHeadValidations /></ProtectedRoute>
            } />
            <Route path="/admin/activity-logs" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin']}><DeptHeadActivityLogs /></ProtectedRoute>
            } />
            <Route path="/admin/manage-students" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin', 'co_dept_head']}><ManageStudents /></ProtectedRoute>
            } />
            <Route path="/admin/university-profile" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin', 'co_dept_head']}><UniversityProfile /></ProtectedRoute>
            } />
            <Route path="/admin/manage-co-dept-heads" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin']}><ManageCoDeptHeads /></ProtectedRoute>
            } />
            <Route path="/admin/my-profile" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin']}>
                <AdminMyProfile />
              </ProtectedRoute>
            } />
            
            {/* Co Dept Head Routes */}
            <Route path="/co-dept-head/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['co_dept_head']}><CoDeptHeadDashboard /></ProtectedRoute>
            } />
            <Route path="/co-dept-head/validations" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['co_dept_head']}><CoDeptValidations /></ProtectedRoute>
            } />
            <Route path="/co-dept-head/my-profile" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['co_dept_head']}>
                <AdminMyProfile />
              </ProtectedRoute>
            } />
            
            {/* Common Routes */}
            <Route path="/university/team" element={
              <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin', 'co_dept_head']}>
                <UniversityTeam />
              </ProtectedRoute>
            } />
            <Route path="/about" element={<AboutUs />} />
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </LanguageInitializer>
    </Router>
  );
}

export default App;