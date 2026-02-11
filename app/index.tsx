import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'provider' | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const type = await SecureStore.getItemAsync('userType');

      if (token && type) {
        setIsAuthenticated(true);
        setUserType(type as 'customer' | 'provider');
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (isAuthenticated && userType === 'customer') {
    return <Redirect href="/customer-home" />;
  }

  if (isAuthenticated && userType === 'provider') {
    return <Redirect href="/provider-home" />;
  }

  return <Redirect href="/login" />;
}