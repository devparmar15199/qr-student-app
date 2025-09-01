import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { auth, AuthResponse } from '../services/api';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
};

interface User {
  _id: string;
  fullName: string;
  email: string;
  enrollmentNo?: string;
  role: 'student' | 'teacher' | 'admin';
}

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (data: { enrollmentNo?: string, email?: string; password: string }) => Promise<void>;
  register: (data: {
    enrollmentNo?: string;
    email: string;
    password: string;
    fullName: string;
    role: 'student' | 'teacher' | 'admin';
    faceEmbedding?: number[];
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
          if (parsedUser._id && parsedUser.fullName && parsedUser.role) {
            setIsAuthenticated(true);
            setUser(parsedUser);
          } else {
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('user');
            await SecureStore.deleteItemAsync('role');
          }
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('user');
          await SecureStore.deleteItemAsync('role');
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    }
  };

  const login = async (data: { enrollmentNo?: string, email?: string; password: string }) => {
    try {
      const response = await auth.login(data);
      const { token, user } = response;
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('role', user.role);
      setIsAuthenticated(true);
      setUser(user);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      console.error('Login error:', message, error);
      throw new Error(message);
    }
  };

  const register = async (data: {
    enrollmentNo?: string;
    email: string;
    password: string;
    fullName: string;
    role: 'student' | 'teacher' | 'admin';
    faceEmbedding?: number[];
  }) => {
    try {
      const response = await auth.register(data);
      const { token, user } = response;
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('role', user.role);
      setIsAuthenticated(true);
      setUser(user);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      console.error('Registration error:', message, error);
      throw new Error(message);
    }
  };

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('role');
      setIsAuthenticated(false);
      setUser(null);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  }, [navigation]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
