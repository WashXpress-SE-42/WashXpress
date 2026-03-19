import PayHere from '@/utils/Payhere';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header } from '../components/Header';
import { auth } from '../firebaseConfig';

const API_BASE = process.env.EXPO_PUBLIC_CUSTOMER_API_URL;

interface PaymentScreenParams {
  bookingId: string;
  amount: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
}

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as unknown as PaymentScreenParams;
  const { bookingId, amount, serviceName, scheduledDate, scheduledTime } = params;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  async function getFreshToken(): Promise<string> {
    const user = auth.currentUser;
    if (user) {
      const freshToken = await user.getIdToken(true);
      await SecureStore.setItemAsync('accessToken', freshToken);
      return freshToken;
    }
    // Fallback to stored token
    const stored = await SecureStore.getItemAsync('accessToken');
    if (stored) return stored;
    throw new Error('Not authenticated');
  }

  async function handlePayment() {
    try {
      setLoading(true);

      const token = await getFreshToken();

      // 1. Get hash from backend
      const hashRes = await fetch(`${API_BASE}/payments/hash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          amount,
          currency: 'LKR',
        }),
      });

      const hashData = await hashRes.json();

      if (!hashData.success) {
        throw new Error(hashData.message || 'Failed to initialize payment');
      }

      const { merchantId, orderId, hash, notifyUrl, sandbox } = hashData.data;

      // 2. Get customer profile for billing info
      const profileRes = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await profileRes.json();
      const profile = profileData.data || {};

      const nameParts = (profile.displayName || 'WashXpress Customer').split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      // 3. Build PayHere payment object
      const paymentObject = {
        sandbox: sandbox ?? true,
        merchant_id: merchantId,
        notify_url: notifyUrl,
        order_id: orderId,
        items: serviceName || 'Car Wash Service',
        amount: parseFloat(amount).toFixed(2),
        currency: 'LKR',
        first_name: firstName,
        last_name: lastName,
        email: profile.email || '',
        phone: profile.phone || '0771234567',
        address: profile.address || 'Colombo',
        city: profile.city || 'Colombo',
        country: 'Sri Lanka',
        custom_1: bookingId,
        custom_2: '',
      };

      setLoading(false);
      setStatus('processing');

      // 4. Launch PayHere
      PayHere.startPayment(
        paymentObject,
        async (paymentId: string) => {
          // Payment completed — poll backend for confirmation
          console.log('Payment completed:', paymentId);
          setStatus('success');
          await pollPaymentStatus();
        },
        (errorData: string) => {
          console.error('Payment error:', errorData);
          setStatus('failed');
          Alert.alert('Payment Failed', errorData || 'Payment could not be processed.');
        },
        () => {
          console.log('Payment dismissed');
          setStatus('idle');
        }
      );
    } catch (error: any) {
      setLoading(false);
      setStatus('failed');
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  }

  async function pollPaymentStatus(retries = 5) {
    for (let i = 0; i < retries; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const token = await getFreshToken();
        const res = await fetch(`${API_BASE}/payments/status/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data?.paymentStatus === 'paid') {
          setStatus('success');
          // Auto-redirect to confirmation if we want to skip the intermediate success view
          router.replace({ pathname: '/booking-confirmation', params: { bookingId, path: 'one_time' } });
          return;
        }
      } catch (e) {
        // continue polling
      }
    }
  }

  if (status === 'success') {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSub}>
          Your booking is confirmed. A washer will be assigned shortly.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace({ pathname: '/booking-confirmation', params: { bookingId, path: 'one_time' } })}
        >
          <Text style={styles.primaryButtonText}>View Confirmation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.failIcon}>❌</Text>
        <Text style={styles.failTitle}>Payment Failed</Text>
        <Text style={styles.failSub}>Your payment could not be processed. Please try again.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStatus('idle')}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Complete Payment" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subheading}>Secure payment via PayHere</Text>

        {/* Booking Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Summary</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Service</Text>
            <Text style={styles.rowValue}>{serviceName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Date</Text>
            <Text style={styles.rowValue}>{scheduledDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Time</Text>
            <Text style={styles.rowValue}>{scheduledTime}</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>LKR {parseFloat(amount).toLocaleString()}</Text>
          </View>
        </View>

        {/* Accepted Cards */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accepted Payment Methods</Text>
          <Text style={styles.acceptedCards}>💳 Visa · Mastercard · Amex · Mobile Wallet</Text>
        </View>

        {/* Test card note (sandbox only) */}
        <View style={styles.sandboxNote}>
          <Text style={styles.sandboxText}>🧪 Sandbox mode — use test card: 4916217501611292</Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.primaryButton, (loading || status === 'processing') && styles.buttonDisabled]}
          onPress={handlePayment}
          disabled={loading || status === 'processing'}
        >
          {loading || status === 'processing' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Pay LKR {parseFloat(amount).toLocaleString()}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 110 },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0d1629', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0d1629', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { fontSize: 14, color: '#64748b' },
  rowValue: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#0d1629' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#0ca6e8' },
  acceptedCards: { fontSize: 14, color: '#475569' },
  sandboxNote: {
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  sandboxText: { fontSize: 12, color: '#854d0e', textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#0ca6e8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  secondaryButtonText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#0d1629', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  failIcon: { fontSize: 64, marginBottom: 16 },
  failTitle: { fontSize: 24, fontWeight: '700', color: '#0d1629', marginBottom: 8 },
  failSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
});
