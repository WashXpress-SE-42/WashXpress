import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import PayHere from '@/utils/Payhere';
import { apiFetch } from '@/services/apiClient';

export default function CheckoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { plan, vehicle, changeSubscriptionId } = useLocalSearchParams();

  const selectedPlan = JSON.parse(plan as string);
  const selectedVehicle = JSON.parse(vehicle as string);

  async function handlePayment() {
    try {
      // Cancel old plan if changing
      if (changeSubscriptionId) {
        await apiFetch(`/subscriptions/${changeSubscriptionId}/cancel`, {
          method: 'PATCH',
          body: JSON.stringify({ reason: 'Plan change' }),
        }, 'customer');
      }

      const data = await apiFetch('/subscriptions/initiate', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlan.id,
          vehicleId: selectedVehicle.id,
        }),
      }, 'customer');

      const p = data.data.payment;

      PayHere.startPayment(
        {
          sandbox: true,
          merchant_id: p.merchantId,
          notify_url: p.notifyUrl,
          order_id: p.orderId,
          items: p.items,
          amount: p.amount,
          currency: p.currency,
          first_name: p.firstName,
          last_name: p.lastName,
          email: p.email,
          phone: p.phone,
          address: p.address,
          city: p.city,
          country: p.country,
          custom_1: data.data.subscriptionId,
        },
        () => {
          Alert.alert('Success', 'Subscription Activated!');
          router.back();
        },
        (err: string) => Alert.alert('Payment Failed', err),
        () => {}
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      
      {/* Plan Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <Text style={styles.title}>{selectedPlan.name}</Text>
        <Text style={styles.price}>
          LKR {selectedPlan.price.toLocaleString()}
        </Text>

        <Text style={styles.section}>Includes:</Text>

        {selectedPlan.features.map((f: string, i: number) => (
          <Text key={i} style={styles.feature}>✓ {f}</Text>
        ))}
      </View>

      {/* Vehicle */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <Text style={styles.section}>Vehicle</Text>
        <Text>{selectedVehicle.make} {selectedVehicle.model}</Text>
        <Text>{selectedVehicle.licensePlate}</Text>
      </View>

      {/* Total */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <Text style={styles.total}>Total: LKR {selectedPlan.price}</Text>
      </View>

      {/* Pay Button */}
      <TouchableOpacity style={styles.payBtn} onPress={handlePayment}>
        <Text style={styles.payText}>Proceed to Payment</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },

  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },

  title: { fontSize: 20, fontWeight: '700' },
  price: { fontSize: 24, fontWeight: '800', marginTop: 8 },

  section: { marginTop: 12, fontWeight: '600' },

  feature: { marginTop: 4 },

  total: { fontSize: 18, fontWeight: '700' },

  payBtn: {
    backgroundColor: '#0ca6e8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  payText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});