import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../firebaseConfig';
import { User, onAuthStateChanged } from 'firebase/auth';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'provider' | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔍 Checking auth state...");

        // Wait for Firebase Auth to initialize with a timeout
        const user = await new Promise<User | null>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn("⏳ Auth check timed out after 5s");
            resolve(null);
          }, 5000);

          const unsubscribe = onAuthStateChanged(auth, (u) => {
            clearTimeout(timeout);
            unsubscribe();
            resolve(u);
          });
        });

        if (user) {
          console.log("✅ Firebase user found:", user.email);
          const type = await SecureStore.getItemAsync('userType');

          if (type) {
            setIsAuthenticated(true);
            setUserType(type as 'customer' | 'provider');
          } else {
            console.log("⚠️ No userType found in storage despite valid Firebase user");
            setIsAuthenticated(false);
          }
        } else {
          console.log("❌ No Firebase user found");
          // Clear any stale storage data
          await Promise.all([
            SecureStore.deleteItemAsync('accessToken'),
            SecureStore.deleteItemAsync('userType')
          ]);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

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