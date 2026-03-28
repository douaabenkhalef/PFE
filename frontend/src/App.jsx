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

const DashboardRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  } else if (user?.role === 'company') {
    if (user?.sub_role === 'company_manager') {
      return <Navigate to="/company-manager/dashboard" replace />;
    } else {
      return <Navigate to="/company/dashboard" replace />;
    }
  } else if (user?.role === 'admin') {
    if (user?.sub_role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/co-dept-head/dashboard" replace />;
    }
  }

  return <Navigate to="/login" replace />;
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
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;