import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Header } from '../components/Header';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Vehicle {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
    nickname?: string;
}

interface PlanMeta {
    id: string;
    name: string;
    tagline?: string;
    price?: number;
    currency?: string;
    color?: string;
    features?: string[];
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
    vehicleId: string;
    vehicle?: Vehicle;
    plan?: PlanMeta;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a brand colour from the plan name so cards look correct even if the
 *  backend doesn't embed the `plan` object. */
function planColor(sub: Subscription): string {
    if (sub.plan?.color) return sub.plan.color;
    const name = (sub.planName || '').toLowerCase();
    if (name.includes('basic')) return '#0ca6e8';   // blue
    if (name.includes('standard')) return '#8b5cf6';   // purple
    if (name.includes('premium')) return '#f59e0b';   // amber
    if (name.includes('elite')) return '#ef4444';   // red
    if (name.includes('gold')) return '#d97706';   // gold
    return '#0ca6e8';
}

function planTagline(sub: Subscription): string {
    if (sub.plan?.tagline) return sub.plan.tagline;
    const name = (sub.planName || '').toLowerCase();
    if (name.includes('basic')) return 'Essential car care every month';
    if (name.includes('standard')) return 'Complete monthly maintenance';
    if (name.includes('premium')) return 'Premium care for your vehicle';
    if (name.includes('elite')) return 'Ultimate car care experience';
    return 'Your monthly car care plan';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AllowanceBar({
    label, icon, remaining, total, color,
}: {
    label: string; icon: string; remaining: number; total: number; color: string;
}) {
    if (total === 0) return null;
    const pct = Math.min((remaining / total) * 100, 100);
    const isEmpty = remaining === 0;
    return (
        <View style={s.allowanceRow}>
            <View style={s.allowanceTop}>
                <View style={s.allowanceLabelRow}>
                    <Text style={s.allowanceEmoji}>{icon}</Text>
                    <Text style={s.allowanceLabel}>{label}</Text>
                </View>
                <Text style={[s.allowanceCount, isEmpty && { color: '#ef4444' }]}>
                    {remaining} / {total} left
                </Text>
            </View>
            <View style={s.barBg}>
                <View style={[
                    s.barFill,
                    { width: `${pct}%` as any, backgroundColor: isEmpty ? '#fca5a5' : color },
                ]} />
            </View>
        </View>
    );
}

function StatPill({ icon, label, color }: { icon: string; label: string; color: string }) {
    return (
        <View style={[s.statPill, { backgroundColor: color + '18', borderColor: color + '40' }]}>
            <Text style={s.statPillIcon}>{icon}</Text>
            <Text style={[s.statPillLabel, { color }]}>{label}</Text>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MySubscriptionScreen() {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [plansMeta, setPlansMeta] = useState<Record<string, PlanMeta>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cancelling, setCancelling] = useState<string | null>(null);

    const loadData = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            // Fetch active subscriptions + plan list in parallel
            const [subRes, planRes] = await Promise.allSettled([
                apiFetch('/subscriptions?status=active', {}, 'customer'),
                apiFetch('/subscriptions/plans', {}, 'customer'),
            ]);

            if (subRes.status === 'fulfilled' && subRes.value.success) {
                setSubscriptions(subRes.value.data.subscriptions ?? []);
            }

            if (planRes.status === 'fulfilled' && planRes.value.success) {
                const map: Record<string, PlanMeta> = {};
                for (const p of (planRes.value.data.plans ?? [])) {
                    map[p.id] = p;
                    map[(p.name ?? '').toLowerCase()] = p; // also index by name
                }
                setPlansMeta(map);
            }
        } catch {
            Alert.alert('Error', 'Failed to load your subscription');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    const onRefresh = () => { setRefreshing(true); loadData(true); };

    /** Merge plan metadata from the plans list into the subscription if the
     *  backend didn't embed it. */
    function enrichSub(sub: Subscription): Subscription {
        if (sub.plan?.color) return sub;
        const meta = plansMeta[sub.planId] || plansMeta[(sub.planName ?? '').toLowerCase()];
        if (meta) return { ...sub, plan: { ...meta, ...sub.plan } };
        return sub;
    }

    const handleCancel = (sub: Subscription) => {
        Alert.alert(
            'Cancel Subscription',
            `Cancel your ${sub.planName} plan?\n\nYou'll keep access until ${new Date(sub.endDate).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
            [
                { text: 'Keep It', style: 'cancel' },
                {
                    text: 'Cancel Plan',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancelling(sub.id);
                            await apiFetch(`/subscriptions/${sub.id}/cancel`, {
                                method: 'PATCH',
                                body: JSON.stringify({ reason: 'Cancelled by customer' }),
                            }, 'customer');
                            Alert.alert('Cancelled', 'Your subscription has been cancelled.');
                            loadData();
                        } catch {
                            Alert.alert('Error', 'Failed to cancel subscription');
                        } finally {
                            setCancelling(null);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={s.container}>
                <Header title="My Plan" />
                <View style={s.centered}>
                    <ActivityIndicator size="large" color="#0ca6e8" />
                </View>
            </View>
        );
    }

    const activeSubscriptions = subscriptions
        .filter(sub => sub.status === 'active')
        .map(enrichSub);

    return (
        <View style={s.container}>
            <Header title="My Plan" />
            <ScrollView
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ca6e8']} />}
            >
                {activeSubscriptions.length === 0 ? (
                    /* ── No active plan ── */
                    <View style={s.emptyState}>
                        <View style={s.emptyIconCircle}>
                            <Ionicons name="ribbon-outline" size={44} color="#9ca3af" />
                        </View>
                        <Text style={s.emptyTitle}>No active plan</Text>
                        <Text style={s.emptySubtitle}>
                            Subscribe to a monthly plan and get regular washes at a discounted rate — one subscription per vehicle.
                        </Text>
                        <TouchableOpacity
                            style={s.browsePlansBtn}
                            onPress={() => router.push('/subscriptions' as Href)}
                        >
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                            <Text style={s.browsePlansBtnText}>Browse Plans</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {activeSubscriptions.map((sub) => {
                            const color = planColor(sub);
                            const tagline = planTagline(sub);
                            const endDate = new Date(sub.endDate).toLocaleDateString('en-LK', {
                                day: 'numeric', month: 'long', year: 'numeric',
                            });
                            const startDate = new Date(sub.startDate).toLocaleDateString('en-LK', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            });
                            const daysLeft = Math.max(0, Math.ceil(
                                (new Date(sub.endDate).getTime() - Date.now()) / 86400000
                            ));
                            const isExpiringSoon = daysLeft <= 7;
                            const price = sub.plan?.price;
                            const currency = sub.plan?.currency || 'LKR';
                            const features = sub.plan?.features ?? [];

                            return (
                                <View key={sub.id} style={[s.card, { borderColor: color + '60' }]}>

                                    {/* ── Card Header ── */}
                                    <View style={[s.cardHeader, { backgroundColor: color }]}>
                                        {/* Plan badge */}
                                        <View style={s.planBadge}>
                                            <Ionicons name="ribbon" size={16} color={color} />
                                            <Text style={[s.planBadgeText, { color }]}>{sub.planName.toUpperCase()} PLAN</Text>
                                        </View>

                                        <View style={s.cardHeaderMain}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.cardPlanName}>{sub.planName} Plan</Text>
                                                <Text style={s.cardTagline}>{tagline}</Text>
                                                {price != null && (
                                                    <Text style={s.cardPrice}>
                                                        {currency} {price.toLocaleString()}
                                                        <Text style={s.cardPricePer}> /month</Text>
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={s.activePill}>
                                                <View style={s.activeDot} />
                                                <Text style={s.activePillText}>ACTIVE</Text>
                                            </View>
                                        </View>

                                        {/* Vehicle row */}
                                        <View style={s.vehicleRow}>
                                            <Ionicons name="car-outline" size={14} color="rgba(255,255,255,0.8)" />
                                            <Text style={s.vehicleText}>
                                                {sub.vehicle?.nickname
                                                    || (sub.vehicle ? `${sub.vehicle.make} ${sub.vehicle.model}` : 'Vehicle')}
                                                {sub.vehicle?.licensePlate ? `  ·  ${sub.vehicle.licensePlate}` : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={s.cardBody}>

                                        {/* ── Quick stats pills ── */}
                                        <View style={s.statPillRow}>
                                            {sub.totalWashes > 0 && (
                                                <StatPill icon="🚿" label={`${sub.totalWashes} Washes`} color={color} />
                                            )}
                                            {sub.totalInteriorCleans > 0 && (
                                                <StatPill icon="🧹" label={`${sub.totalInteriorCleans} Interior`} color={color} />
                                            )}
                                            {sub.totalTireCleans > 0 && (
                                                <StatPill icon="⚙️" label={`${sub.totalTireCleans} Tires`} color={color} />
                                            )}
                                            {sub.totalFullDetails > 0 && (
                                                <StatPill icon="✨" label={`${sub.totalFullDetails} Detail`} color={color} />
                                            )}
                                        </View>

                                        {/* ── Expiry / renewal notice ── */}
                                        <View style={[
                                            s.expiryRow,
                                            isExpiringSoon && { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
                                        ]}>
                                            <Ionicons
                                                name={isExpiringSoon ? 'warning-outline' : 'calendar-outline'}
                                                size={16}
                                                color={isExpiringSoon ? '#ef4444' : '#6b7280'}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.expiryText, isExpiringSoon && { color: '#ef4444', fontWeight: '700' }]}>
                                                    {isExpiringSoon
                                                        ? `⚠️ Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`
                                                        : `Renews on ${endDate}`}
                                                </Text>
                                                <Text style={s.expirySubText}>
                                                    Started {startDate}  ·  {daysLeft} days remaining
                                                </Text>
                                            </View>
                                        </View>

                                        {/* ── Service Allowances ── */}
                                        <Text style={s.sectionLabel}>Service Allowances</Text>
                                        <AllowanceBar label="Exterior Washes" icon="🚿" remaining={sub.remainingWashes} total={sub.totalWashes} color={color} />
                                        <AllowanceBar label="Interior Cleans" icon="🧹" remaining={sub.remainingInteriorCleans} total={sub.totalInteriorCleans} color={color} />
                                        <AllowanceBar label="Tire Cleanings" icon="⚙️" remaining={sub.remainingTireCleans} total={sub.totalTireCleans} color={color} />
                                        <AllowanceBar label="Full Details" icon="✨" remaining={sub.remainingFullDetails} total={sub.totalFullDetails} color={color} />

                                        {/* ── Plan features (if available) ── */}
                                        {features.length > 0 && (
                                            <>
                                                <Text style={[s.sectionLabel, { marginTop: 6 }]}>What's Included</Text>
                                                {features.map((f, i) => (
                                                    <View key={i} style={s.featureRow}>
                                                        <View style={[s.featureCheck, { backgroundColor: color }]}>
                                                            <Ionicons name="checkmark" size={11} color="#fff" />
                                                        </View>
                                                        <Text style={s.featureText}>{f}</Text>
                                                    </View>
                                                ))}
                                            </>
                                        )}

                                        {/* ── Cancel button ── */}
                                        <TouchableOpacity
                                            style={s.cancelBtn}
                                            onPress={() => handleCancel(sub)}
                                            disabled={cancelling === sub.id}
                                        >
                                            {cancelling === sub.id
                                                ? <ActivityIndicator size="small" color="#ef4444" />
                                                : <Text style={s.cancelBtnText}>Cancel This Plan</Text>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}

                        {/* ── Change / Upgrade / Add plan CTA ── */}
                        <TouchableOpacity
                            style={s.changePlanCard}
                            onPress={() => router.push('/subscriptions' as Href)}
                            activeOpacity={0.85}
                        >
                            <View style={s.changePlanIconCircle}>
                                <Ionicons name="swap-vertical-outline" size={22} color="#0ca6e8" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 14 }}>
                                <Text style={s.changePlanTitle}>Change or Upgrade Plan</Text>
                                <Text style={s.changePlanSubtitle}>
                                    Downgrade, upgrade, or add a plan for another vehicle
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#0ca6e8" />
                        </TouchableOpacity>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 20, paddingBottom: 110 },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyIconCircle: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginBottom: 8 },
    emptySubtitle: {
        fontSize: 14, color: '#9ca3af', textAlign: 'center',
        lineHeight: 22, paddingHorizontal: 24, marginBottom: 28,
    },
    browsePlansBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#0ca6e8', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
    },
    browsePlansBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    // Card
    card: {
        borderRadius: 20, borderWidth: 1.5, overflow: 'hidden',
        marginBottom: 20, backgroundColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
    },

    // Card header
    cardHeader: { padding: 20 },
    planBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.92)', alignSelf: 'flex-start',
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
    },
    planBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    cardHeaderMain: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    cardPlanName: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    cardTagline: { fontSize: 13, color: 'rgba(255,255,255,0.80)', marginTop: 3, marginBottom: 6 },
    cardPrice: { fontSize: 20, fontWeight: '800', color: '#fff' },
    cardPricePer: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.75)' },
    activePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginLeft: 10, marginTop: 4,
    },
    activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
    activePillText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    vehicleText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },

    // Card body
    cardBody: { padding: 18 },

    // Stat pills
    statPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    statPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
    },
    statPillIcon: { fontSize: 14 },
    statPillLabel: { fontSize: 12, fontWeight: '700' },

    // Expiry row
    expiryRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#f8fafc', borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20,
    },
    expiryText: { fontSize: 14, color: '#374151', fontWeight: '600' },
    expirySubText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

    // Allowances
    sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
    allowanceRow: { marginBottom: 14 },
    allowanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    allowanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    allowanceEmoji: { fontSize: 15 },
    allowanceLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
    allowanceCount: { fontSize: 12, fontWeight: '700', color: '#374151' },
    barBg: { height: 9, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },

    // Features
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    featureCheck: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    featureText: { fontSize: 13, color: '#374151', flex: 1 },

    // Cancel
    cancelBtn: {
        marginTop: 18, paddingVertical: 13, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#fca5a5', alignItems: 'center',
    },
    cancelBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },

    // Change plan card
    changePlanCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 18, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    changePlanIconCircle: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: '#e0f4fd', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    changePlanTitle: { fontSize: 15, fontWeight: '700', color: '#0d1629' },
    changePlanSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 18 },
});