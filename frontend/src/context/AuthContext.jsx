// frontend/src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/auth";
import toast from "react-hot-toast";
import { ERROR_MESSAGES } from "../utils/messages";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [pendingRole, setPendingRole] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 🔥 حالات 2FA
  const [requires2FA, setRequires2FA] = useState(false);
  const [pending2FAEmail, setPending2FAEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userRole = localStorage.getItem("user_role");
    const userSubRole = localStorage.getItem("user_sub_role");
    const userEmail = localStorage.getItem("user_email");
    const userFullName = localStorage.getItem("user_full_name");
    const userCompanyName = localStorage.getItem("user_company_name");
    const userUniversity = localStorage.getItem("user_university");
    const userId = localStorage.getItem("user_id");
    const userUsername = localStorage.getItem("user_username");

    if (token && userRole) {
      setUser({
        id: userId,
        role: userRole,
        sub_role: userSubRole,
        email: userEmail,
        username: userUsername,
        full_name: userFullName,
        company_name: userCompanyName,
        university: userUniversity,
        status: true,
      });
      setIsAuthenticated(true);
    }
  }, []);

  // 🔥 دالة تسجيل الدخول مع دعم 2FA
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      console.log("📥 Login response:", response);
      
      if (response.success) {
        // 🔥 إذا كان المستخدم يحتاج إلى 2FA
        if (response.requires_2fa) {
          setRequires2FA(true);
          setPending2FAEmail(response.email);
          // إرسال الكود تلقائياً
          await authAPI.send2FACode(email);
          return { success: true, requires_2fa: true, email: response.email };
        }
        
        // تسجيل الدخول العادي
        localStorage.setItem("access_token", response.token);
        localStorage.setItem("user_role", response.user.role);
        localStorage.setItem("user_sub_role", response.user.sub_role || "");
        localStorage.setItem("user_email", response.user.email);
        localStorage.setItem("user_id", response.user.id);
        
        if (response.user.username) {
          localStorage.setItem("user_username", response.user.username);
        }
        if (response.user.full_name) {
          localStorage.setItem("user_full_name", response.user.full_name);
        }
        if (response.user.company_name) {
          localStorage.setItem("user_company_name", response.user.company_name);
        }
        if (response.user.university) {
          localStorage.setItem("user_university", response.user.university);
        }
        
        setUser({
          id: response.user.id,
          role: response.user.role,
          sub_role: response.user.sub_role,
          email: response.user.email,
          username: response.user.username,
          full_name: response.user.full_name,
          company_name: response.user.company_name,
          university: response.user.university,
          status: true,
        });
        setIsAuthenticated(true);
        
        let redirectUrl = "/login";
        if (response.user.role === 'student') {
          redirectUrl = "/student/dashboard";
        } else if (response.user.role === 'company') {
          if (response.user.sub_role === 'company_manager') {
            redirectUrl = "/company-manager/dashboard";
          } else {
            redirectUrl = "/company/dashboard";
          }
        } else if (response.user.role === 'admin') {
          if (response.user.sub_role === 'admin') {
            redirectUrl = "/admin/dashboard";
          } else {
            redirectUrl = "/co-dept-head/dashboard";
          }
        }
        
        return { success: true, redirectUrl };
      }
      
      let errorMessage = "Email ou mot de passe incorrect.";
      if (response.message) {
        errorMessage = response.message;
      } else if (response.errors && response.errors.non_field_errors && response.errors.non_field_errors.length > 0) {
        errorMessage = response.errors.non_field_errors[0];
      }
      
      return {
        success: false,
        errors: response.errors || { non_field_errors: [errorMessage] },
        message: errorMessage,
      };
    } catch (error) {
      console.error("❌ Error:", error);
      return {
        success: false,
        errors: { non_field_errors: [ERROR_MESSAGES.SERVER_ERROR] },
        message: ERROR_MESSAGES.SERVER_ERROR,
      };
    } finally {
      setLoading(false);
    }
  };

  // 🔥 التحقق من كود 2FA
  const verify2FACode = async (email, code) => {
    setLoading(true);
    try {
      const response = await authAPI.verify2FACode(email, code);
      console.log("📥 2FA verify response:", response);
      
      if (response.success) {
        localStorage.setItem("access_token", response.token);
        localStorage.setItem("user_role", response.user.role);
        localStorage.setItem("user_sub_role", response.user.sub_role || "");
        localStorage.setItem("user_email", response.user.email);
        localStorage.setItem("user_id", response.user.id);
        
        if (response.user.username) {
          localStorage.setItem("user_username", response.user.username);
        }
        if (response.user.full_name) {
          localStorage.setItem("user_full_name", response.user.full_name);
        }
        if (response.user.company_name) {
          localStorage.setItem("user_company_name", response.user.company_name);
        }
        if (response.user.university) {
          localStorage.setItem("user_university", response.user.university);
        }
        
        setUser({
          id: response.user.id,
          role: response.user.role,
          sub_role: response.user.sub_role,
          email: response.user.email,
          username: response.user.username,
          full_name: response.user.full_name,
          company_name: response.user.company_name,
          university: response.user.university,
          status: true,
        });
        setIsAuthenticated(true);
        setRequires2FA(false);
        setPending2FAEmail('');
        
        let redirectUrl = "/login";
        if (response.user.role === 'student') {
          redirectUrl = "/student/dashboard";
        } else if (response.user.role === 'company') {
          if (response.user.sub_role === 'company_manager') {
            redirectUrl = "/company-manager/dashboard";
          } else {
            redirectUrl = "/company/dashboard";
          }
        } else if (response.user.role === 'admin') {
          if (response.user.sub_role === 'admin') {
            redirectUrl = "/admin/dashboard";
          } else {
            redirectUrl = "/co-dept-head/dashboard";
          }
        }
        
        return { success: true, redirectUrl };
      }
      
      return { success: false, error: response.error || "Code invalide" };
    } catch (error) {
      console.error("❌ Error:", error);
      return { success: false, error: ERROR_MESSAGES.SERVER_ERROR };
    } finally {
      setLoading(false);
    }
  };

  // 🔥 تفعيل 2FA عبر البريد الإلكتروني
  const enableEmail2FA = async () => {
    setLoading(true);
    try {
      const response = await authAPI.enableEmail2FA();
      if (response.success) {
        toast.success("2FA via email enabled successfully!");
        return { success: true };
      }
      toast.error(response.error || "Failed to enable 2FA");
      return { success: false };
    } catch (error) {
      toast.error(ERROR_MESSAGES.SERVER_ERROR);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // 🔥 تعطيل 2FA
  const disableEmail2FA = async () => {
    setLoading(true);
    try {
      const response = await authAPI.disableEmail2FA();
      if (response.success) {
        toast.success("2FA disabled successfully");
        return { success: true };
      }
      toast.error(response.error || "Failed to disable 2FA");
      return { success: false };
    } catch (error) {
      toast.error(ERROR_MESSAGES.SERVER_ERROR);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // 🔥 الحصول على حالة 2FA
  const get2FAStatus = async () => {
    try {
      const response = await authAPI.get2FAStatus();
      if (response.success) {
        return { enabled: response.two_fa_enabled };
      }
      return { enabled: false };
    } catch (error) {
      return { enabled: false };
    }
  };

  const initiateSignup = async (role, formData) => {
    setLoading(true);
    try {
      const response = await authAPI.initiateSignup(role, formData);
      if (response.success) {
        setPendingEmail(response.email);
        setPendingRole(role);
        setPendingData(formData);
        toast.success("Un code de vérification a été envoyé à votre email");
        return { success: true, email: response.email };
      }
      
      let errorMessage = "Erreur lors de l'inscription";
      if (response.message) errorMessage = response.message;
      toast.error(errorMessage);
      return { success: false, errors: response.errors };
    } catch (error) {
      toast.error(ERROR_MESSAGES.SERVER_ERROR);
      return { success: false, errors: { non_field_errors: [ERROR_MESSAGES.SERVER_ERROR] } };
    } finally {
      setLoading(false);
    }
  };

  const completeSignup = async (email, code) => {
    setLoading(true);
    try {
      const response = await authAPI.completeSignup(email, code);
      if (response.success) {
        if (response.token) {
          localStorage.setItem("access_token", response.token);
          localStorage.setItem("user_role", response.user.role);
          localStorage.setItem("user_sub_role", response.user.sub_role || "");
          localStorage.setItem("user_email", response.user.email);
          localStorage.setItem("user_id", response.user.id);
          
          if (response.user.username) {
            localStorage.setItem("user_username", response.user.username);
          }
          if (response.user.full_name) {
            localStorage.setItem("user_full_name", response.user.full_name);
          }
          if (response.user.company_name) {
            localStorage.setItem("user_company_name", response.user.company_name);
          }
          if (response.user.university) {
            localStorage.setItem("user_university", response.user.university);
          }
          
          setUser({
            id: response.user.id,
            role: response.user.role,
            sub_role: response.user.sub_role,
            email: response.user.email,
            username: response.user.username,
            full_name: response.user.full_name,
            company_name: response.user.company_name,
            university: response.user.university,
            status: true,
          });
          setIsAuthenticated(true);
        }
        
        setPendingEmail(null);
        setPendingRole(null);
        setPendingData(null);
        
        if (response.pending) {
          toast.success(response.message);
        } else {
          toast.success("Inscription réussie !");
        }
        
        return { 
          success: true, 
          redirectUrl: response.redirect_url,
          pending: response.pending || false,
          message: response.message,
          sub_role: response.sub_role
        };
      }
      
      let errorMessage = response.message || "Code invalide";
      toast.error(errorMessage);
      return { 
        success: false, 
        message: errorMessage, 
        errors: response.errors,
        code_invalid: response.code_invalid 
      };
    } catch (error) {
      toast.error(ERROR_MESSAGES.SERVER_ERROR);
      return { success: false, message: ERROR_MESSAGES.SERVER_ERROR };
    } finally {
      setLoading(false);
    }
  };

  const registerStudent = async (studentData) => {
    return initiateSignup('student', studentData);
  };

  const registerCompany = async (companyData) => {
    return initiateSignup('company', companyData);
  };

  const registerAdmin = async (adminData) => {
    return initiateSignup('admin', adminData);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_sub_role");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_full_name");
    localStorage.removeItem("user_company_name");
    localStorage.removeItem("user_university");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_username");
    setUser(null);
    setIsAuthenticated(false);
    setPendingEmail(null);
    setPendingRole(null);
    setPendingData(null);
    setRequires2FA(false);
    setPending2FAEmail('');
    toast.success("Déconnexion réussie");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pendingEmail,
        pendingRole,
        pendingData,
        login,
        logout,
        registerStudent,
        registerCompany,
        registerAdmin,
        completeSignup,
        isAuthenticated,
        // 🔥 دوال 2FA
        requires2FA,
        pending2FAEmail,
        verify2FACode,
        enableEmail2FA,
        disableEmail2FA,
        get2FAStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};