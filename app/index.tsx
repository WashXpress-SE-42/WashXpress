import * as SecureStore from 'expo-secure-store';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../firebaseConfig';
import { apiFetch } from '../services/apiClient';
import { Redirect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

type Destination =
  | '/login'
  | '/customer-home'
  | '/washer-home'
  | '/washer-pending';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [destination, setDestination] = useState<Destination | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await new Promise<User | null>((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000);
          const unsubscribe = onAuthStateChanged(auth, (u) => {
            clearTimeout(timeout);
            unsubscribe();
            resolve(u);
          });
        });

        if (!user) {
          await Promise.all([
            SecureStore.deleteItemAsync('accessToken'),
            SecureStore.deleteItemAsync('userType'),
          ]);
          setDestination('/login');
          return;
        }

        const userType = await SecureStore.getItemAsync('userType');
        if (!userType) {
          setDestination('/login');
          return;
        }

        if (userType === 'customer') {
          setDestination('/customer-home');
          return;
        }

        if (userType === 'provider') {
          try {
            console.log(`[Index] 🔍 Checking washer status for UID: ${user.uid}`);
            const data = await apiFetch('/auth/washer/profile', {}, 'provider');

            // Support both flattened and nested response shapes
            const providerData = data.provider || (data.data && data.data.provider);

            if (data.success && providerData) {
              const isVerified = providerData.isVerified === true;
              const status = providerData.washerStatus || providerData.status;

              console.log(`[Index] ✅ Profile Found: isVerified=${isVerified}, status=${status}`);

              if (isVerified) {
                setDestination('/washer-home');
              } else {
                console.warn(`[Index] ⏳ Washer is not yet verified. redirecting to pending.`);
                setDestination('/washer-pending');
              }
            } else {
              console.warn(
                `[Index] ⚠️ Provider fetch succeeded but no data found. defaulting to pending.`,
                data
              );
              setDestination('/washer-pending');
            }
          } catch (error: any) {
            console.error(`[Index] ❌ Provider profile fetch failed:`, error?.message);
            // Backend doesn't recognize this provider (e.g. "User not found") — require re-login
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('userType');
            await SecureStore.deleteItemAsync('provider');
            setDestination('/login');
          }
          return;
        }

        // Fallback for any unsupported userType
        setDestination('/login');
      } catch {
        setDestination('/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading || !destination) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
