import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ProviderProfile {
    uid: string;
    displayName: string;
    email: string;
    phoneNumber: string;
    photoURL?: string;
    area: string;
    rating: number;
    totalReviews: number;
    totalBookings: number;
    isActive: boolean;
    isVerified: boolean;
    memberSince: string;
}

interface Booking {
    id: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    startedAt?: string;
    duration?: number;
    totalPrice?: number;
    notes?: string;
    service: {
        name: string;
        price: number;
        duration: number;
    };
    customer: {
        displayName: string;
        phone?: string;
    };
    vehicle: {
        make: string;
        model: string;
        year?: number;
        color?: string;
        nickname: string;
        licensePlate?: string;
    };
    address: {
        label: string;
        addressLine1?: string;
        city: string;
        country?: string;
    };
}

interface Stats {
    todayEarnings: number;
    weekEarnings: number;
    monthEarnings: number;
    completedToday: number;
    pendingRequests: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmt12(t: string) {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─────────────────────────────────────────────
// Pulse animation component
// ─────────────────────────────────────────────
function PulseIndicator() {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, { toValue: 1.5, duration: 800, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
    );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function ProviderHomeScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<ProviderProfile | null>(null);
    const [currentJob, setCurrentJob] = useState<Booking | null>(null);
    const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<Stats>({
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
        completedToday: 0,
        pendingRequests: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadAll();
        const interval = setInterval(() => loadPending(true), 15000);
        return () => clearInterval(interval);
    }, []);

    const loadAll = async () => {
        setLoading(true);
        await Promise.all([
            loadProfile(),
            loadCurrentJob(),
            loadPending(),
            loadUpcoming(),
            loadStats(),
        ]);
        setLoading(false);
    };

    const loadProfile = async () => {
        try {
            const data = await apiFetch('/profile', {}, 'provider');
            if (data.success) setProfile(data.data.provider);
        } catch (e) {
            console.error('Profile error:', e);
        }
    };

    const loadCurrentJob = async () => {
        try {
            const data = await apiFetch('/bookings?status=in_progress&limit=1', {}, 'provider');
            setCurrentJob(data.success && data.data.bookings.length > 0 ? data.data.bookings[0] : null);
        } catch (e) {
            console.error('Current job error:', e);
        }
    };

    const loadPending = async (silent = false) => {
        try {
            const data = await apiFetch('/bookings?status=pending&limit=20', {}, 'provider');
            if (data.success) {
                setPendingRequests(data.data.bookings);
                setStats(prev => ({ ...prev, pendingRequests: data.data.bookings.length }));
            }
        } catch (e) {
            if (!silent) console.error('Pending error:', e);
        }
    };

    const loadUpcoming = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await apiFetch(`/bookings?status=confirmed&startDate=${today}&limit=5`, {}, 'provider');
            if (data.success) setUpcomingBookings(data.data.bookings);
        } catch (e) {
            console.error('Upcoming error:', e);
        }
    };

    const loadStats = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await apiFetch(`/bookings?status=completed&startDate=${today}&endDate=${today}`, {}, 'provider');
            if (data.success) {
                const completed = data.data.bookings;
                const todayEarnings = completed.reduce((s: number, b: Booking) => s + b.service.price, 0);
                setStats(prev => ({
                    ...prev,
                    completedToday: completed.length,
                    todayEarnings,
                    weekEarnings: todayEarnings * 5,
                    monthEarnings: todayEarnings * 20,
                }));
            }
        } catch (e) {
            console.error('Stats error:', e);
        }
    };

    const handleAccept = async (id: string) => {
        setProcessingId(id);
        try {
            await apiFetch(`/bookings/${id}/accept`, { method: 'POST' }, 'provider');
            setPendingRequests(prev => prev.filter(r => r.id !== id));
            setStats(prev => ({ ...prev, pendingRequests: Math.max(0, prev.pendingRequests - 1) }));
            await loadUpcoming();
            Alert.alert('Accepted', 'Booking has been accepted successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to accept booking.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = (id: string) => {
        Alert.alert(
            'Decline Request',
            'Are you sure you want to decline this booking request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingId(id);
                        try {
                            await apiFetch(`/bookings/${id}/decline`, { method: 'POST' }, 'provider');
                            setPendingRequests(prev => prev.filter(r => r.id !== id));
                            setStats(prev => ({ ...prev, pendingRequests: Math.max(0, prev.pendingRequests - 1) }));
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to decline booking.');
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await SecureStore.deleteItemAsync('accessToken');
                    await SecureStore.deleteItemAsync('userType');
                    await SecureStore.deleteItemAsync('provider');
                    router.replace('/login');
                },
            },
        ]);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    // ─── Loading State ───────────────────────
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1d4ed8" />
                <Text style={styles.loadingText}>Loading dashboard…</Text>
            </View>
        );
    }

    const rating = profile?.rating ?? 0;
    const ratingStars = Math.round(rating);

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Header ─────────────────── */}
                <LinearGradient colors={['#1e3a8a', '#1d4ed8', '#2563eb']} style={styles.header}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => router.push('/profile' as any)} style={styles.avatarContainer}>
                            {profile?.photoURL ? (
                                <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Ionicons name="person" size={26} color="#1d4ed8" />
                                </View>
                            )}
                            {profile?.isActive && <View style={styles.onlineDot} />}
                        </TouchableOpacity>

                        <View style={styles.headerInfo}>
                            <Text style={styles.greeting}>{getGreeting()},</Text>
                            <Text style={styles.providerName} numberOfLines={1}>
                                {profile?.displayName || 'Provider'}
                            </Text>
                            <View style={styles.ratingRow}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Ionicons
                                        key={i}
                                        name={i < ratingStars ? 'star' : 'star-outline'}
                                        size={13}
                                        color="#fbbf24"
                                    />
                                ))}
                                <Text style={styles.ratingText}>
                                    {rating.toFixed(1)} ({profile?.totalReviews ?? 0})
                                </Text>
                            </View>
                        </View>

                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => router.push('/washer-requests' as any)}
                            >
                                {pendingRequests.length > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
                                        </Text>
                                    </View>
                                )}
                                <Ionicons name="notifications-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                                <Ionicons name="log-out-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Area badge */}
                    {profile?.area && (
                        <View style={styles.areaBadge}>
                            <Ionicons name="location-outline" size={13} color="#bfdbfe" />
                            <Text style={styles.areaText}>{profile.area}</Text>
                        </View>
                    )}
                </LinearGradient>

                {/* ─── Stats Grid ─────────────────── */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="cash-outline"
                        iconColor="#16a34a"
                        bg="#dcfce7"
                        label="Today's Earnings"
                        value={`LKR ${stats.todayEarnings.toLocaleString()}`}
                    />
                    <StatCard
                        icon="checkmark-circle-outline"
                        iconColor="#2563eb"
                        bg="#dbeafe"
                        label="Completed"
                        value={String(stats.completedToday)}
                    />
                    <StatCard
                        icon="time-outline"
                        iconColor="#d97706"
                        bg="#fef3c7"
                        label="Requests"
                        value={String(stats.pendingRequests)}
                    />
                    <StatCard
                        icon="star-outline"
                        iconColor="#7c3aed"
                        bg="#ede9fe"
                        label="Rating"
                        value={rating.toFixed(1)}
                    />
                </View>

                {/* ─── Earnings Summary ─────────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Earnings Summary</Text>
                        <TouchableOpacity onPress={() => router.push('/washer-earnings' as any)}>
                            <Text style={styles.viewAll}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.earningsRow}>
                        <View style={styles.earningItem}>
                            <Text style={styles.earningAmount}>
                                LKR {stats.weekEarnings.toLocaleString()}
                            </Text>
                            <Text style={styles.earningLabel}>This Week</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.earningItem}>
                            <Text style={styles.earningAmount}>
                                LKR {stats.monthEarnings.toLocaleString()}
                            </Text>
                            <Text style={styles.earningLabel}>This Month</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.earningItem}>
                            <Text style={styles.earningAmount}>{profile?.totalBookings ?? 0}</Text>
                            <Text style={styles.earningLabel}>Total Jobs</Text>
                        </View>
                    </View>
                </View>

                {/* ─── Current Job ─────────────────── */}
                {currentJob ? (
                    <TouchableOpacity
                        style={styles.activeJobCard}
                        onPress={() => router.push(`/washer-booking-details?id=${currentJob.id}` as any)}
                        activeOpacity={0.85}
                    >
                        <LinearGradient colors={['#065f46', '#059669']} style={styles.activeJobGradient}>
                            <View style={styles.activeJobHeader}>
                                <View style={styles.activeJobIndicator}>
                                    <PulseIndicator />
                                    <View style={styles.activeDot} />
                                </View>
                                <Text style={styles.activeJobLabel}>ACTIVE JOB IN PROGRESS</Text>
                                <Ionicons name="chevron-forward" size={20} color="#fff" />
                            </View>
                            <Text style={styles.activeJobService}>{currentJob.service.name}</Text>
                            <View style={styles.activeJobDetails}>
                                <View style={styles.activeJobDetail}>
                                    <Ionicons name="person-outline" size={14} color="#a7f3d0" />
                                    <Text style={styles.activeJobDetailText}>{currentJob.customer.displayName}</Text>
                                </View>
                                <View style={styles.activeJobDetail}>
                                    <Ionicons name="car-outline" size={14} color="#a7f3d0" />
                                    <Text style={styles.activeJobDetailText}>
                                        {currentJob.vehicle.make} {currentJob.vehicle.model}
                                    </Text>
                                </View>
                                <View style={styles.activeJobDetail}>
                                    <Ionicons name="location-outline" size={14} color="#a7f3d0" />
                                    <Text style={styles.activeJobDetailText}>{currentJob.address.city}</Text>
                                </View>
                                <View style={styles.activeJobDetail}>
                                    <Ionicons name="cash-outline" size={14} color="#a7f3d0" />
                                    <Text style={styles.activeJobDetailText}>
                                        LKR {currentJob.service.price.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.noJobCard}>
                        <Ionicons name="checkmark-circle-outline" size={44} color="#22c55e" />
                        <Text style={styles.noJobTitle}>No Active Job</Text>
                        <Text style={styles.noJobSub}>New booking requests will appear below</Text>
                    </View>
                )}

                {/* ─── Booking Requests ─────────────────── */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Booking Requests</Text>
                            {pendingRequests.length > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{pendingRequests.length}</Text>
                                </View>
                            )}
                        </View>
                        {pendingRequests.length > 3 && (
                            <TouchableOpacity onPress={() => router.push('/washer-requests' as any)}>
                                <Text style={styles.viewAll}>View All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {pendingRequests.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
                            <Text style={styles.emptyText}>No pending requests</Text>
                        </View>
                    ) : (
                        pendingRequests.slice(0, 3).map(req => (
                            <BookingRequestCard
                                key={req.id}
                                booking={req}
                                processing={processingId === req.id}
                                onAccept={() => handleAccept(req.id)}
                                onDecline={() => handleDecline(req.id)}
                                onPress={() => router.push(`/washer-job-request?id=${req.id}` as any)}
                            />
                        ))
                    )}
                </View>

                {/* ─── Upcoming Bookings ─────────────────── */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
                        {upcomingBookings.length > 0 && (
                            <TouchableOpacity onPress={() => router.push('/washer-booking' as any)}>
                                <Text style={styles.viewAll}>View All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {upcomingBookings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="time-outline" size={40} color="#d1d5db" />
                            <Text style={styles.emptyText}>No upcoming jobs today</Text>
                        </View>
                    ) : (
                        upcomingBookings.map(booking => (
                            <TouchableOpacity
                                key={booking.id}
                                style={styles.upcomingCard}
                                onPress={() => router.push(`/washer-booking-details?id=${booking.id}` as any)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.upcomingLeft}>
                                    <View style={styles.timeBlock}>
                                        <Text style={styles.timeText}>{fmt12(booking.scheduledTime)}</Text>
                                        <Text style={styles.dateText}>{fmtDate(booking.scheduledDate)}</Text>
                                    </View>
                                    <View style={styles.upcomingLine} />
                                    <View style={styles.upcomingInfo}>
                                        <Text style={styles.upcomingService}>{booking.service.name}</Text>
                                        <Text style={styles.upcomingCustomer}>{booking.customer.displayName}</Text>
                                        <View style={styles.upcomingMeta}>
                                            <Ionicons name="car-outline" size={13} color="#6b7280" />
                                            <Text style={styles.upcomingMetaText}>
                                                {booking.vehicle.make} {booking.vehicle.model}
                                                {booking.vehicle.nickname ? ` · ${booking.vehicle.nickname}` : ''}
                                            </Text>
                                        </View>
                                        <View style={styles.upcomingMeta}>
                                            <Ionicons name="location-outline" size={13} color="#6b7280" />
                                            <Text style={styles.upcomingMetaText} numberOfLines={1}>
                                                {booking.address.label}, {booking.address.city}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.upcomingRight}>
                                    <Text style={styles.upcomingPrice}>
                                        LKR {booking.service.price.toLocaleString()}
                                    </Text>
                                    <Text style={styles.upcomingDuration}>{booking.service.duration} min</Text>
                                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={{ marginTop: 8 }} />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* ─── Quick Actions ─────────────────── */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickGrid}>
                        <QuickAction
                            icon="calendar-outline"
                            label="My Bookings"
                            color="#2563eb"
                            bg="#dbeafe"
                            onPress={() => router.push('/washer-booking' as any)}
                        />
                        <QuickAction
                            icon="list-outline"
                            label="All Requests"
                            color="#d97706"
                            bg="#fef3c7"
                            onPress={() => router.push('/washer-requests' as any)}
                        />
                        <QuickAction
                            icon="stats-chart-outline"
                            label="Earnings"
                            color="#16a34a"
                            bg="#dcfce7"
                            onPress={() => router.push('/washer-earnings' as any)}
                        />
                        <QuickAction
                            icon="person-outline"
                            label="Profile"
                            color="#7c3aed"
                            bg="#ede9fe"
                            onPress={() => router.push('/profile' as any)}
                        />
                    </View>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </>
    );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function StatCard({ icon, iconColor, bg, label, value }: {
    icon: any; iconColor: string; bg: string; label: string; value: string;
}) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={22} color={iconColor} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function BookingRequestCard({ booking, processing, onAccept, onDecline, onPress }: {
    booking: Booking;
    processing: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.requestCard} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.requestTop}>
                <View style={styles.requestLeft}>
                    <Text style={styles.requestService}>{booking.service.name}</Text>
                    <Text style={styles.requestCustomer}>{booking.customer.displayName}</Text>
                </View>
                <View style={styles.requestRight}>
                    <Text style={styles.requestPrice}>
                        LKR {booking.service.price.toLocaleString()}
                    </Text>
                    <Text style={styles.requestDuration}>{booking.service.duration} min</Text>
                </View>
            </View>

            <View style={styles.requestMeta}>
                <View style={styles.requestMetaItem}>
                    <Ionicons name="calendar-outline" size={13} color="#6b7280" />
                    <Text style={styles.requestMetaText}>
                        {fmtDate(booking.scheduledDate)} at {fmt12(booking.scheduledTime)}
                    </Text>
                </View>
                <View style={styles.requestMetaItem}>
                    <Ionicons name="car-outline" size={13} color="#6b7280" />
                    <Text style={styles.requestMetaText}>
                        {booking.vehicle.make} {booking.vehicle.model}
                        {booking.vehicle.color ? ` · ${booking.vehicle.color}` : ''}
                    </Text>
                </View>
                <View style={styles.requestMetaItem}>
                    <Ionicons name="location-outline" size={13} color="#6b7280" />
                    <Text style={styles.requestMetaText} numberOfLines={1}>
                        {booking.address.city}
                    </Text>
                </View>
            </View>

            {booking.notes ? (
                <View style={styles.notesRow}>
                    <Ionicons name="document-text-outline" size={13} color="#6b7280" />
                    <Text style={styles.notesText} numberOfLines={2}>{booking.notes}</Text>
                </View>
            ) : null}

            <View style={styles.requestActions}>
                {processing ? (
                    <ActivityIndicator color="#2563eb" style={{ flex: 1 }} />
                ) : (
                    <>
                        <TouchableOpacity
                            style={styles.declineBtn}
                            onPress={onDecline}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-outline" size={18} color="#ef4444" />
                            <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.acceptBtn}
                            onPress={onAccept}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="checkmark-outline" size={18} color="#fff" />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
}

function QuickAction({ icon, label, color, bg, onPress }: {
    icon: any; label: string; color: string; bg: string; onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.8}>
            <View style={[styles.quickIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={26} color={color} />
            </View>
            <Text style={styles.quickLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    scrollContent: { paddingBottom: 20 },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
    loadingText: { marginTop: 12, fontSize: 15, color: '#6b7280' },

    // Header
    header: {
        paddingTop: 56,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative', marginRight: 14 },
    avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: '#93c5fd' },
    avatarFallback: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#93c5fd',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#22c55e',
        borderWidth: 2,
        borderColor: '#1d4ed8',
    },
    headerInfo: { flex: 1 },
    greeting: { fontSize: 13, color: '#bfdbfe' },
    providerName: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    ratingText: { fontSize: 12, color: '#bfdbfe', marginLeft: 5 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    iconBtn: { padding: 8 },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#ef4444',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        paddingHorizontal: 3,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    areaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    areaText: { fontSize: 12, color: '#bfdbfe', marginLeft: 4 },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 10,
    },
    statCard: {
        width: '47.5%',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    statIcon: { borderRadius: 10, padding: 8, marginBottom: 10 },
    statValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
    statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },

    // Card
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    viewAll: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
    earningsRow: { flexDirection: 'row', alignItems: 'center' },
    earningItem: { flex: 1, alignItems: 'center' },
    earningAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
    earningLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    divider: { width: 1, height: 36, backgroundColor: '#e5e7eb' },

    // Active Job
    activeJobCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#065f46',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    activeJobGradient: { padding: 18 },
    activeJobHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    activeJobIndicator: {
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    pulseRing: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#4ade80',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ade80',
    },
    activeJobLabel: { flex: 1, fontSize: 11, fontWeight: '700', color: '#a7f3d0', letterSpacing: 1 },
    activeJobService: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 },
    activeJobDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    activeJobDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    activeJobDetailText: { fontSize: 13, color: '#a7f3d0' },

    // No Job
    noJobCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 14,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    noJobTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 10 },
    noJobSub: { fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' },

    // Section
    sectionContainer: { marginHorizontal: 16, marginBottom: 16 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
    countBadge: {
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    emptyState: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },

    // Request Card
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#f59e0b',
    },
    requestTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    requestLeft: { flex: 1, marginRight: 12 },
    requestService: { fontSize: 15, fontWeight: '700', color: '#111827' },
    requestCustomer: { fontSize: 13, color: '#6b7280', marginTop: 3 },
    requestRight: { alignItems: 'flex-end' },
    requestPrice: { fontSize: 17, fontWeight: '700', color: '#16a34a' },
    requestDuration: { fontSize: 12, color: '#9ca3af', marginTop: 3 },
    requestMeta: { gap: 5, marginBottom: 10 },
    requestMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    requestMetaText: { fontSize: 12, color: '#6b7280', flex: 1 },
    notesRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 5,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 8,
        marginBottom: 10,
    },
    notesText: { fontSize: 12, color: '#6b7280', flex: 1, lineHeight: 18 },
    requestActions: {
        flexDirection: 'row',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
        marginTop: 2,
    },
    declineBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#fecaca',
        backgroundColor: '#fef2f2',
    },
    declineBtnText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
    acceptBtn: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#2563eb',
    },
    acceptBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

    // Upcoming Card
    upcomingCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    upcomingLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
    timeBlock: { alignItems: 'center', marginRight: 12, minWidth: 70 },
    timeText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
    dateText: { fontSize: 11, color: '#9ca3af', marginTop: 2, textAlign: 'center' },
    upcomingLine: { width: 2, height: '80%', backgroundColor: '#e5e7eb', marginRight: 12, borderRadius: 1, alignSelf: 'center' },
    upcomingInfo: { flex: 1 },
    upcomingService: { fontSize: 14, fontWeight: '700', color: '#111827' },
    upcomingCustomer: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    upcomingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    upcomingMetaText: { fontSize: 12, color: '#9ca3af', flex: 1 },
    upcomingRight: { alignItems: 'flex-end', paddingLeft: 8 },
    upcomingPrice: { fontSize: 15, fontWeight: '700', color: '#16a34a' },
    upcomingDuration: { fontSize: 11, color: '#9ca3af', marginTop: 3 },

    // Quick Actions
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    quickCard: {
        width: '47.5%',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 18,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    quickIcon: { borderRadius: 12, padding: 12, marginBottom: 10 },
    quickLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
});
