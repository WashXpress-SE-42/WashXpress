import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
    id: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
    service: { name: string; categoryId: string };
    vehicle: { make: string; model: string; type: string; color: string };
    scheduledDate: string;
    scheduledTime: string;
    totalPrice: number;
    currency: string;
    address: { city: string; addressLine1: string };
    paidWithSubscription: boolean;
    assignedStaffName?: string;
    priceBreakdown?: { multiplier: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────
// STATUS_CONFIG is now moved inside the component to use theme colors

const CATEGORY_EMOJI: Record<string, string> = {
    'exterior-wash': '🚿',
    'interior-clean': '🧹',
    'tire-cleaning': '⚙️',
    'full-detail': '✨',
};

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string) {
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookingListScreen() {
    const { colors, isDark } = useTheme();
    const [tab, setTab] = useState<'active' | 'history'>('active');
    const [active, setActive] = useState<Booking[]>([]);
    const [history, setHistory] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const tabAnim = useRef(new Animated.Value(0)).current;

    const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
        pending: { label: 'Finding Washer', color: colors.warning || '#f59e0b', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb', icon: 'time-outline' },
        confirmed: { label: 'Confirmed', color: colors.accent || '#0ca6e8', bg: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd', icon: 'checkmark-circle-outline' },
        in_progress: { label: 'In Progress', color: '#8b5cf6', bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff', icon: 'water-outline' },
        completed: { label: 'Completed', color: colors.success || '#10b981', bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4', icon: 'trophy-outline' },
        cancelled: { label: 'Cancelled', color: colors.textSecondary || '#6b7280', bg: isDark ? 'rgba(107, 114, 128, 0.15)' : '#f9fafb', icon: 'close-circle-outline' },
        rejected: { label: 'Rejected', color: colors.error || '#ef4444', bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', icon: 'ban-outline' },
    };

    const load = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const [pendingRes, confirmedRes, inProgressRes, completedRes, cancelledRes, rejectedRes] =
                await Promise.all([
                    apiFetch('/bookings?status=pending', {}, 'customer'),
                    apiFetch('/bookings?status=confirmed', {}, 'customer'),
                    apiFetch('/bookings?status=in_progress', {}, 'customer'),
                    apiFetch('/bookings?status=completed', {}, 'customer'),
                    apiFetch('/bookings?status=cancelled', {}, 'customer'),
                    apiFetch('/bookings?status=rejected', {}, 'customer'),
                ]);

            const activeBookings = [
                ...(pendingRes.data?.bookings || []),
                ...(confirmedRes.data?.bookings || []),
                ...(inProgressRes.data?.bookings || []),
            ].sort((a, b) => (a.scheduledDate <= b.scheduledDate ? -1 : 1));

            const historyBookings = [
                ...(completedRes.data?.bookings || []),
                ...(cancelledRes.data?.bookings || []),
                ...(rejectedRes.data?.bookings || []),
            ].sort((a, b) => (a.scheduledDate >= b.scheduledDate ? -1 : 1));

            setActive(activeBookings);
            setHistory(historyBookings);
        } catch (e) {
            console.error('Failed to load bookings', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, []);

    const switchTab = (t: 'active' | 'history') => {
        setTab(t);
        Animated.spring(tabAnim, {
            toValue: t === 'active' ? 0 : 1,
            useNativeDriver: false,
            tension: 80,
            friction: 12,
        }).start();
    };

    const onRefresh = () => { setRefreshing(true); load(true); };
    const current = tab === 'active' ? active : history;

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* ── Header ── */}
            <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>My Bookings</Text>
                <TouchableOpacity
                    onPress={() => switchTab('history')}
                    style={[s.historyBtn, tab === 'history' && { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.2)' : '#e0f4fd' }, { backgroundColor: colors.divider }]}
                >
                    <Ionicons name="time-outline" size={20} color={tab === 'history' ? colors.accent : colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* ── Tab Bar ── */}
            <View style={[s.tabBar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <TouchableOpacity style={s.tabItem} onPress={() => switchTab('active')}>
                    <Text style={[s.tabLabel, tab === 'active' && { color: colors.accent }]}>Active Jobs</Text>
                    {active.length > 0 && (
                        <View style={[s.badge, { backgroundColor: colors.accent }]}>
                            <Text style={s.badgeTxt}>{active.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={s.tabItem} onPress={() => switchTab('history')}>
                    <Text style={[s.tabLabel, tab === 'history' && { color: colors.accent }]}>History</Text>
                    {history.length > 0 && tab === 'history' && (
                        <View style={[s.badge, { backgroundColor: colors.divider }]}>
                            <Text style={[s.badgeTxt, { color: colors.textSecondary }]}>{history.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <Animated.View
                    style={[
                        s.tabIndicator,
                        {
                            backgroundColor: colors.accent,
                            left: tabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['2%', '52%'],
                            }),
                        },
                    ]}
                />
            </View>

            {/* ── Content ── */}
            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={s.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />}
                    showsVerticalScrollIndicator={false}
                >
                    {current.length === 0 ? (
                        <EmptyState tab={tab} colors={colors} />
                    ) : (
                        current.map((b) => <BookingCard key={b.id} booking={b} colors={colors} isDark={isDark} statusConfig={STATUS_CONFIG} />)
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, colors, isDark, statusConfig }: { booking: Booking; colors: any; isDark: boolean; statusConfig: any }) {
    const cfg = statusConfig[booking.status] || statusConfig.pending;
    const emoji = CATEGORY_EMOJI[booking.service?.categoryId] || '�';
    const isPending = booking.status === 'pending';
    const isInProgress = booking.status === 'in_progress';

    return (
        <TouchableOpacity
            style={[s.card, { backgroundColor: colors.cardBackground }]}
            onPress={() =>
                router.push({ pathname: '/booking-details', params: { id: booking.id } } as any)
            }
            activeOpacity={0.88}
        >
            {/* Top */}
            <View style={s.cardTop}>
                <View style={[s.serviceIconCircle, { backgroundColor: cfg.bg }]}>
                    <Text style={s.serviceEmoji}>{emoji}</Text>
                    {isInProgress && <View style={[s.inProgressDot, { borderColor: colors.cardBackground }]} />}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.serviceName, { color: colors.textPrimary }]} numberOfLines={1}>{booking.service?.name}</Text>
                    <Text style={[s.vehicleName, { color: colors.textSecondary }]} numberOfLines={1}>
                        {booking.vehicle?.make} {booking.vehicle?.model} · {booking.vehicle?.color}
                    </Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                    <Text style={[s.statusPillTxt, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
            </View>

            <View style={[s.divider, { backgroundColor: colors.divider }]} />

            {/* Detail row */}
            <View style={s.cardDetails}>
                <View style={s.detailItem}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                    <Text style={[s.detailTxt, { color: colors.textSecondary }]}>{formatDate(booking.scheduledDate)}</Text>
                </View>
                <View style={s.detailItem}>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={[s.detailTxt, { color: colors.textSecondary }]}>{formatTime(booking.scheduledTime)}</Text>
                </View>
                <View style={s.detailItem}>
                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                    <Text style={[s.detailTxt, { color: colors.textSecondary }]} numberOfLines={1}>{booking.address?.city}</Text>
                </View>
            </View>

            {/* Footer */}
            <View style={s.cardFooter}>
                <View style={s.footerLeft}>
                    {booking.paidWithSubscription ? (
                        <View style={[s.subBadge, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                            <Ionicons name="shield-checkmark-outline" size={12} color={colors.accent} />
                            <Text style={[s.subBadgeTxt, { color: colors.accent }]}>Subscription</Text>
                        </View>
                    ) : (
                        <Text style={[s.price, { color: colors.textPrimary }]}>LKR {booking.totalPrice?.toLocaleString()}</Text>
                    )}
                    {booking.assignedStaffName && (
                        <View style={[s.washerBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4' }]}>
                            <Ionicons name="person-outline" size={12} color={colors.success} />
                            <Text style={[s.washerBadgeTxt, { color: colors.success }]}>{booking.assignedStaffName}</Text>
                        </View>
                    )}
                </View>
                <View style={s.viewBtn}>
                    <Text style={[s.viewBtnTxt, { color: colors.accent }]}>View</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.accent} />
                </View>
            </View>

            {/* Pending amber bar at bottom */}
            {isPending && (
                <View style={[s.pendingBar, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }]}>
                    <View style={[s.pendingBarFill, { backgroundColor: colors.warning }]} />
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ tab, colors }: { tab: 'active' | 'history'; colors: any }) {
    return (
        <View style={s.emptyState}>
            <View style={[s.emptyIconCircle, { backgroundColor: colors.divider }]}>
                <Ionicons
                    name={tab === 'active' ? 'car-outline' : 'time-outline'}
                    size={44}
                    color={colors.textSecondary}
                />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
                {tab === 'active' ? 'No active bookings' : 'No booking history'}
            </Text>
            <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
                {tab === 'active'
                    ? 'Book a car wash service to get started.'
                    : 'Completed and cancelled bookings will appear here.'}
            </Text>
            {tab === 'active' && (
                <TouchableOpacity
                    style={[s.emptyBtn, { backgroundColor: colors.accent }]}
                    onPress={() => router.push('/service-browse' as any)}
                >
                    <Ionicons name="search-outline" size={16} color="#fff" />
                    <Text style={s.emptyBtnTxt}>Find a Service</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    historyBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
    },
    historyBtnActive: { backgroundColor: '#e0f4fd' },

    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        position: 'relative',
    },
    tabItem: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6, paddingVertical: 14,
    },
    tabLabel: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
    tabLabelActive: { color: '#0ca6e8' },
    badge: {
        backgroundColor: '#0ca6e8', borderRadius: 10,
        minWidth: 20, height: 20, justifyContent: 'center',
        alignItems: 'center', paddingHorizontal: 6,
    },
    badgeTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
    tabIndicator: {
        position: 'absolute', bottom: 0, width: '46%',
        height: 2.5, backgroundColor: '#0ca6e8', borderRadius: 2,
    },

    scroll: { padding: 16 },

    card: {
        borderRadius: 20, marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 },
    serviceIconCircle: {
        width: 52, height: 52, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    serviceEmoji: { fontSize: 26 },
    inProgressDot: {
        position: 'absolute', top: 4, right: 4, width: 10, height: 10,
        borderRadius: 5, backgroundColor: '#8b5cf6', borderWidth: 2, borderColor: '#fff',
    },
    serviceName: { fontSize: 15, fontWeight: '700', color: '#0d1629', marginBottom: 3 },
    vehicleName: { fontSize: 13, color: '#6b7280' },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    statusPillTxt: { fontSize: 11, fontWeight: '700' },

    divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },

    cardDetails: {
        flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 14,
    },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    detailTxt: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

    cardFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4,
    },
    footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    price: { fontSize: 15, fontWeight: '800', color: '#0d1629' },
    subBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#e0f4fd', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    subBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#0ca6e8' },
    washerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    washerBadgeTxt: { fontSize: 11, fontWeight: '600', color: '#10b981' },
    viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    viewBtnTxt: { fontSize: 13, fontWeight: '700', color: '#0ca6e8' },

    pendingBar: { height: 3, backgroundColor: '#fef3c7' },
    pendingBarFill: { height: '100%', width: '55%', backgroundColor: '#f59e0b', borderRadius: 2 },

    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
    emptyIconCircle: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0d1629', marginBottom: 8 },
    emptySubtitle: {
        fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22, marginBottom: 28,
    },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#0ca6e8', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
    },
    emptyBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});