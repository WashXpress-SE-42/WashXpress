import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/services/apiClient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useProfile } from '../hooks/useProfile';
import React, { useEffect, useState } from 'react';

import {
    ActivityIndicator, Alert, Linking, Platform,
    ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

interface AcceptedBooking {
    id: string;
    status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    scheduledDate: string;
    scheduledTime: string;        // customer's original requested time
    washerPreferredTime?: string; // washer's accepted arrival time
    duration: number;
    totalPrice: number;
    currency: string;
    paidWithSubscription: boolean;
    notes?: string;               // customer's special car care instructions
    priceBreakdown?: { basePrice: number; multiplier: number; totalPrice: number; vehicleType: string };
    service: { name: string; duration: number; categoryId: string };
    vehicle: {
        make: string; model: string; year: number; color: string;
        licensePlate: string; nickname: string; type: string;
    };
    address: {
        label: string; addressLine1: string; addressLine2?: string;
        city: string; postalCode?: string; country: string;
        location?: { latitude: number; longitude: number };
    };
    customer?: { displayName: string; phone?: string };
    createdAt: any;
}

function fmt(t: string) {
    const [h, m] = t.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    confirmed: { label: 'Confirmed', color: '#0ca6e8', bg: 'rgba(12, 166, 232, 0.15)', icon: 'checkmark-circle' },
    in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: 'construct' },
    completed: { label: 'Completed', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)', icon: 'checkmark-done-circle' },
    cancelled: { label: 'Completed', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: 'close-circle' },
};

const VEHICLE_TYPE_ICONS: Record<string, string> = {
    SUV: '🚙', Van: '🚐', Truck: '🛻',
    Sedan: '🚗', Hatchback: '🚗', Coupe: '🚗', Convertible: '🚗', Wagon: '🚗',
};

export default function WasherBookingDetailsScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { logout } = useAuth();
    const { id: bookingId } = useLocalSearchParams<{ id: string }>();
    const [booking, setBooking] = useState<AcceptedBooking | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const { data: washerProfile, isLoading: profileLoading } = useProfile();

    // ── Runtime Verification Guard ───────────────────────────────────────────
    useEffect(() => {
        if (!profileLoading && washerProfile && washerProfile.isVerified === false) {
            console.log('🛑 Washer not verified, redirecting to pending...');
            router.replace('/washer-pending');
        }
    }, [washerProfile, profileLoading]);

    useEffect(() => {
        if (!bookingId) { router.back(); return; }
        loadBooking();
    }, []);

    const loadBooking = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`/bookings/${bookingId}`, {}, 'provider');
            if (res.success) {
                setBooking(res.data.booking);
            } else {
                Alert.alert('Error', 'Booking not found');
                router.back();
            }
        } catch (e: any) {
            console.error('Load booking error:', e);
            const msg = e?.message ?? '';
            const isUserNotFound = /user not found/i.test(msg);
            if (isUserNotFound) {
                Alert.alert(
                    'Account Not Found',
                    'Your washer account is not set up in our system. Please sign out and sign in again as a washer.',
                    [{ text: 'Sign Out', onPress: async () => { await logout(); router.replace('/login'); } }, { text: 'Go Back', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Error', msg || 'Failed to load booking');
                router.back();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStartService = () => {
        Alert.alert(
            'Start Service?',
            "Confirm you've arrived and are starting the wash. The customer will be notified.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start Now',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const res = await apiFetch(`/bookings/${bookingId}/start`, { method: 'PATCH' }, 'provider');
                            if (res.success) {
                                Alert.alert('Success', 'Service started!');
                                await loadBooking();
                                Alert.alert('Service Started! 🚿', 'The customer has been notified you have arrived.');
                            } else {
                                Alert.alert('Error', res.message || 'Failed to start service');
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCompleteService = () => {
        Alert.alert(
            'Complete Service?',
            'Confirm the wash is done. The customer will be asked to review.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Complete',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const res = await apiFetch(`/bookings/${bookingId}/complete`, { method: 'PATCH' }, 'provider');
                            if (res.success) {
                                Alert.alert('Success! 🎉', 'Service completed. Great job!', [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            router.replace('/washer-home' as Href);
                                        },
                                    },
                                ]);
                            } else {
                                Alert.alert('Error', res.message || 'Failed to complete service');
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const openNavigation = () => {
        if (!booking?.address.location) { Alert.alert('No coordinates', 'Coordinates unavailable for this address.'); return; }
        const { latitude, longitude } = booking.address.location;
        const url = Platform.OS === 'ios'
            ? `maps://app?daddr=${latitude},${longitude}`
            : `google.navigation:q=${latitude},${longitude}`;
        Linking.openURL(url);
    };

    if (loading) return (
        <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></View>
    );
    if (!booking) return (
        <View style={[s.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.error }}>Booking not found</Text></View>
    );

    const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed;
    const vehicleIcon = VEHICLE_TYPE_ICONS[booking.vehicle.type] || '🚗';
    const hasSpecialNotes = !!booking.notes?.trim();
    const timeChanged = booking.washerPreferredTime && booking.washerPreferredTime !== booking.scheduledTime;

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Job Details</Text>
                <View style={[s.statusPill, { backgroundColor: statusCfg.bg }]}>
                    <Ionicons name={statusCfg.icon as any} size={14} color={statusCfg.color} />
                    <Text style={[s.statusPillTxt, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                </View>
            </View>

            {/* Top quick actions & crucial info */}
            <View style={[s.topBar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                <View style={s.topInfo}>
                    <Text style={[s.topService, { color: colors.textPrimary }]}>{booking.service.name}</Text>
                    <Text style={[s.topMeta, { color: colors.textSecondary }]}>
                        {formatDate(booking.scheduledDate)} · {fmt(booking.washerPreferredTime || booking.scheduledTime)}
                    </Text>
                    <Text numberOfLines={1} style={[s.topAddress, { color: colors.textSecondary }]}>
                        {booking.address.label || booking.address.addressLine1}
                    </Text>
                </View>
                <View style={s.topActions}>
                    {booking.customer?.phone && (
                        <TouchableOpacity
                            style={[s.iconActionBtn, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f2fe' }]}
                            onPress={() => Linking.openURL(`tel:${booking.customer!.phone}`)}
                        >
                            <Ionicons name="call" size={18} color={colors.accent} />
                            <Text style={[s.iconActionTxt, { color: colors.textPrimary }]}>Call</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[s.iconActionBtn, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#dcfce7' }]}
                        onPress={openNavigation}
                    >
                        <Ionicons name="navigate" size={18} color={colors.success || '#16a34a'} />
                        <Text style={[s.iconActionTxt, { color: colors.textPrimary }]}>Directions</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Earnings banner */}
                <View style={[s.earningsBanner, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                    <View>
                        <Text style={[s.earningsLabel, { color: colors.textSecondary }]}>Earnings for this Job</Text>
                        <Text style={[s.earningsValue, { color: colors.textPrimary }]}>
                            {booking.paidWithSubscription
                                ? 'Subscription Job'
                                : `LKR ${booking.totalPrice.toLocaleString()}`}
                        </Text>
                    </View>
                    <View style={[s.durationPill, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : 'rgba(12, 166, 232, 0.1)' }]}>
                        <Ionicons name="time-outline" size={15} color={colors.accent} />
                        <Text style={[s.durationTxt, { color: colors.accent }]}>~{booking.duration} min</Text>
                    </View>
                </View>

                {/* ── Schedule ── */}
                <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                    <CardTitle icon="calendar" title="Schedule" colors={colors} />

                    <View style={s.scheduleGrid}>
                        <ScheduleItem label="Date" value={formatDate(booking.scheduledDate)} colors={colors} />
                        <ScheduleItem label="Service" value={booking.service.name} colors={colors} />
                    </View>

                    {/* Time display — show both if different */}
                    <View style={[s.timeBlock, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                        <Text style={[s.timeLbl, { color: colors.accent }]}>Your Arrival Time</Text>
                        <Text style={[s.timeVal, { color: colors.textPrimary }]}>{fmt(booking.washerPreferredTime || booking.scheduledTime)}</Text>
                        {timeChanged && (
                            <View style={s.timeChangedRow}>
                                <Ionicons name="swap-horizontal-outline" size={13} color={colors.textSecondary} />
                                <Text style={[s.timeChangedTxt, { color: colors.textSecondary }]}>Customer requested {fmt(booking.scheduledTime)} · you adjusted to {fmt(booking.washerPreferredTime!)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Vehicle & Car Care Notes ── */}
                <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                    <CardTitle icon="car-sport" title="Vehicle" colors={colors} />

                    <View style={s.vehicleRow}>
                        <Text style={s.vehicleEmoji}>{vehicleIcon}</Text>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={[s.vehicleName, { color: colors.textPrimary }]}>{booking.vehicle.nickname || `${booking.vehicle.make} ${booking.vehicle.model}`}</Text>
                            <Text style={[s.vehicleDetails, { color: colors.textSecondary }]}>{booking.vehicle.make} {booking.vehicle.model} · {booking.vehicle.year} · {booking.vehicle.color}</Text>
                            <Text style={[s.vehiclePlate, { color: colors.accent }]}>{booking.vehicle.licensePlate}</Text>
                        </View>
                        <View style={[s.vehicleTypePill, { backgroundColor: colors.divider }]}>
                            <Text style={[s.vehicleTypeTxt, { color: colors.textPrimary }]}>{booking.vehicle.type}</Text>
                        </View>
                    </View>

                    {booking.priceBreakdown && booking.priceBreakdown.multiplier > 1.0 && (
                        <View style={[s.multiplierRow, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                            <Ionicons name="information-circle-outline" size={14} color={colors.accent} />
                            <Text style={[s.multiplierTxt, { color: colors.accent }]}>
                                {booking.vehicle.type} vehicle — {Math.round((booking.priceBreakdown.multiplier - 1) * 100)}% size surcharge applied
                            </Text>
                        </View>
                    )}

                    {/* Special instructions — prominent */}
                    {hasSpecialNotes ? (
                        <View style={[s.specialNotesBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', borderColor: colors.warning }]}>
                            <View style={s.specialNotesHeader}>
                                <Ionicons name="warning" size={18} color={colors.warning} />
                                <Text style={[s.specialNotesTitle, { color: colors.warning }]}>⚠️ Special Car Care Instructions</Text>
                            </View>
                            <Text style={[s.specialNotesTxt, { color: colors.textPrimary }]}>{booking.notes}</Text>
                        </View>
                    ) : (
                        <View style={[s.noNotesRow, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.1)' : '#f0fdf4' }]}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success || '#16a34a'} />
                            <Text style={[s.noNotesTxt, { color: colors.success || '#16a34a' }]}>No special instructions from customer</Text>
                        </View>
                    )}
                </View>

                {/* ── Location ── */}
                <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                    <CardTitle icon="location" title="Service Location" colors={colors} />
                    <Text style={[s.addressLabel, { color: colors.textPrimary }]}>{booking.address.label}</Text>
                    <Text style={[s.addressLine, { color: colors.textSecondary }]}>{booking.address.addressLine1}</Text>
                    {booking.address.addressLine2 && <Text style={[s.addressLine, { color: colors.textSecondary }]}>{booking.address.addressLine2}</Text>}
                    <Text style={[s.addressLine, { color: colors.textSecondary }]}>{booking.address.city}{booking.address.postalCode ? `, ${booking.address.postalCode}` : ''}</Text>

                    {booking.address.location && (
                        <TouchableOpacity style={[s.navBtn, { backgroundColor: colors.accent }]} onPress={openNavigation}>
                            <Ionicons name="navigate" size={16} color="#fff" />
                            <Text style={s.navBtnTxt}>Open in Maps</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Customer ── */}
                {booking.customer && (
                    <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                        <CardTitle icon="person-circle" title="Customer" colors={colors} />
                        <Text style={[s.customerName, { color: colors.textPrimary }]}>{booking.customer.displayName}</Text>
                        {booking.customer.phone && (
                            <TouchableOpacity
                                style={[s.callBtn, { borderColor: colors.accent }]}
                                onPress={() => Linking.openURL(`tel:${booking.customer!.phone}`)}
                            >
                                <Ionicons name="call-outline" size={16} color={colors.accent} />
                                <Text style={[s.callBtnTxt, { color: colors.accent }]}>Call Customer</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── Action Buttons ── */}
                {booking.status === 'confirmed' && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.startBtn, { backgroundColor: colors.warning || '#f59e0b' }]}
                        onPress={handleStartService}
                        disabled={actionLoading}
                    >
                        {actionLoading
                            ? <ActivityIndicator color="#fff" />
                            : <><Ionicons name="play-circle" size={22} color="#fff" /><Text style={s.actionBtnTxt}>I've Arrived — Start Service</Text></>
                        }
                    </TouchableOpacity>
                )}

                {booking.status === 'in_progress' && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.completeBtn, { backgroundColor: colors.success || '#16a34a' }]}
                        onPress={handleCompleteService}
                        disabled={actionLoading}
                    >
                        {actionLoading
                            ? <ActivityIndicator color="#fff" />
                            : <><Ionicons name="checkmark-done-circle" size={22} color="#fff" /><Text style={s.actionBtnTxt}>Mark Service Complete</Text></>
                        }
                    </TouchableOpacity>
                )}

                {booking.status === 'completed' && (
                    <View style={[s.completedBanner, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#dcfce7' }]}>
                        <Ionicons name="trophy" size={28} color={colors.success || '#16a34a'} />
                        <Text style={[s.completedTxt, { color: colors.success || '#16a34a' }]}>Great job! This service is complete.</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function CardTitle({ icon, title, colors }: { icon: string; title: string; colors: any }) {
    return (
        <View style={s.cardTitleRow}>
            <Ionicons name={icon as any} size={18} color={colors.accent} />
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
    );
}

function ScheduleItem({ label, value, colors }: { label: string; value: string; colors: any }) {
    return (
        <View style={[s.scheduleItem, { backgroundColor: colors.background }]}>
            <Text style={[s.scheduleLbl, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[s.scheduleVal, { color: colors.textPrimary }]}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 56, paddingBottom: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    statusPillTxt: { fontSize: 12, fontWeight: '700' },
    topBar: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 10, paddingTop: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    topInfo: { flex: 1 },
    topService: { fontSize: 15, fontWeight: '700', color: '#0d1629' },
    topMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    topAddress: { fontSize: 12, color: '#9ca3af', marginTop: 2, maxWidth: '100%' },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconActionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, gap: 6 },
    iconActionTxt: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
    scroll: { padding: 20, paddingBottom: 110 },

    earningsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1629', borderRadius: 18, padding: 20, marginBottom: 14 },
    earningsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 4 },
    earningsValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
    durationPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(12,166,232,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    durationTxt: { fontSize: 14, fontWeight: '700', color: '#0ca6e8' },

    card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0d1629' },

    scheduleGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    scheduleItem: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
    scheduleLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
    scheduleVal: { fontSize: 14, fontWeight: '700', color: '#0d1629' },

    timeBlock: { backgroundColor: '#e0f4fd', borderRadius: 14, padding: 14 },
    timeLbl: { fontSize: 12, color: '#0ca6e8', fontWeight: '600', marginBottom: 4 },
    timeVal: { fontSize: 24, fontWeight: '800', color: '#0d1629' },
    timeChangedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
    timeChangedTxt: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 17 },

    vehicleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    vehicleEmoji: { fontSize: 36, marginTop: 2 },
    vehicleName: { fontSize: 16, fontWeight: '700', color: '#0d1629' },
    vehicleDetails: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    vehiclePlate: { fontSize: 13, color: '#0ca6e8', fontWeight: '600', marginTop: 2 },
    vehicleTypePill: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    vehicleTypeTxt: { fontSize: 12, fontWeight: '700', color: '#374151' },

    multiplierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e0f4fd', borderRadius: 10, padding: 10, marginBottom: 14 },
    multiplierTxt: { fontSize: 13, color: '#0ca6e8', flex: 1 },

    specialNotesBox: { backgroundColor: '#fffbeb', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#fde68a' },
    specialNotesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    specialNotesTitle: { fontSize: 14, fontWeight: '800', color: '#92400e' },
    specialNotesTxt: { fontSize: 15, color: '#78350f', lineHeight: 22 },
    noNotesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12 },
    noNotesTxt: { fontSize: 13, color: '#16a34a', fontWeight: '600' },

    addressLabel: { fontSize: 15, fontWeight: '700', color: '#0d1629', marginBottom: 4 },
    addressLine: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0ca6e8', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 12 },
    navBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

    customerName: { fontSize: 16, fontWeight: '600', color: '#0d1629', marginBottom: 10 },
    callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#bae6fd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
    callBtnTxt: { fontSize: 14, fontWeight: '600', color: '#0ca6e8' },

    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginBottom: 12 },
    startBtn: { backgroundColor: '#f59e0b' },
    completeBtn: { backgroundColor: '#16a34a' },
    actionBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
    completedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#dcfce7', borderRadius: 16, padding: 20 },
    completedTxt: { fontSize: 16, fontWeight: '700', color: '#16a34a' },
});