import api from './api';

export const authAPI = {
  registerStudent: async (studentData) => {
    const response = await api.post('/auth/register/student/', studentData);
    return response.data;
  },

  registerCompany: async (companyData) => {
    const response = await api.post('/auth/register/company/', companyData);
    return response.data;
  },

  registerAdmin: async (adminData) => {
    const response = await api.post('/auth/register/admin/', adminData);
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login/', { email, password });
    return response.data;
  },

  logout: async (refreshToken) => {
    const response = await api.post('/auth/logout/', { refresh: refreshToken });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me/');
    return response.data;
  }
};