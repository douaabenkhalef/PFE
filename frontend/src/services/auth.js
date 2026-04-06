
import api from './api';

export const authAPI = {
  initiateSignup: async (role, userData) => {
    try {
      const response = await api.post('/auth/initiate-signup/', { role, ...userData });
      return response.data;
    } catch (error) {
      console.error(" initiateSignup error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || "Erreur de connexion au serveur"
      };
    }
  },

  completeSignup: async (email, code) => {
    try {
      const response = await api.post('/auth/complete-signup/', { email, code });
      return response.data;
    } catch (error) {
      console.error("❌ completeSignup error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || "Erreur de connexion au serveur"
      };
    }
  },

  registerStudent: async (studentData) => {
    try {
      const response = await api.post('/auth/register/student/', studentData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  registerCompany: async (companyData) => {
    try {
      const response = await api.post('/auth/register/company/', companyData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  registerAdmin: async (adminData) => {
    try {
      const response = await api.post('/auth/register/admin/', adminData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login/', { email, password });
      return response.data;
    } catch (error) {
     
      console.error(" Login API error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { 
        success: false, 
        message: "Erreur de connexion au serveur",
        errors: { non_field_errors: ["Erreur de connexion au serveur"] }
      };
    }
  },

  logout: async (refreshToken) => {
    try {
      const response = await api.post('/auth/logout/', { refresh: refreshToken });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me/');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  }
};