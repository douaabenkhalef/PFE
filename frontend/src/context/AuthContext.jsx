import React, { createContext, useState, useContext } from "react";
import { authAPI } from "../services/auth";

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

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      if (response.success) {
        localStorage.setItem("access_token", response.token);
        localStorage.setItem("user_role", response.user.role);
        setUser(response.user);
        return { success: true, redirectUrl: response.redirect_url };
      }
      return {
        success: false,
        errors: response.errors || null,
        message: response.message || "Login failed.",
      };
    } catch {
      return {
        success: false,
        errors: { non_field_errors: ["Unable to connect to the server. Please try again."] },
      };
    } finally {
      setLoading(false);
    }
  };

  const registerStudent = async (studentData) => {
    setLoading(true);
    try {
      const response = await authAPI.registerStudent(studentData);
      if (response.success) {
        localStorage.setItem("access_token", response.token);
        localStorage.setItem("user_role", response.user.role);
        setUser(response.user);
        return { success: true, redirectUrl: response.redirect_url };
      }
      return {
        success: false,
        errors: response.errors || null,
        message: response.message || "Registration failed.",
      };
    } catch {
      return {
        success: false,
        errors: { non_field_errors: ["Unable to connect to the server. Please try again."] },
      };
    } finally {
      setLoading(false);
    }
  };

  const registerCompany = async (companyData) => {
    setLoading(true);
    try {
      const response = await authAPI.registerCompany(companyData);
      // pending = true means account created but not yet approved — no token
      if (response.success && response.pending) {
        return { success: true, pending: true, message: response.message };
      }
      if (response.success) {
        localStorage.setItem("access_token", response.token);
        localStorage.setItem("user_role", response.user.role);
        setUser(response.user);
        return { success: true, redirectUrl: response.redirect_url };
      }
      return {
        success: false,
        errors: response.errors || null,
        message: response.message || "Registration failed.",
      };
    } catch {
      return {
        success: false,
        errors: { non_field_errors: ["Unable to connect to the server. Please try again."] },
      };
    } finally {
      setLoading(false);
    }
  };

  const registerAdmin = async (adminData) => {
    setLoading(true);
    try {
      const response = await authAPI.registerAdmin(adminData);
      if (response.success && response.pending) {
        return { success: true, pending: true, message: response.message };
      }
      if (response.success) {
        localStorage.setItem("access_token", response.token);
        localStorage.setItem("user_role", response.user.role);
        setUser(response.user);
        return { success: true, redirectUrl: response.redirect_url };
      }
      return {
        success: false,
        errors: response.errors || null,
        message: response.message || "Registration failed.",
      };
    } catch {
      return {
        success: false,
        errors: { non_field_errors: ["Unable to connect to the server. Please try again."] },
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        registerStudent,
        registerCompany,
        registerAdmin,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};