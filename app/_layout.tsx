import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { UnifiedBottomNav } from '../components/UnifiedBottomNav';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import SplashScreen from './Splashscreen';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true); // ← start with splash

  if (showSplash) {
    return (
      <ErrorBoundary>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{
                headerShown: false,
                animation: 'fade_from_bottom',
                animationDuration: 200,
              }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="customer-home" options={{ headerShown: false }} />
                <Stack.Screen name="Mentorship" />
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" />
                <Stack.Screen name="washer-signup" />
                <Stack.Screen name="home" />
                <Stack.Screen name="washer-job-request" options={{ headerShown: false }} />
                <Stack.Screen name="washer-booking-details" options={{ headerShown: false }} />
                <Stack.Screen name="provider-home" />
                <Stack.Screen name="washer-home" />
                <Stack.Screen name="complaint-status" options={{ headerShown: false }} />
                <Stack.Screen name="complaint-new" options={{ headerShown: false }} />
                <Stack.Screen name="washer-pending" />
                <Stack.Screen name="washer-requests" />
                <Stack.Screen name="myjobs" />
                <Stack.Screen name="service-browse" />
                <Stack.Screen name="my-subscription" options={{ headerShown: false }} />
                <Stack.Screen name="service-details" />
                <Stack.Screen name="booking-details" />
                <Stack.Screen name="checkout-page" options={{ headerShown: false }} />
                <Stack.Screen name="subscriptionPaymentScreen" options={{ headerShown: false }} />
                <Stack.Screen name="washer-inprogress" />
                <Stack.Screen name="pre-existing-damage-section" options={{ headerShown: false }} />
                <Stack.Screen name="edit-profile" />
                <Stack.Screen name="subscriptions" options={{ headerShown: false }} />
                <Stack.Screen name="vehicle-list" options={{ headerShown: false }} />
                <Stack.Screen name="add-vehicle" options={{ headerShown: false }} />
                <Stack.Screen name="address-list" options={{ headerShown: false }} />
                <Stack.Screen name="add-address" options={{ headerShown: false }} />
                <Stack.Screen name="create-booking" options={{ headerShown: false }} />
                <Stack.Screen name="payment-screen" options={{ headerShown: false }} />
                <Stack.Screen name="booking-list" options={{ headerShown: false }} />
                <Stack.Screen name="booking-confirmation" options={{ headerShown: false, gestureEnabled: false }} />
              </Stack>
              <UnifiedBottomNav />
            </View>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}