import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="washer-signup" />
          <Stack.Screen name="home" />
          <Stack.Screen name="customer-home" />
          <Stack.Screen name="provider-home" />
          <Stack.Screen name="washer-home" />
          <Stack.Screen name="washer-pending" />
          <Stack.Screen name="washer-job-request" />
          <Stack.Screen name="washer-requests" />
          <Stack.Screen name="service-browse" />
          <Stack.Screen name="service-details" />
          <Stack.Screen name="booking-details" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="profile" />
        </Stack>
      </QueryClientProvider>
    </AuthProvider>
  );
}
