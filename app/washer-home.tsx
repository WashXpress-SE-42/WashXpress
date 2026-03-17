import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { apiFetch } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────
type BookingDoc = {
    id: string;
    customerName: string | null;
    vehicle: {
        make: string;
        model: string;
        year?: number;
        type?: string;
        color: string;
        licensePlate: string;
    };
    service: {
        name: string;
        categoryId: string;
        duration: number;
    };
    address: {
        addressLine1: string;
        city: string;
    };
    scheduledDate: string;
    scheduledTime: string;
    totalPrice: number;
    currency: string;
    paidWithSubscription: boolean;
    notes?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
    if (!dateStr) return '—';
    const today = new Date();
    const date = new Date(dateStr);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === new Date(today.getTime() + 86400000).toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string) {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function formatPrice(price: number, currency: string, paidWithSubscription: boolean) {
    if (paidWithSubscription) return 'Subscription';
    return `${currency || 'LKR'} ${(price || 0).toLocaleString()}`;
}

const CATEGORY_EMOJI: Record<string, string> = {
    'exterior-wash':  '🚿',
    'interior-clean': '🧹',
    'tire-cleaning':  '⚙️',
    'full-detail':    '✨',
};

const TYPE_ICONS: Record<string, string> = {
    SUV: '🚙', Van: '🚐', Truck: '🛻',
    Sedan: '🚗', Hatchback: '🚗', Coupe: '🚗',
    Convertible: '🚗', Wagon: '🚗',
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function WasherHome() {
    const router = useRouter();
    const { user } = useAuth();
    const { data: profile, isLoading: profileLoading } = useProfile();
    const { colors, isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('home');
    const [bookings, setBookings] = useState<BookingDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState<string | null>(null);

    // ── Live Firestore listener on pending bookings ───────────────────────────
    useEffect(() => {
        const q = query(
            collection(db, 'bookings'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetched: BookingDoc[] = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as Omit<BookingDoc, 'id'>),
                }));

                // Sort soonest scheduled date/time first
                fetched.sort((a, b) => {
                    if (a.scheduledDate !== b.scheduledDate)
                        return a.scheduledDate > b.scheduledDate ? 1 : -1;
                    return a.scheduledTime > b.scheduledTime ? 1 : -1;
                });

                setBookings(fetched);
                setLoading(false);
            },
            (error) => {
                console.error('Firestore listener error:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // ── Quick-accept directly from home card ─────────────────────────────────
    const handleAcceptJob = useCallback(async (bookingId: string) => {
        try {
            setAccepting(bookingId);
            await apiFetch(
                `/bookings/${bookingId}/accept`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ preferredTime: null }),
                },
                'provider'
            );
            router.push({ pathname: '/washer-booking-details', params: { id: bookingId } } as any);
        } catch (error: any) {
            const msg = error?.message || '';
            if (msg.toLowerCase().includes('already claimed') || msg.includes('ALREADY_CLAIMED')) {
                Alert.alert('Too slow! 😅', 'Another washer grabbed this job first.');
            } else {
                Alert.alert('Error', msg || 'Failed to accept job');
            }
        } finally {
            setAccepting(null);
        }
    }, [router]);

    // ── View full job details before deciding ────────────────────────────────
    const handleViewJob = useCallback((bookingId: string) => {
        router.push({ pathname: '/washer-job-request', params: { id: bookingId } } as any);
    }, [router]);

    const getUserName = () => {
        if (profileLoading) return '...';
        if (profile?.displayName) return profile.displayName;
        if (user?.displayName) return user.displayName;
        if (profile?.firstName || profile?.lastName)
            return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        return 'Washer';
    };

    const isDarkTheme = isDark;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            <ScrollView
                style={[styles.scroll, { backgroundColor: colors.background }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Welcome back,</Text>
                            <Text style={[styles.providerName, { color: colors.textPrimary }]}>{getUserName()}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.profileBtn, { backgroundColor: colors.background }]}
                            onPress={() => router.push('/profile' as any)}
                        >
                            <Ionicons name="person-outline" size={22} color={colors.accent} />
                        </TouchableOpacity>
                    </View>

                    {/* Earnings Card */}
                    <TouchableOpacity 
                        style={[styles.earningsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: colors.border }]} 
                        activeOpacity={0.85}
                    >
                        <View style={styles.earningsLeft}>
                            <View style={styles.earningsLabelRow}>
                                <Ionicons name="cash-outline" size={16} color={colors.success || '#16a34a'} />
                                <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>  This Month's Earnings</Text>
                            </View>
                            <Text style={[styles.earningsAmount, { color: colors.textPrimary }]}>LKR 0</Text>
                            <View style={styles.trendRow}>
                                <Ionicons name="trending-up-outline" size={14} color={colors.success || '#16a34a'} />
                                <Text style={[styles.trendText, { color: colors.success || '#16a34a' }]}>  Tap to view earnings</Text>
                            </View>
                        </View>
                        <View style={styles.earningsRight}>
                            <Text style={[styles.jobsDoneCount, { color: colors.accent }]}>0</Text>
                            <Text style={[styles.jobsDoneLabel, { color: colors.textSecondary }]}>Jobs Done</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ── Stats Grid ── */}
                <View style={styles.statsGrid}>
                    {[
                        { icon: 'star',                    color: '#f59e0b', value: '—',                       label: 'Rating'    },
                        { icon: 'calendar-outline',        color: colors.accent, value: String(bookings.length),   label: 'Available' },
                        { icon: 'checkmark-circle-outline', color: colors.success || '#16a34a', value: '0',                      label: 'Completed' },
                    ].map((stat) => (
                        <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Available Jobs ── */}
                <View style={[styles.section, { backgroundColor: colors.background }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Available Jobs</Text>
                        {!loading && bookings.length > 0 && (
                            <View style={[styles.newBadge, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}>
                                <View style={styles.pulseDot} />
                                <Text style={[styles.newBadgeText, { color: colors.accent }]}>{bookings.length} Live</Text>
                            </View>
                        )}
                    </View>

                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={colors.accent} />
                            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching available jobs...</Text>
                        </View>
                    ) : bookings.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="car-outline" size={48} color={colors.divider} />
                            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Jobs Available</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary, opacity: 0.7 }]}>New bookings appear here in real time</Text>
                        </View>
                    ) : (
                        bookings.map((booking) => (
                            <JobCard
                                key={booking.id}
                                booking={booking}
                                accepting={accepting}
                                onAccept={handleAcceptJob}
                                onView={handleViewJob}
                                colors={colors}
                            />
                        ))
                    )}

                    {!loading && bookings.length > 0 && (
                        <View style={[styles.proTipCard, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.05)', borderColor: `${colors.warning}40` }]}>
                            <View style={[styles.proTipIcon, { backgroundColor: `${colors.warning}20` }]}>
                                <Ionicons name="flash" size={20} color={colors.warning} />
                            </View>
                            <View style={styles.proTipContent}>
                                <Text style={[styles.proTipTitle, { color: colors.warning }]}>Race Mode Active</Text>
                                <Text style={[styles.proTipBody, { color: colors.textSecondary }]}>
                                    First washer to accept wins the job. Tap "View Details" to review first, or "Accept" to claim instantly.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ── Bottom Navigation ── */}
            <View style={[styles.bottomNav, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
                {[
                    { key: 'home',     icon: 'home-outline',     label: 'Home'     },
                    { key: 'jobs',     icon: 'briefcase-outline', label: 'My Jobs'  },
                    { key: 'earnings', icon: 'cash-outline',      label: 'Earnings' },
                    { key: 'shop',     icon: 'cart-outline',      label: 'Shop'     },
                    { key: 'profile',  icon: 'person-outline',    label: 'Profile'  },
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.navItem}
                        onPress={() => {
                            if (tab.key === 'shop')         router.push('/marketplace' as any);
                            else if (tab.key === 'profile') router.push('/profile' as any);
                            else if (tab.key === 'jobs')    router.push('/myjobs' as any);
                            else                            setActiveTab(tab.key);
                        }}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={22}
                            color={activeTab === tab.key ? colors.accent : colors.textSecondary}
                        />
                        <Text style={[
                            styles.navLabel, 
                            { color: colors.textSecondary },
                            activeTab === tab.key && [styles.navLabelActive, { color: colors.accent }]
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({
    booking,
    accepting,
    onAccept,
    onView,
    colors,
}: {
    booking: BookingDoc;
    accepting: string | null;
    onAccept: (id: string) => void;
    onView: (id: string) => void;
    colors: any;
}) {
    const isAccepting = accepting === booking.id;
    const vehicleEmoji = TYPE_ICONS[booking.vehicle?.type || ''] || '🚗';
    const serviceEmoji = CATEGORY_EMOJI[booking.service?.categoryId || ''] || '🚿';
    const addressStr = booking.address
        ? `${booking.address.addressLine1}, ${booking.address.city}`
        : 'No address';

    return (
        <View style={[styles.jobCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.jobCardHeader}>
                <View style={styles.jobCardLeft}>
                    <Text style={[styles.jobName, { color: colors.textPrimary }]}>{booking.customerName || 'Customer'}</Text>
                    <View style={styles.vehicleRow}>
                        <Text style={styles.vehicleEmoji}>{vehicleEmoji}</Text>
                        <Text style={[styles.jobVehicle, { color: colors.textSecondary }]}>
                            {booking.vehicle?.make} {booking.vehicle?.model}
                            {booking.vehicle?.year ? ` · ${booking.vehicle.year}` : ''}
                        </Text>
                    </View>
                    <Text style={[styles.vehiclePlate, { color: colors.textSecondary, opacity: 0.7 }]}>
                        {booking.vehicle?.color} · {booking.vehicle?.licensePlate}
                    </Text>
                </View>
                <View style={styles.jobCardRight}>
                    <Text style={[
                        styles.jobAmount,
                        { color: colors.accent },
                        booking.paidWithSubscription && [styles.jobAmountSub, { color: colors.accent }]
                    ]}>
                        {formatPrice(booking.totalPrice, booking.currency, booking.paidWithSubscription)}
                    </Text>
                    {booking.service?.duration > 0 && (
                        <View style={[styles.durationPill, { backgroundColor: colors.background }]}>
                            <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                            <Text style={[styles.durationText, { color: colors.textSecondary }]}>{booking.service.duration} min</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Service */}
            <View style={[styles.serviceBox, { backgroundColor: `${colors.accent}15` }]}>
                <Text style={styles.serviceEmoji}>{serviceEmoji}</Text>
                <Text style={[styles.serviceText, { color: colors.accent }]}>{booking.service?.name || 'Service'}</Text>
            </View>

            {/* Details */}
            <View style={styles.jobDetails}>
                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>{addressStr}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>{formatDate(booking.scheduledDate)}</Text>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>{formatTime(booking.scheduledTime)}</Text>
                </View>
            </View>

            {/* Special instructions warning */}
            {!!booking.notes && (
                <View style={[styles.notesIndicator, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
                    <Ionicons name="warning-outline" size={13} color={colors.warning} />
                    <Text style={[styles.notesIndicatorText, { color: colors.warning }]}>Customer has special instructions</Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.jobActions}>
                <TouchableOpacity
                    style={[styles.viewBtn, { borderColor: colors.divider }]}
                    onPress={() => onView(booking.id)}
                    disabled={isAccepting}
                >
                    <Text style={[styles.viewBtnText, { color: colors.textPrimary }]}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.accent }, isAccepting && styles.acceptBtnDisabled]}
                    activeOpacity={0.8}
                    onPress={() => onAccept(booking.id)}
                    disabled={isAccepting}
                >
                    {isAccepting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="flash" size={15} color="#fff" />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe:              { flex: 1 },
    scroll:            { flex: 1 },
    scrollContent:     { paddingBottom: 90 },

    // Header
    header:            { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
    headerTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerGreeting:    { flex: 1 },
    welcomeText:       { fontSize: 14, marginBottom: 2 },
    providerName:      { fontSize: 24, fontWeight: '700' },
    profileBtn:        { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

    // Earnings Card
    earningsCard:      { borderRadius: 16, padding: 16, flexDirection: 'row', flexWrap: 'wrap', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, borderWidth: 1 },
    earningsLeft:      { flex: 1 },
    earningsLabelRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    earningsLabel:     { fontSize: 12, fontWeight: '500' },
    earningsAmount:    { fontSize: 28, fontWeight: '800', marginBottom: 4 },
    trendRow:          { flexDirection: 'row', alignItems: 'center' },
    trendText:         { fontSize: 12, fontWeight: '500' },
    earningsRight:     { alignItems: 'center', justifyContent: 'center', paddingLeft: 16 },
    jobsDoneCount:     { fontSize: 32, fontWeight: '800' },
    jobsDoneLabel:     { fontSize: 12, fontWeight: '500' },
    earningsTap:       { width: '100%', textAlign: 'center', marginTop: 10, fontSize: 12 },

    // Stats Grid
    statsGrid:         { flexDirection: 'row', paddingHorizontal: 16, marginTop: -20, gap: 10, marginBottom: 8 },
    statCard:          { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2, borderWidth: 1 },
    statValue:         { fontSize: 20, fontWeight: '700', marginTop: 6 },
    statLabel:         { fontSize: 11, marginTop: 2 },

    // Section
    section:           { paddingHorizontal: 16, marginTop: 16 },
    sectionHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionTitle:      { fontSize: 18, fontWeight: '700' },
    newBadge:          { marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    pulseDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
    newBadgeText:      { fontSize: 12, fontWeight: '600' },

    // Loading / Empty
    loadingBox:        { alignItems: 'center', paddingVertical: 40 },
    loadingText:       { marginTop: 12, fontSize: 14 },
    emptyBox:          { alignItems: 'center', paddingVertical: 40 },
    emptyTitle:        { fontSize: 16, fontWeight: '600', marginTop: 12 },
    emptySubtitle:     { fontSize: 13, marginTop: 4 },

    // Job Card
    jobCard:           { borderRadius: 16, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
    jobCardHeader:     { flexDirection: 'row', padding: 16, paddingBottom: 10 },
    jobCardLeft:       { flex: 1 },
    jobName:           { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    vehicleRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    vehicleEmoji:      { fontSize: 16 },
    jobVehicle:        { fontSize: 13, fontWeight: '500' },
    vehiclePlate:      { fontSize: 12 },
    jobCardRight:      { alignItems: 'flex-end', gap: 6 },
    jobAmount:         { fontSize: 20, fontWeight: '800' },
    jobAmountSub:      { fontSize: 13 },
    durationPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    durationText:      { fontSize: 11, fontWeight: '500' },

    serviceBox:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
    serviceEmoji:      { fontSize: 15 },
    serviceText:       { fontSize: 13, fontWeight: '600' },

    jobDetails:        { paddingHorizontal: 16, gap: 6, marginBottom: 10 },
    detailRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText:        { fontSize: 13 },

    notesIndicator:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderWidth: 1 },
    notesIndicatorText: { fontSize: 12, fontWeight: '600' },

    jobActions:        { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },
    viewBtn:           { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
    viewBtnText:       { fontSize: 14, fontWeight: '700' },
    acceptBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
    acceptBtnDisabled: { opacity: 0.6 },
    acceptBtnText:     { fontSize: 14, fontWeight: '800', color: '#fff' },

    // Pro Tip Card
    proTipCard:        { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 16, alignItems: 'flex-start' },
    proTipIcon:        { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    proTipContent:     { flex: 1 },
    proTipTitle:       { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    proTipBody:        { fontSize: 13, lineHeight: 19 },

    // Bottom Nav
    bottomNav:         { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, flexDirection: 'row', paddingBottom: 20, paddingTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
    navItem:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
    navLabel:          { fontSize: 10, marginTop: 3, fontWeight: '500' },
    navLabelActive:    { fontWeight: '600' },
});