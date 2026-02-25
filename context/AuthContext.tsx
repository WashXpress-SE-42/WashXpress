import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { CustomerProfile, signOut } from '../services/authService';

interface AuthState {
  isLoading: boolean;
  token: string | null;
  userType: 'customer' | 'provider' | null;
  user: CustomerProfile | null;
}

interface AuthContextType extends AuthState {
  setAuth: (token: string, userType: 'customer' | 'provider', user: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    token: null,
    userType: null,
    user: null,
  });

  useEffect(() => {
    // Load auth state from storage on mount
    const loadStore = async () => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        const userType = (await SecureStore.getItemAsync('userType')) as 'customer' | 'provider' | null;
        
        let user = null;
        if (userType) {
          const userStr = await SecureStore.getItemAsync(userType === 'customer' ? 'customer' : 'provider');
          if (userStr) {
            user = JSON.parse(userStr);
          }
        }

        setState({
          isLoading: false,
          token,
          userType,
          user,
        });
      } catch (error) {
        console.error('Failed to load auth state:', error);
        setState(s => ({ ...s, isLoading: false }));
      }
    };

    loadStore();
  }, []);

  const setAuth = async (token: string, userType: 'customer' | 'provider', user: any) => {
    await SecureStore.setItemAsync('accessToken', token);
    await SecureStore.setItemAsync('userType', userType);
    await SecureStore.setItemAsync(
      userType === 'customer' ? 'customer' : 'provider',
      JSON.stringify(user)
    );
    setState({ isLoading: false, token, userType, user });
  };

  const logout = async () => {
    await signOut(); // This clears SecureStore and signs out of Firebase
    setState({ isLoading: false, token: null, userType: null, user: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
