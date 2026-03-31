import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
// 1. IMPORT THE NEW COMPONENT
import InternshipOfferManager from './page/InternshipOfferManager'; 
import './App.css';

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
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/student/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/company/dashboard" element={
            <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['hiring_manager']}>
              <CompanyDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/company-manager/dashboard" element={
            <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['company_manager']}>
              <CompanyManagerDashboard />
            </ProtectedRoute>
          } />

          {/* 2. ADD THE NEW MANAGE OFFERS ROUTE */}
          {/* Accessible by both types of company managers */}
          <Route path="/company/manage-offers" element={
            <ProtectedRoute 
              allowedRoles={['company']} 
              allowedSubRoles={['hiring_manager', 'company_manager']}
            >
              <InternshipOfferManager />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/co-dept-head/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']} allowedSubRoles={['co_dept_head']}>
              <CoDeptHeadDashboard />
            </ProtectedRoute>
          } />

          <Route path="/company/applications" element={
          <ProtectedRoute allowedRoles={['company']} allowedSubRoles={['hiring_manager', 'company_manager']}>
         <CompanyApplications />
         </ProtectedRoute>
        } />
        <Route path="/student/applications" element={
  <ProtectedRoute allowedRoles={['student']}>
    <StudentApplications />
  </ProtectedRoute>
} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;