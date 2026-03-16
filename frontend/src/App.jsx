import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AuthPage from './page/AuthPage';
import StudentDashboard from './page/StudentDashboard';
import CompanyDashboard from './page/CompanyDashboard';
import AdminDashboard from './page/AdminDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Route par défaut - AuthPage */}
            <Route path="/" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            
            {/* Routes des dashboards */}
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/company/dashboard" element={<CompanyDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* Redirection pour les routes inconnues */}
            <Route path="*" element={<AuthPage />} />
          </Routes>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '8px',
                padding: '16px',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
                style: {
                  background: '#10b981',
                  color: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
                style: {
                  background: '#ef4444',
                  color: '#fff',
                },
              },
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;