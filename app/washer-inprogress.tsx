import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/services/apiClient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Linking, Platform,
    ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import DamageReportUploader from './damageReportUploader';

interface AcceptedBooking {
    id: string;
    status: 'in_progress';
    scheduledDate: string;
    scheduledTime: string;        // customer's original requested time
    washerPreferredTime?: string; // washer's accepted arrival time
    arrivedAt?: string;
    startedAt?: string;
    completedAt?: string;
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
    damageReportPhotos?: string[];
    damageReportUploadedAt?: string;
    createdAt: any;
}

function fmt(t: string) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(d: string) {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });
}

const VEHICLE_TYPE_ICONS: Record<string, string> = {
    SUV: '🚙', Van: '🚐', Truck: '🛻',
    Sedan: '🚗', Hatchback: '🚗', Coupe: '🚗', Convertible: '🚗', Wagon: '🚗',
};

export default function WasherInProgressScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { logout } = useAuth();
    const { id: bookingId } = useLocalSearchParams<{ id: string }>();
    const [booking, setBooking] = useState<AcceptedBooking | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!bookingId) { router.back(); return; }
        loadBooking();
    }, [bookingId]);

    const loadBooking = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`/bookings/${bookingId}`, {}, 'provider');
            if (res.success) {
                setBooking(res.booking);
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

    const handleUpdateStatus = (action: 'arrive' | 'start' | 'complete', title: string, desc: string, successMsg: string) => {
        Alert.alert(
            title,
            desc,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            // Some endpoints may use status instead of explicit action names
                            let res;
                            if (action === 'arrive') res = await apiFetch(`/bookings/${bookingId}/arrive`, { method: 'PATCH' }, 'provider');
                            else if (action === 'start') res = await apiFetch(`/bookings/${bookingId}/start`, { method: 'PATCH' }, 'provider');
                            else res = await apiFetch(`/bookings/${bookingId}/complete`, { method: 'PATCH' }, 'provider');

                            if (res.success) {
                                Alert.alert('Success', successMsg, [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            if (action === 'complete') {
                                                router.replace('/washer-home' as Href);
                                            } else {
                                                loadBooking();
                                            }
                                        },
                                    },
                                ]);
                            } else {
                                Alert.alert('Notice', res.message || `Failed to update status to ${action}. Trying generic status update...`);
                                // Fallback implementation if specific endpoints aren't available
                                try {
                                    const fallbackRes = await apiFetch(`/bookings/${bookingId}`, { 
                                        method: 'PATCH', 
                                        body: JSON.stringify({ 
                                            [action === 'arrive' ? 'arrivedAt' : action === 'start' ? 'startedAt' : 'status']: action === 'complete' ? 'completed' : new Date().toISOString() 
                                        }) 
                                    }, 'provider');
                                    if (fallbackRes.success) {
                                         if (action === 'complete') router.replace('/washer-home' as Href);
                                         else loadBooking();
                                    } else {
                                        Alert.alert('Error', fallbackRes.message || 'Failed to update booking status.');
                                    }
                                } catch (e: any) {
                                    Alert.alert('Error', e.message);
                                }
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

    const handleContactCustomer = () => {
        if (booking?.customer?.phone) {
             Linking.openURL(`tel:${booking.customer.phone}`);
        } else {
             Alert.alert('No Phone Number', 'The customer has not provided a contact number.');
        }
    }

    if (loading) return (
        <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></View>
    );
    if (!booking) return (
        <View style={[s.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.error }}>Booking not found</Text></View>
    );

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
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Job In Progress</Text>
                <View style={[s.statusPill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb' }]}>
                    <Ionicons name="construct" size={14} color="#f59e0b" />
                    <Text style={[s.statusPillTxt, { color: '#f59e0b' }]}>Active Job</Text>
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
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Earnings banner */}
                <View style={[s.earningsBanner, { backgroundColor: colors.cardBackground }]}>
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

                 {/* ── Quick Action Buttons (Contact and Directions) ── */}
                 <View style={s.quickActionsRow}>
                     <TouchableOpacity style={[s.quickActionBtn, s.contactBtn, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe', borderColor: colors.border }]} onPress={handleContactCustomer}>
                        <Ionicons name="call" size={20} color={(colors as any).info || '#0ea5e9'} />
                        <Text style={[s.contactBtnTxt, { color: (colors as any).info || '#0ea5e9' }]}>Contact Customer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[s.quickActionBtn, s.directionsBtn, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#dcfce7', borderColor: colors.border }]} onPress={openNavigation}>
                        <Ionicons name="navigate" size={20} color={colors.success || '#16a34a'} />
                        <Text style={[s.directionsBtnTxt, { color: colors.success || '#16a34a' }]}>Get Directions</Text>
                    </TouchableOpacity>
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
                                <Text style={[s.specialNotesTitle, { color: colors.warning }]}>⚠️ Special Instructions</Text>
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

                {/* ── Location Details ── */}
                <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                    <CardTitle icon="location" title="Service Location" colors={colors} />
                    <Text style={[s.addressLabel, { color: colors.textPrimary }]}>{booking.address.label}</Text>
                    <Text style={[s.addressLine, { color: colors.textSecondary }]}>{booking.address.addressLine1}</Text>
                    {booking.address.addressLine2 && <Text style={[s.addressLine, { color: colors.textSecondary }]}>{booking.address.addressLine2}</Text>}
                    <Text style={[s.addressLine, { color: colors.textSecondary }]}>{booking.address.city}{booking.address.postalCode ? `, ${booking.address.postalCode}` : ''}</Text>
                </View>

                {/* ── Schedule ── */}
                <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                    <CardTitle icon="time" title="Schedule Information" colors={colors} />

                    <View style={s.scheduleGrid}>
                        <ScheduleItem label="Date" value={formatDate(booking.scheduledDate)} colors={colors} />
                        <ScheduleItem label="Service" value={booking.service.name} colors={colors} />
                    </View>

                    {/* Time display — show both if different */}
                    <View style={[s.timeBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[s.timeLbl, { color: colors.textSecondary }]}>Agreed Arrival Time</Text>
                        <Text style={[s.timeVal, { color: colors.textPrimary }]}>{fmt(booking.washerPreferredTime || booking.scheduledTime)}</Text>
                        {timeChanged && (
                            <View style={s.timeChangedRow}>
                                <Ionicons name="information-circle-outline" size={13} color={colors.textSecondary} />
                                <Text style={[s.timeChangedTxt, { color: colors.textSecondary }]}>Customer originally requested {fmt(booking.scheduledTime)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Action Buttons ── */}
                {booking && (
                    <DamageReportUploader
                        bookingId={bookingId}
                        existingPhotos={booking.damageReportPhotos || []}
                        onSaved={loadBooking}
                        colors={colors}
                        isDark={isDark}
                    />
                )}

                {!booking.arrivedAt && !booking.startedAt && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.arriveBtn, { backgroundColor: colors.accent }]}
                        onPress={() => handleUpdateStatus('arrive', 'Confirm Arrival', "Have you arrived at the customer's location?", 'Customer notified you have arrived!')}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="location" size={24} color="#fff" /><Text style={[s.actionBtnTxt, { color: '#fff' }]}>I've Arrived</Text></>}
                    </TouchableOpacity>
                )}

                {booking.arrivedAt && !booking.startedAt && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.startBtn, { backgroundColor: colors.warning || '#f59e0b' }]}
                        onPress={() => handleUpdateStatus('start', 'Start Wash', 'Begin the washing process?', 'Started vehicle wash.')}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="play-circle" size={24} color="#fff" /><Text style={[s.actionBtnTxt, { color: '#fff' }]}>Start Wash</Text></>}
                    </TouchableOpacity>
                )}

                {booking.startedAt && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.completeBtn, { backgroundColor: colors.success || '#16a34a' }]}
                        onPress={() => handleUpdateStatus('complete', 'Complete Service', 'Are you done with the wash?', 'Service marked complete. Great job!')}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-done-circle" size={24} color="#fff" /><Text style={[s.actionBtnTxt, { color: '#fff' }]}>Finish Job & Complete Service</Text></>}
                    </TouchableOpacity>
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
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 10, paddingHorizontal: 20, borderBottomWidth: 1 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    statusPillTxt: { fontSize: 12, fontWeight: '700' },
    topBar: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    topInfo: { flex: 1 },
    topService: { fontSize: 16, fontWeight: '700' },
    topMeta: { fontSize: 13, marginTop: 4 },
    topAddress: { fontSize: 13, marginTop: 4, maxWidth: '100%' },
    scroll: { padding: 20, paddingBottom: 40 },

    earningsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, padding: 20, marginBottom: 16 },
    earningsLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    earningsValue: { fontSize: 26, fontWeight: '800' },
    durationPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
    durationTxt: { fontSize: 15, fontWeight: '700' },

    quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    contactBtn: { },
    contactBtnTxt: { fontSize: 15, fontWeight: '700' },
    directionsBtn: { },
    directionsBtnTxt: { fontSize: 15, fontWeight: '700' },

    card: { borderRadius: 18, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '700' },

    scheduleGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    scheduleItem: { flex: 1, borderRadius: 12, padding: 12 },
    scheduleLbl: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    scheduleVal: { fontSize: 14, fontWeight: '700' },

    timeBlock: { borderRadius: 14, padding: 14, borderWidth: 1 },
    timeLbl: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    timeVal: { fontSize: 22, fontWeight: '800' },
    timeChangedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
    timeChangedTxt: { flex: 1, fontSize: 12, lineHeight: 17 },

    vehicleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    vehicleEmoji: { fontSize: 36, marginTop: 2 },
    vehicleName: { fontSize: 16, fontWeight: '700' },
    vehicleDetails: { fontSize: 13, marginTop: 2 },
    vehiclePlate: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    vehicleTypePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    vehicleTypeTxt: { fontSize: 12, fontWeight: '700' },

    multiplierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, marginBottom: 14 },
    multiplierTxt: { fontSize: 13, flex: 1 },

    specialNotesBox: { borderRadius: 14, padding: 16, borderWidth: 1.5 },
    specialNotesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    specialNotesTitle: { fontSize: 14, fontWeight: '800' },
    specialNotesTxt: { fontSize: 15, lineHeight: 22 },
    noNotesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
    noNotesTxt: { fontSize: 13, fontWeight: '600' },

    addressLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    addressLine: { fontSize: 14, marginBottom: 2 },

    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 12 },
    arriveBtn: { },
    startBtn: { },
    completeBtn: { },
    actionBtnTxt: { fontSize: 16, fontWeight: '800' },
});
