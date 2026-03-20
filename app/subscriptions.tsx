import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';

interface Allowances {
  washes: number;
  interiorCleans: number;
  tireCleans: number;
  fullDetails: number;
}

interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  currency: string;
  color: string;
  isPopular: boolean;
  allowances: Allowances;
  features: string[];
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  nickname?: string;
  isActive?: boolean;
}

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  remainingWashes: number;
  remainingInteriorCleans: number;
  remainingTireCleans: number;
  remainingFullDetails: number;
  totalWashes: number;
  totalInteriorCleans: number;
  totalTireCleans: number;
  totalFullDetails: number;
  vehicle?: Vehicle;
  plan?: Plan;
}

// ── Allowance Progress Bar ────────────────────────────────────────────────────
function AllowanceBar({ label, used, total, color, colors }: { label: string; used: number; total: number; color: string; colors: any }) {
  const pct = total > 0 ? ((total - used) / total) * 100 : 0;
  return (
    <View style={s.allowanceRow}>
      <View style={s.allowanceLabelRow}>
        <Text style={[s.allowanceLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[s.allowanceCount, { color: colors.textPrimary }]}>{used} / {total} remaining</Text>
      </View>
      <View style={[s.progressBg, { backgroundColor: colors.divider }]}>
        <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Active Subscription Card ──────────────────────────────────────────────────
function ActiveSubCard({ sub, onCancel, colors }: { sub: Subscription; onCancel: () => void; colors: any }) {
  const plan = sub.plan;
  const color = plan?.color || '#0ca6e8';
  const endDate = new Date(sub.endDate).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' });
  const daysLeft = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000));

  return (
    <View style={[s.activeCard, { backgroundColor: colors.cardBackground, borderColor: color }]}>
      <View style={[s.activeCardHeader, { backgroundColor: color }]}>
        <View>
          <Text style={s.activeCardTitle}>{sub.planName} Plan</Text>
          <Text style={s.activeCardSub}>{sub.vehicle?.make} {sub.vehicle?.model} · {sub.vehicle?.licensePlate}</Text>
        </View>
        <View style={s.activeBadge}>
          <Text style={s.activeBadgeText}>ACTIVE</Text>
        </View>
      </View>
      <View style={s.activeCardBody}>
        <Text style={[s.renewalText, { color: colors.textSecondary }]}>Renews on {endDate} · {daysLeft} days left</Text>
        <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Service Allowances</Text>
        <AllowanceBar label="Exterior Washes" used={sub.remainingWashes} total={sub.totalWashes} color={color} colors={colors} />
        <AllowanceBar label="Interior Cleans" used={sub.remainingInteriorCleans} total={sub.totalInteriorCleans} color={color} colors={colors} />
        {sub.totalTireCleans > 0 && (
          <AllowanceBar label="Tire Cleanings" used={sub.remainingTireCleans} total={sub.totalTireCleans} color={color} colors={colors} />
        )}
        {sub.totalFullDetails > 0 && (
          <AllowanceBar label="Full Details" used={sub.remainingFullDetails} total={sub.totalFullDetails} color={color} colors={colors} />
        )}
        <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.divider }]} onPress={onCancel}>
          <Text style={s.cancelBtnText}>Cancel Subscription</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Allowance Pill ────────────────────────────────────────────────────────────
function AllowancePill({ icon, label, color, colors, isDark }: { icon: string; label: string; color: string; colors: any; isDark: boolean }) {
  return (
    <View style={[s.pill, { backgroundColor: isDark ? `${color}25` : `${color}15`, borderColor: `${color}40` }]}>
      <Text style={s.pillIcon}>{icon}</Text>
      <Text style={[s.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onSelect, isCurrentPlan, colors, isDark }: {
  plan: Plan; onSelect: () => void; isCurrentPlan?: boolean; colors: any; isDark: boolean;
}) {
  return (
    <View style={[s.planCard, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, plan.isPopular && { borderColor: plan.color, borderWidth: 2 }]}>
      {plan.isPopular && (
        <View style={[s.popularBadge, { backgroundColor: plan.color }]}>
          <Text style={s.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}
      <View style={[s.planHeader, { backgroundColor: isDark ? `${plan.color}25` : `${plan.color}15` }]}>
        <Text style={[s.planName, { color: plan.color }]}>{plan.name}</Text>
        <Text style={[s.planTagline, { color: colors.textSecondary }]}>{plan.tagline}</Text>
        <Text style={[s.planPrice, { color: plan.color }]}>
          LKR {plan.price.toLocaleString()}
          <Text style={[s.planPricePer, { color: colors.textSecondary }]}> /month</Text>
        </Text>
      </View>
      <View style={s.planBody}>
        <View style={s.allowanceSummary}>
          <AllowancePill icon="🚿" label={`${plan.allowances?.washes ?? 0} Washes`} color={plan.color} colors={colors} isDark={isDark} />
          <AllowancePill icon="🧹" label={`${plan.allowances?.interiorCleans ?? 0} Interior`} color={plan.color} colors={colors} isDark={isDark} />
          {(plan.allowances?.tireCleans ?? 0) > 0 && (
            <AllowancePill icon="⚙️" label={`${plan.allowances?.tireCleans} Tires`} color={plan.color} colors={colors} isDark={isDark} />
          )}
          {(plan.allowances?.fullDetails ?? 0) > 0 && (
            <AllowancePill icon="✨" label={`${plan.allowances?.fullDetails} Full Detail`} color={plan.color} colors={colors} isDark={isDark} />
          )}
        </View>
        {plan.features.map((f, i) => (
          <View key={i} style={s.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={plan.color} />
            <Text style={[s.featureText, { color: colors.textSecondary }]}>{f}</Text>
          </View>
        ))}
        {isCurrentPlan ? (
          <View style={[s.currentPlanBadge, { borderColor: plan.color }]}>
            <Text style={[s.currentPlanBadgeText, { color: plan.color }]}>✓ Your Current Plan</Text>
          </View>
        ) : (
          <TouchableOpacity style={[s.selectBtn, { backgroundColor: plan.color }]} onPress={onSelect}>
            <Text style={s.selectBtnText}>Choose {plan.name}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SubscriptionsScreen() {
  const { colors, isDark } = useTheme();
  const { changeSubscriptionId } = useLocalSearchParams<{ changeSubscriptionId?: string }>();
  const isChangingPlan = !!changeSubscriptionId;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [plansData, subsData, vehiclesData] = await Promise.all([
        apiFetch('/subscriptions/plans', {}, 'customer'),
        apiFetch('/subscriptions', {}, 'customer'),
        apiFetch('/vehicles', {}, 'customer'),
      ]);
      setPlans(plansData.data?.plans ?? []);
      setSubscriptions(subsData.data?.subscriptions ?? []);
      setVehicles((vehiclesData.data?.vehicles ?? []).filter((v: Vehicle) => v.isActive !== false));
    } catch {
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }

  const changingSubscription = subscriptions.find(s => s.id === changeSubscriptionId);

  function handleSelectPlan(plan: Plan) {
    if (vehicles.length === 0) {
      Alert.alert('No Vehicle', 'Please add a vehicle before subscribing.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Vehicle', onPress: () => router.push('/vehicle-list' as any) },
      ]);
      return;
    }

    setSelectedPlan(plan);

    if (isChangingPlan && changingSubscription) {
      Alert.alert(
        'Change Plan',
        `Switch from ${changingSubscription.planName} to ${plan.name}?\n\nYour current plan will be cancelled and the new plan starts after payment.`,
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Continue to Payment',
            onPress: () => navigateToPayment(plan, changingSubscription.vehicle!, changeSubscriptionId),
          },
        ]
      );
    } else {
      setVehicleModalVisible(true);
    }
  }

  function navigateToPayment(plan: Plan, vehicle: Vehicle, cancelExistingId?: string) {
    // Navigate to PaymentScreen (card UI), passing plan + vehicle as serialised params
    router.push({
      pathname: '/subscriptionPaymentScreen',
      params: {
        plan: JSON.stringify(plan),
        vehicle: JSON.stringify(vehicle),
        changeSubscriptionId: cancelExistingId ?? '',
      },
    } as any);
  }

  async function handleCancel(subscriptionId: string) {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure? You will retain access until the end of the billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel', style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/subscriptions/${subscriptionId}/cancel`, {
                method: 'PATCH',
                body: JSON.stringify({ reason: 'Cancelled by customer' }),
              }, 'customer');
              fetchData();
            } catch {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  }

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const currentPlanId = changingSubscription?.planId;

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Header title={isChangingPlan ? 'Change Plan' : 'Subscriptions'} />
      <ScrollView contentContainerStyle={s.content}>

        {isChangingPlan && changingSubscription && (
          <View style={[s.changeBanner, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd', borderLeftColor: colors.accent }]}>
            <Text style={[s.changeBannerTitle, { color: colors.textPrimary }]}>Changing from {changingSubscription.planName}</Text>
            <Text style={[s.changeBannerSub, { color: colors.textSecondary }]}>
              Your current plan will be cancelled and the new plan activates immediately after payment.
            </Text>
          </View>
        )}

        {!isChangingPlan && (
          <Text style={[s.subheading, { color: colors.textSecondary }]}>Save more with monthly plans</Text>
        )}

        {!isChangingPlan && activeSubscriptions.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Your Active Plans</Text>
            {activeSubscriptions.map(sub => (
              <ActiveSubCard key={sub.id} sub={sub} onCancel={() => handleCancel(sub.id)} colors={colors} />
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
            {isChangingPlan ? 'Select New Plan' : activeSubscriptions.length > 0 ? 'Add Another Plan' : 'Choose a Plan'}
          </Text>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={isChangingPlan && plan.id === currentPlanId}
              onSelect={() => handleSelectPlan(plan)}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </View>
      </ScrollView>

      {/* Vehicle picker modal */}
      <Modal visible={vehicleModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.cardBackground }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Select Vehicle</Text>
            <Text style={[s.modalSub, { color: colors.textSecondary }]}>Which vehicle is this plan for?</Text>
            <FlatList
              data={vehicles}
              keyExtractor={v => v.id}
              renderItem={({ item: v }) => (
                <TouchableOpacity
                  style={[s.vehicleItem, { borderBottomColor: colors.divider }]}
                  onPress={() => {
                    setVehicleModalVisible(false);
                    navigateToPayment(selectedPlan!, v);
                  }}
                >
                  <View style={[s.vehicleIcon, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd' }]}>
                    <Ionicons name="car" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.vehicleName, { color: colors.textPrimary }]}>{v.nickname || `${v.make} ${v.model}`}</Text>
                    <Text style={[s.vehiclePlate, { color: colors.textSecondary }]}>{v.licensePlate} · {v.year}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[s.modalCancelBtn, { borderColor: colors.divider }]}
              onPress={() => setVehicleModalVisible(false)}
            >
              <Text style={[s.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 110 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subheading: { fontSize: 14, marginBottom: 24, marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },

  changeBanner: { borderRadius: 14, padding: 16, marginBottom: 24, borderLeftWidth: 4 },
  changeBannerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  changeBannerSub: { fontSize: 13, lineHeight: 20 },

  allowanceRow: { marginBottom: 10 },
  allowanceLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  allowanceLabel: { fontSize: 13 },
  allowanceCount: { fontSize: 13, fontWeight: '600' },
  progressBg: { height: 6, borderRadius: 4 },
  progressFill: { height: 6, borderRadius: 4 },

  activeCard: { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', marginBottom: 16 },
  activeCardHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeCardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  activeCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  activeCardBody: { padding: 16 },
  renewalText: { fontSize: 13, marginBottom: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  cancelBtn: { marginTop: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center' },
  cancelBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  planCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  popularBadge: { paddingVertical: 6, alignItems: 'center' },
  popularBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  planHeader: { padding: 20 },
  planName: { fontSize: 22, fontWeight: '800' },
  planTagline: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  planPrice: { fontSize: 28, fontWeight: '800' },
  planPricePer: { fontSize: 14, fontWeight: '400' },
  planBody: { padding: 20 },
  allowanceSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillIcon: { fontSize: 13 },
  pillLabel: { fontSize: 12, fontWeight: '600' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 14, flex: 1 },
  selectBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  selectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  currentPlanBadge: { marginTop: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  currentPlanBadgeText: { fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 14, marginBottom: 16 },
  vehicleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  vehicleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: 16, fontWeight: '600' },
  vehiclePlate: { fontSize: 13, marginTop: 2 },
  modalCancelBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
});