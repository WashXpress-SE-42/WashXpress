import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import SplashScreen from './Splashscreen';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true); // ← start with splash

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="Mentorship" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="washer-signup" />
            <Stack.Screen name="home" />
            <Stack.Screen name="washer-job-request" options={{ headerShown: false }} />
            <Stack.Screen name="washer-booking-details" options={{ headerShown: false }} />
            <Stack.Screen name="customer-home" />
            <Stack.Screen name="provider-home" />
            <Stack.Screen name="washer-home" />
            <Stack.Screen name="washer-pending" />
            <Stack.Screen name="washer-requests" />
            <Stack.Screen name="service-browse" />
            <Stack.Screen name="my-subscription" options={{ headerShown: false }} />
            <Stack.Screen name="service-details" />
            <Stack.Screen name="booking-details" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="subscriptions" options={{ headerShown: false }} />
            <Stack.Screen name="vehicle-list" options={{ headerShown: false }} />
            <Stack.Screen name="add-vehicle" options={{ headerShown: false }} />
            <Stack.Screen name="address-list" options={{ headerShown: false }} />
            <Stack.Screen name="add-address" options={{ headerShown: false }} />
            <Stack.Screen name="create-booking" options={{ headerShown: false }} />
            <Stack.Screen name="booking-confirmation" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
