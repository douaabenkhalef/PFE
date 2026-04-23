// frontend/src/services/auth.js

import api from './api';

export const authAPI = {
  initiateSignup: async (role, userData) => {
    try {
      const response = await api.post('/auth/initiate-signup/', { role, ...userData });
      return response.data;
    } catch (error) {
      console.error("❌ initiateSignup error:", error);
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
      console.error("❌ Login API error:", error);
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

  logout: async () => {
    try {
      // Si vous avez un endpoint de logout, décommentez cette partie
      // const response = await api.post('/auth/logout/');
      // return response.data;
      
      // Pour l'instant, on retourne simplement un succès
      return { success: true };
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  // ============ 2FA METHODS ============
  
  send2FACode: async (email) => {
    try {
      const response = await api.post('/auth/send-2fa-code/', { email });
      return response.data;
    } catch (error) {
      console.error("❌ send2FACode error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message || "Erreur d'envoi du code" };
    }
  },

  verify2FACode: async (email, code) => {
    try {
      const response = await api.post('/auth/verify-2fa-code/', { email, code });
      return response.data;
    } catch (error) {
      console.error("❌ verify2FACode error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message || "Erreur de vérification" };
    }
  },

  enableEmail2FA: async () => {
    try {
      const response = await api.post('/auth/enable-email-2fa/');
      return response.data;
    } catch (error) {
      console.error("❌ enableEmail2FA error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message || "Erreur d'activation" };
    }
  },

  disableEmail2FA: async () => {
    try {
      const response = await api.post('/auth/disable-email-2fa/');
      return response.data;
    } catch (error) {
      console.error("❌ disableEmail2FA error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message || "Erreur de désactivation" };
    }
  },

  get2FAStatus: async () => {
    try {
      const response = await api.get('/auth/2fa-status/');
      return response.data;
    } catch (error) {
      console.error("❌ get2FAStatus error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, two_fa_enabled: false };
    }
  },

  // ============ RECOVERY EMAIL METHODS ============

  addRecoveryEmail: async (recoveryEmail) => {
    try {
      const response = await api.post('/auth/add-recovery-email/', { recovery_email: recoveryEmail });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message };
    }
  },

  verifyRecoveryEmail: async (email, code) => {
    try {
      const response = await api.post('/auth/verify-recovery-email/', { email, code });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message };
    }
  },

  removeRecoveryEmail: async () => {
    try {
      const response = await api.delete('/auth/remove-recovery-email/');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message };
    }
  },

  securityStatus: async () => {
    try {
      const response = await api.get('/auth/security-status/');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false };
    }
  },

  // ============ PASSWORD CHANGE WITH OTP ============

  initiatePasswordChange: async () => {
    try {
      const response = await api.post('/auth/initiate-password-change/');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message };
    }
  },

  verifyAndChangePassword: async (code, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/auth/verify-and-change-password/', {
        code,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, error: error.message };
    }
  },

  // ============ FORGOT PASSWORD ============

  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password/', { email });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  resetPassword: async (email, code, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/auth/reset-password/', {
        email,
        code,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  forgotPasswordWithRecovery: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password-recovery/', { email });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  // ============ CURRENT USER ============

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me/');
      return response.data;
    } catch (error) {
      console.error("❌ getCurrentUser error:", error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  },

  checkUserExists: async () => {
    try {
      const response = await api.get('/auth/check-user/');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return { exists: false, error: error.message };
    }
  }
};

export default authAPI;