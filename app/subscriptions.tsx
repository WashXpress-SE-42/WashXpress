import PayHere from '@/utils/Payhere';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
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
import { auth } from '../firebaseConfig';

const API_BASE = process.env.EXPO_PUBLIC_CUSTOMER_API_URL;

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
function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: () => void }) {
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
        {/* Allowances summary */}
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

        {/* Features */}
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={[styles.featureCheck, { color: plan.color }]}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}

        <TouchableOpacity style={[styles.selectBtn, { backgroundColor: plan.color }]} onPress={onSelect}>
          <Text style={styles.selectBtnText}>Choose {plan.name}</Text>
        </TouchableOpacity>
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
      const token = await getFreshToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [plansRes, subsRes, vehiclesRes] = await Promise.all([
        fetch(`${API_BASE}/subscriptions/plans`),
        fetch(`${API_BASE}/subscriptions`, { headers }),
        fetch(`${API_BASE}/vehicles`, { headers }),
      ]);

      const [plansData, subsData, vehiclesData] = await Promise.all([
        plansRes.json(), subsRes.json(), vehiclesRes.json(),
      ]);

      setPlans(plansData.data?.plans ?? plansData.plans ?? (Array.isArray(plansData) ? plansData : []));
      setSubscriptions(subsData.data?.subscriptions || []);
      setVehicles((vehiclesData.data?.vehicles || []).filter((v: Vehicle & { isActive: boolean }) => v.isActive));
    } catch (e) {
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectPlan(plan: Plan) {
    const active = subscriptions.filter(s => s.status === 'active');
    if (vehicles.length === 0) {
      Alert.alert('No Vehicle', 'Please add a vehicle before subscribing.');
      return;
    }
    setSelectedPlan(plan);
    setVehicleModalVisible(true);
  }

  async function handleSubscribe(vehicleId: string) {
    if (!selectedPlan) return;
    setVehicleModalVisible(false);
    setPaying(true);

    try {
      const token = await getFreshToken();
      const res = await fetch(`${API_BASE}/subscriptions/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: selectedPlan.id, vehicleId }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const p = data.data.payment;

      const paymentObject = {
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
      };

      PayHere.startPayment(
        paymentObject,
        async () => {
          setPaying(false);
          Alert.alert('🎉 Subscription Activated!', `Your ${selectedPlan.name} plan is now active.`);
          fetchData();
        },
        (errorData: string) => {
          setPaying(false);
          Alert.alert('Payment Failed', errorData);
        },
        () => {
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
              const token = await getFreshToken();
              await fetch(`${API_BASE}/subscriptions/${subscriptionId}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason: 'Cancelled by customer' }),
              });
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0ca6e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Subscriptions" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subheading}>Save more with monthly plans</Text>

        {/* Active subscriptions */}
        {activeSubscriptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Active Plans</Text>
            {activeSubscriptions.map(sub => (
              <ActiveSubCard key={sub.id} sub={sub} onCancel={() => handleCancel(sub.id)} />
            ))}
          </View>
        )}

        {/* Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {activeSubscriptions.length > 0 ? 'Add Another Plan' : 'Choose a Plan'}
          </Text>
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} onSelect={() => handleSelectPlan(plan)} />
          ))}
        </View>

        {/* Processing overlay */}
        {paying && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.overlayText}>Processing payment...</Text>
          </View>
        )}

        {/* Vehicle selector modal */}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '800', color: '#0d1629' },
  subheading: { fontSize: 14, color: '#64748b', marginBottom: 24, marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0d1629', marginBottom: 14 },

  // Active card
  activeCard: { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', marginBottom: 16, backgroundColor: '#fff' },
  activeCardHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeCardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  activeCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  activeCardBody: { padding: 16 },
  renewalText: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  allowanceRow: { marginBottom: 10 },
  allowanceLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  allowanceLabel: { fontSize: 13, color: '#374151' },
  allowanceCount: { fontSize: 13, fontWeight: '600', color: '#0d1629' },
  progressBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 4 },
  progressFill: { height: 6, borderRadius: 4 },
  cancelBtn: { marginTop: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center' },
  cancelBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  // Plan card
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

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  overlayText: { color: '#fff', marginTop: 12, fontSize: 15 },

  // Modal
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
