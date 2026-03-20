import PayHere from '@/utils/Payhere';
import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useTheme } from '../context/ThemeContext';

export default function SubscriptionCheckoutScreen() {
  const { colors, isDark } = useTheme();
  const { plan, vehicle, changeSubscriptionId } = useLocalSearchParams<{
    plan: string;
    vehicle: string;
    changeSubscriptionId?: string;
  }>();

  const selectedPlan = JSON.parse(plan as string);
  const selectedVehicle = JSON.parse(vehicle as string);
  const isChangingPlan = !!changeSubscriptionId && changeSubscriptionId !== '';

  const [paying, setPaying] = useState(false);

  async function handlePayment() {
    setPaying(true);
    try {
      // 1. Cancel old plan first if changing
      if (isChangingPlan) {
        await apiFetch(`/subscriptions/${changeSubscriptionId}/cancel`, {
          method: 'PATCH',
          body: JSON.stringify({ reason: 'Plan change' }),
        }, 'customer');
      }

      // 2. Initiate subscription — backend creates a pending Firestore doc + returns PayHere params
      const data = await apiFetch('/subscriptions/initiate', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlan.id,
          vehicleId: selectedVehicle.id,
        }),
      }, 'customer');

      if (!data.success) throw new Error(data.message);

      const p = data.data.payment;
      const subscriptionId = data.data.subscriptionId;

      // 3. Launch PayHere checkout
      PayHere.startPayment(
        {
          sandbox: p.sandbox ?? true,
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
          custom_1: subscriptionId,
          custom_2: '',
          hash: p.hash,
        },
        async () => {
          // 4. Payment success — activate subscription in Firestore
          try {
            await apiFetch(`/subscriptions/${subscriptionId}/activate`, { method: 'PATCH' }, 'customer');
          } catch (e) {
            console.error('Activation fallback failed:', e);
          }

          setPaying(false);
          Alert.alert(
            isChangingPlan ? 'Plan Changed!' : 'Subscription Activated!',
            `Your ${selectedPlan.name} plan is now active for ${selectedVehicle.nickname || `${selectedVehicle.make} ${selectedVehicle.model}`}.`,
            [{
              text: 'Done',
              onPress: () => router.replace('/customer-home' as any),
            }]
          );
        },
        (err: string) => {
          setPaying(false);
          Alert.alert('Payment Failed', err);
        },
        () => {
          // Dismissed without paying
          setPaying(false);
        }
      );
    } catch (error: any) {
      setPaying(false);
      Alert.alert('Error', error.message);
    }
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Review & Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Step indicator */}
        <View style={s.stepRow}>
          <View style={[s.stepDot, { backgroundColor: colors.divider }]}>
            <Ionicons name="checkmark" size={14} color={colors.accent} />
          </View>
          <View style={[s.stepLine, { backgroundColor: colors.accent }]} />
          <View style={[s.stepDot, { backgroundColor: colors.accent }]}>
            <Text style={s.stepNum}>2</Text>
          </View>
          <Text style={[s.stepLabel, { color: colors.textSecondary }]}>  Card details → Review & Pay</Text>
        </View>

        {/* Plan summary card */}
        <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
          <View style={s.cardTitleRow}>
            <View style={[s.cardIconWrap, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd' }]}>
              <Ionicons name="refresh-circle" size={20} color={colors.accent} />
            </View>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Subscription Plan</Text>
          </View>

          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Plan</Text>
            <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{selectedPlan.name}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Tagline</Text>
            <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{selectedPlan.tagline}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Billing</Text>
            <Text style={[s.summaryValue, { color: colors.textPrimary }]}>Monthly</Text>
          </View>

          {/* Allowances */}
          <View style={[s.allowanceGrid, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
            <AllowanceChip icon="🚿" label="Washes" count={selectedPlan.allowances?.washes ?? 0} colors={colors} />
            <AllowanceChip icon="🧹" label="Interior" count={selectedPlan.allowances?.interiorCleans ?? 0} colors={colors} />
            {(selectedPlan.allowances?.tireCleans ?? 0) > 0 && (
              <AllowanceChip icon="⚙️" label="Tires" count={selectedPlan.allowances?.tireCleans} colors={colors} />
            )}
            {(selectedPlan.allowances?.fullDetails ?? 0) > 0 && (
              <AllowanceChip icon="✨" label="Full Detail" count={selectedPlan.allowances?.fullDetails} colors={colors} />
            )}
          </View>
        </View>

        {/* Vehicle card */}
        <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
          <View style={s.cardTitleRow}>
            <View style={[s.cardIconWrap, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd' }]}>
              <Ionicons name="car" size={20} color={colors.accent} />
            </View>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Vehicle</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Name</Text>
            <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{selectedVehicle.nickname || `${selectedVehicle.make} ${selectedVehicle.model}`}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Plate</Text>
            <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{selectedVehicle.licensePlate}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Year</Text>
            <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{selectedVehicle.year}</Text>
          </View>
        </View>

        {/* Total card */}
        <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
          <View style={s.cardTitleRow}>
            <View style={[s.cardIconWrap, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd' }]}>
              <Ionicons name="receipt" size={20} color={colors.accent} />
            </View>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Payment</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Plan price</Text>
            <Text style={[s.summaryValue, { color: colors.textPrimary }]}>LKR {selectedPlan.price.toLocaleString()}</Text>
          </View>
          <View style={[s.divider, { backgroundColor: colors.divider }]} />
          <View style={s.summaryRow}>
            <Text style={[s.totalLabel, { color: colors.textPrimary }]}>Total due today</Text>
            <Text style={[s.totalValue, { color: colors.accent }]}>LKR {selectedPlan.price.toLocaleString()}</Text>
          </View>
          <Text style={[s.renewNote, { color: colors.textSecondary }]}>
            Renews monthly. Cancel anytime from the Subscriptions screen.
          </Text>
        </View>

        {/* Pay button */}
        <TouchableOpacity
          style={[s.payBtn, { backgroundColor: colors.accent }, paying && { opacity: 0.6 }]}
          onPress={handlePayment}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#fff" />
              <Text style={s.payBtnText}>Pay LKR {selectedPlan.price.toLocaleString()}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[s.secureNote, { color: colors.textSecondary }]}>
          Secured by PayHere. Payment processed on PayHere's servers.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full-screen loading overlay during payment */}
      {paying && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={s.overlayText}>Processing payment...</Text>
          <Text style={s.overlaySubText}>Please don't close the app</Text>
        </View>
      )}
    </View>
  );
}

function AllowanceChip({ icon, label, count, colors }: { icon: string; label: string; count: number; colors: any }) {
  return (
    <View style={[s.allowanceChip, { backgroundColor: colors.background }]}>
      <Text style={s.allowanceChipIcon}>{icon}</Text>
      <Text style={[s.allowanceChipCount, { color: colors.textPrimary }]}>{count}x</Text>
      <Text style={[s.allowanceChipLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },

  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepLine: { height: 2, width: 20, marginHorizontal: 4 },
  stepLabel: { fontSize: 13 },

  card: { borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },

  allowanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 8 },
  allowanceChip: { alignItems: 'center', borderRadius: 10, padding: 10, minWidth: 70 },
  allowanceChipIcon: { fontSize: 20, marginBottom: 4 },
  allowanceChipCount: { fontSize: 16, fontWeight: '800' },
  allowanceChipLabel: { fontSize: 11, marginTop: 2 },

  divider: { height: 1, marginVertical: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  renewNote: { fontSize: 12, marginTop: 10, lineHeight: 18 },

  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 8 },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secureNote: { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  overlayText: { color: '#fff', marginTop: 16, fontSize: 16, fontWeight: '700' },
  overlaySubText: { color: 'rgba(255,255,255,0.7)', marginTop: 6, fontSize: 13 },
});