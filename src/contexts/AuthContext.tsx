import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../services/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  enrollmentNo: string;
  role: 'student' | 'teacher';
}

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (enrollmentNo: string, password: string) => Promise<void>;
  register: (data: {
    enrollmentNo: string;
    email: string;
    password: string;
    fullName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userData = await SecureStore.getItemAsync('user');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData) as User;
          if (parsedUser.id && parsedUser.fullName && parsedUser.role) {
            setIsAuthenticated(true);
            setUser(parsedUser);
          } else {
            // Invalid user data stored, clear it
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('user');
          }
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
          // Invalid JSON stored, clear it
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('user');
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    }
  };

  const login = async (enrollmentNo: string, password: string) => {
    try {
      const response = await auth.login({ enrollmentNo, password });
      if (!response.data.token || !response.data.user) {
        throw new Error('Invalid response from server');
      }
      
      // Make sure we store strings
      const token = String(response.data.token);
      const userData = JSON.stringify(response.data.user);
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', userData);
      
      setIsAuthenticated(true);
      setUser(response.data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: {
    enrollmentNo: string;
    email: string;
    password: string;
    fullName: string;
  }) => {
    try {
      // First, try to register the user
      await auth.register({ ...data, role: 'student' });
      
      // If registration is successful, immediately try to login
      const loginResponse = await auth.login({
        enrollmentNo: data.enrollmentNo,
        password: data.password
      });

      if (!loginResponse.data.token || !loginResponse.data.user) {
        throw new Error('Invalid response from server after registration');
      }
      
      // Make sure we store strings
      const token = String(loginResponse.data.token);
      const userData = JSON.stringify(loginResponse.data.user);
      
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', userData);
      
      setIsAuthenticated(true);
      setUser(loginResponse.data.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
