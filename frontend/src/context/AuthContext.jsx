import React, { createContext, useState, useContext } from "react";
import { authAPI } from "../services/auth";
import toast from "react-hot-toast";

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
    
    console.log("🔍 RÉPONSE COMPLÈTE DU BACKEND:", response);
    console.log("🔍 Success:", response.success);
    console.log("🔍 Token:", response.token);  // ← Changé de tokens à token
    console.log("🔍 User:", response.user);
    console.log("🔍 Redirect URL:", response.redirect_url);

    if (response.success) {
      localStorage.setItem("access_token", response.token);  // ← Changé
      localStorage.setItem("user_role", response.user.role); // ← Pas de refresh_token
      setUser(response.user);
      toast.success("Connexion réussie!");
      return { success: true, redirectUrl: response.redirect_url };
    } else {
      toast.error(response.message || "Erreur de connexion");
      return { success: false };
    }
  } catch (error) {
    console.error("❌ ERREUR API:", error);
    toast.error("Erreur de connexion au serveur");
    return { success: false };
  } finally {
    setLoading(false);
  }
};

  const registerStudent = async (studentData) => {
    setLoading(true);
    try {
      const response = await authAPI.registerStudent(studentData);

      if (response.success) {
        localStorage.setItem("access_token", response.tokens.access);
        localStorage.setItem("refresh_token", response.tokens.refresh);
        localStorage.setItem("user_role", response.user.role);
        setUser(response.user);
        toast.success("Inscription réussie!");
        return { success: true, redirectUrl: response.redirect_url };
      } else {
        if (response.errors) {
          Object.values(response.errors).forEach((err) => {
            if (Array.isArray(err)) toast.error(err[0]);
          });
        }
        return { success: false };
      }
    } catch (error) {
      toast.error("Erreur d'inscription");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const registerCompany = async (companyData) => {
    setLoading(true);
    try {
      const response = await authAPI.registerCompany(companyData);

      if (response.success) {
        localStorage.setItem("access_token", response.tokens.access);
        localStorage.setItem("refresh_token", response.tokens.refresh);
        localStorage.setItem("user_role", response.user.role);
        setUser(response.user);
        toast.success("Inscription entreprise réussie!");
        return { success: true, redirectUrl: response.redirect_url };
      } else {
        if (response.errors) {
          Object.values(response.errors).forEach((err) => {
            if (Array.isArray(err)) toast.error(err[0]);
          });
        }
        return { success: false };
      }
    } catch (error) {
      toast.error("Erreur d'inscription");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const registerAdmin = async (adminData) => {
    setLoading(true);
    try {
      const response = await authAPI.registerAdmin(adminData);

      if (response.success) {
        localStorage.setItem("access_token", response.token);
        localStorage.setItem("user_role", response.user.role);
        setUser(response.user);
        toast.success("Inscription admin réussie!");
        return { success: true, redirectUrl: response.redirect_url };
      } else {
        toast.error(response.message || "Erreur d'inscription admin");
        return { success: false };
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Erreur d'inscription admin");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    setUser(null);
    toast.success("Déconnexion réussie");
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
        registerAdmin,  // ← AJOUTÉ
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
