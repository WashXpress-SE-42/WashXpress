import PayHere from '@/utils/Payhere';
import { apiFetch } from '@/services/apiClient';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
function AllowanceBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct = total > 0 ? ((total - used) / total) * 100 : 0;
  return (
    <View style={styles.allowanceRow}>
      <View style={styles.allowanceLabelRow}>
        <Text style={styles.allowanceLabel}>{label}</Text>
        <Text style={styles.allowanceCount}>{used} / {total} remaining</Text>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Active Subscription Card ──────────────────────────────────────────────────
function ActiveSubCard({ sub, onCancel }: { sub: Subscription; onCancel: () => void }) {
  const plan = sub.plan;
  const color = plan?.color || '#0ca6e8';
  const endDate = new Date(sub.endDate).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' });
  const daysLeft = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000));

  return (
    <View style={[styles.activeCard, { borderColor: color }]}>
      <View style={[styles.activeCardHeader, { backgroundColor: color }]}>
        <View>
          <Text style={styles.activeCardTitle}>{sub.planName} Plan</Text>
          <Text style={styles.activeCardSub}>{sub.vehicle?.make} {sub.vehicle?.model} · {sub.vehicle?.licensePlate}</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>ACTIVE</Text>
        </View>
      </View>
      <View style={styles.activeCardBody}>
        <Text style={styles.renewalText}>Renews on {endDate} · {daysLeft} days left</Text>
        <Text style={styles.sectionLabel}>Service Allowances</Text>
        <AllowanceBar label="Exterior Washes" used={sub.remainingWashes} total={sub.totalWashes} color={color} />
        <AllowanceBar label="Interior Cleans" used={sub.remainingInteriorCleans} total={sub.totalInteriorCleans} color={color} />
        {sub.totalTireCleans > 0 && (
          <AllowanceBar label="Tire Cleanings" used={sub.remainingTireCleans} total={sub.totalTireCleans} color={color} />
        )}
        {sub.totalFullDetails > 0 && (
          <AllowanceBar label="Full Details" used={sub.remainingFullDetails} total={sub.totalFullDetails} color={color} />
        )}
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  onSelect,
  isCurrentPlan,
}: {
  plan: Plan;
  onSelect: () => void;
  isCurrentPlan?: boolean;
}) {
  return (
    <View style={[styles.planCard, plan.isPopular && { borderColor: plan.color, borderWidth: 2 }]}>
      {plan.isPopular && (
        <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}
      <View style={[styles.planHeader, { backgroundColor: plan.color + '15' }]}>
        <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
        <Text style={styles.planTagline}>{plan.tagline}</Text>
        <Text style={[styles.planPrice, { color: plan.color }]}>
          LKR {plan.price.toLocaleString()}
          <Text style={styles.planPricePer}> /month</Text>
        </Text>
      </View>
      <View style={styles.planBody}>
        <View style={styles.allowanceSummary}>
          <AllowancePill icon="🚿" label={`${plan.allowances?.washes ?? 0} Washes`} color={plan.color} />
          <AllowancePill icon="🧹" label={`${plan.allowances?.interiorCleans ?? 0} Interior`} color={plan.color} />
          {(plan.allowances?.tireCleans ?? 0) > 0 && (
            <AllowancePill icon="⚙️" label={`${plan.allowances?.tireCleans} Tires`} color={plan.color} />
          )}
          {(plan.allowances?.fullDetails ?? 0) > 0 && (
            <AllowancePill icon="✨" label={`${plan.allowances?.fullDetails} Full Detail`} color={plan.color} />
          )}
        </View>
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={[styles.featureCheck, { color: plan.color }]}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
        {isCurrentPlan ? (
          <View style={[styles.currentPlanBadge, { borderColor: plan.color }]}>
            <Text style={[styles.currentPlanBadgeText, { color: plan.color }]}>✓ Your Current Plan</Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.selectBtn, { backgroundColor: plan.color }]} onPress={onSelect}>
            <Text style={styles.selectBtnText}>Choose {plan.name}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function AllowancePill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '15', borderColor: color + '40' }]}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SubscriptionsScreen() {
  const router = useRouter();

  // changeSubscriptionId passed from my-subscription.tsx when changing plan
  const { changeSubscriptionId } = useLocalSearchParams<{ changeSubscriptionId?: string }>();
  const isChangingPlan = !!changeSubscriptionId;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [paying, setPaying] = useState(false);

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
      // Changing plan: confirm then pay using same vehicle
      Alert.alert(
        'Change Plan',
        `Switch from ${changingSubscription.planName} to ${plan.name}?\n\nYour current plan will be cancelled and the new plan starts immediately after payment.`,
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Continue to Payment',
            onPress: () => handleSubscribe(changingSubscription.vehicle!.id, plan, changeSubscriptionId),
          },
        ]
      );
    } else {
      // Fresh subscription: let user pick vehicle
      setVehicleModalVisible(true);
    }
  }

  async function handleSubscribe(vehicleId: string, plan?: Plan, cancelExistingId?: string) {
    const activePlan = plan ?? selectedPlan;
    if (!activePlan) return;

    setVehicleModalVisible(false);
    setPaying(true);

    try {
      // Cancel old plan first when changing
      if (cancelExistingId) {
        await apiFetch(`/subscriptions/${cancelExistingId}/cancel`, {
          method: 'PATCH',
          body: JSON.stringify({ reason: 'Upgrading/changing plan' }),
        }, 'customer');
      }

      const data = await apiFetch('/subscriptions/initiate', {
        method: 'POST',
        body: JSON.stringify({ planId: activePlan.id, vehicleId }),
      }, 'customer');

      if (!data.success) throw new Error(data.message);

      const p = data.data.payment;

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
          custom_1: data.data.subscriptionId,
          custom_2: '',
        },
        () => {
          // Success
          setPaying(false);
          Alert.alert(
            cancelExistingId ? '🔄 Plan Changed!' : '🎉 Subscription Activated!',
            `Your ${activePlan.name} plan is now active.`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
          fetchData();
        },
        (errorData: string) => {
          setPaying(false);
          Alert.alert('Payment Failed', errorData);
        },
        () => {
          // Dismissed
          setPaying(false);
        }
      );
    } catch (error: any) {
      setPaying(false);
      Alert.alert('Error', error.message);
    }
  }

  async function handleCancel(subscriptionId: string) {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel? You will retain access until the end of the billing period.',
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

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const currentPlanId = changingSubscription?.planId;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0ca6e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={isChangingPlan ? 'Change Plan' : 'Subscriptions'} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Change plan info banner */}
        {isChangingPlan && changingSubscription && (
          <View style={styles.changeBanner}>
            <Text style={styles.changeBannerTitle}>Changing from {changingSubscription.planName}</Text>
            <Text style={styles.changeBannerSub}>
              Your current plan will be cancelled and the new plan activates immediately after payment.
            </Text>
          </View>
        )}

        {!isChangingPlan && (
          <Text style={styles.subheading}>Save more with monthly plans</Text>
        )}

        {/* Active plans — hidden when in change mode */}
        {!isChangingPlan && activeSubscriptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Active Plans</Text>
            {activeSubscriptions.map(sub => (
              <ActiveSubCard key={sub.id} sub={sub} onCancel={() => handleCancel(sub.id)} />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isChangingPlan
              ? 'Select New Plan'
              : activeSubscriptions.length > 0
                ? 'Add Another Plan'
                : 'Choose a Plan'}
          </Text>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={isChangingPlan && plan.id === currentPlanId}
              onSelect={() => handleSelectPlan(plan)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Payment overlay */}
      {paying && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Processing payment...</Text>
        </View>
      )}

      {/* Vehicle picker modal — fresh subscriptions only */}
      <Modal visible={vehicleModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Vehicle</Text>
            <Text style={styles.modalSub}>Which vehicle is this plan for?</Text>
            <FlatList
              data={vehicles}
              keyExtractor={v => v.id}
              renderItem={({ item: v }) => (
                <TouchableOpacity style={styles.vehicleItem} onPress={() => handleSubscribe(v.id)}>
                  <Text style={styles.vehicleName}>{v.nickname || `${v.make} ${v.model}`}</Text>
                  <Text style={styles.vehiclePlate}>{v.licensePlate} · {v.year}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setVehicleModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subheading: { fontSize: 14, color: '#64748b', marginBottom: 24, marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0d1629', marginBottom: 14 },

  changeBanner: {
    backgroundColor: '#e0f4fd', borderRadius: 14, padding: 16,
    marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#0ca6e8',
  },
  changeBannerTitle: { fontSize: 15, fontWeight: '700', color: '#0d1629', marginBottom: 4 },
  changeBannerSub: { fontSize: 13, color: '#374151', lineHeight: 20 },

  allowanceRow: { marginBottom: 10 },
  allowanceLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  allowanceLabel: { fontSize: 13, color: '#374151' },
  allowanceCount: { fontSize: 13, fontWeight: '600', color: '#0d1629' },
  progressBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 4 },
  progressFill: { height: 6, borderRadius: 4 },

  activeCard: { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', marginBottom: 16, backgroundColor: '#fff' },
  activeCardHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeCardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  activeCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  activeCardBody: { padding: 16 },
  renewalText: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  cancelBtn: { marginTop: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center' },
  cancelBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  planCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, overflow: 'hidden' },
  popularBadge: { paddingVertical: 6, alignItems: 'center' },
  popularBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  planHeader: { padding: 20 },
  planName: { fontSize: 22, fontWeight: '800' },
  planTagline: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 10 },
  planPrice: { fontSize: 28, fontWeight: '800' },
  planPricePer: { fontSize: 14, fontWeight: '400', color: '#64748b' },
  planBody: { padding: 20 },
  allowanceSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillIcon: { fontSize: 13 },
  pillLabel: { fontSize: 12, fontWeight: '600' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureCheck: { fontSize: 15, fontWeight: '700' },
  featureText: { fontSize: 14, color: '#374151' },
  selectBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  selectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  currentPlanBadge: { marginTop: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  currentPlanBadgeText: { fontSize: 15, fontWeight: '700' },

  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', zIndex: 99,
  },
  overlayText: { color: '#fff', marginTop: 12, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0d1629', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  vehicleItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  vehicleName: { fontSize: 16, fontWeight: '600', color: '#0d1629' },
  vehiclePlate: { fontSize: 13, color: '#64748b', marginTop: 2 },
  modalCancelBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  modalCancelText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
});