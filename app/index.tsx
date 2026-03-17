import * as SecureStore from 'expo-secure-store';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../firebaseConfig';
import { Redirect } from 'expo-router';
import { apiFetch } from '../services/apiClient';

type Destination =
  | '/login'
  | '/customer-home'
  | '/washer-home'
  | '/washer-pending';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking auth state...');

        // Wait for Firebase Auth to initialize
        const user = await new Promise<User | null>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('⏳ Auth check timed out after 5s');
            resolve(null);
          }, 5000);

          const unsubscribe = onAuthStateChanged(auth, (u) => {
            clearTimeout(timeout);
            unsubscribe();
            resolve(u);
          });
        });

        if (!user) {
          console.log('❌ No Firebase user found');
          await Promise.all([
            SecureStore.deleteItemAsync('accessToken'),
            SecureStore.deleteItemAsync('userType'),
          ]);
          setDestination('/login');
          return;
        }

        console.log('✅ Firebase user found:', user.email);
        const userType = await SecureStore.getItemAsync('userType');

        if (!userType) {
          console.log('⚠️ No userType in storage');
          setDestination('/login');
          return;
        }

        if (userType === 'customer') {
          setDestination('/customer-home');
          return;
        }

        if (userType === 'provider') {
          // Check if washer is verified before routing to home
          try {
            const data = await apiFetch('/auth/profile', {}, 'provider');
            if (data.success && data.data?.provider?.isVerified) {
              setDestination('/washer-home');
            } else {
              setDestination('/washer-pending');
            }
          } catch (profileError) {
            console.warn('⚠️ Could not fetch washer profile, routing to pending:', profileError);
            // Default to pending on error — safer than sending unverified washer to home
            setDestination('/washer-pending');
          }
          return;
        }

        // Unknown userType
        setDestination('/login');
      } catch (error) {
        console.error('Auth check error:', error);
        setDestination('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading || !destination) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}