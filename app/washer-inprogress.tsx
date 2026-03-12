import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/services/apiClient';
import { useAuth } from '../context/AuthContext';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Linking, Platform,
    ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

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
        <View style={s.center}><ActivityIndicator size="large" color="#0ca6e8" /></View>
    );
    if (!booking) return (
        <View style={s.center}><Text style={{ color: '#ef4444' }}>Booking not found</Text></View>
    );

    const vehicleIcon = VEHICLE_TYPE_ICONS[booking.vehicle.type] || '🚗';
    const hasSpecialNotes = !!booking.notes?.trim();
    const timeChanged = booking.washerPreferredTime && booking.washerPreferredTime !== booking.scheduledTime;

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0d1629" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Job In Progress</Text>
                <View style={[s.statusPill, { backgroundColor: '#fffbeb' }]}>
                    <Ionicons name="construct" size={14} color="#f59e0b" />
                    <Text style={[s.statusPillTxt, { color: '#f59e0b' }]}>Active Job</Text>
                </View>
            </View>

            {/* Top quick actions & crucial info */}
            <View style={s.topBar}>
                <View style={s.topInfo}>
                    <Text style={s.topService}>{booking.service.name}</Text>
                    <Text style={s.topMeta}>
                        {formatDate(booking.scheduledDate)} · {fmt(booking.washerPreferredTime || booking.scheduledTime)}
                    </Text>
                    <Text numberOfLines={1} style={s.topAddress}>
                        {booking.address.label || booking.address.addressLine1}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Earnings banner */}
                <View style={s.earningsBanner}>
                    <View>
                        <Text style={s.earningsLabel}>Earnings for this Job</Text>
                        <Text style={s.earningsValue}>
                            {booking.paidWithSubscription
                                ? 'Subscription Job'
                                : `LKR ${booking.totalPrice.toLocaleString()}`}
                        </Text>
                    </View>
                    <View style={s.durationPill}>
                        <Ionicons name="time-outline" size={15} color="#0ca6e8" />
                        <Text style={s.durationTxt}>~{booking.duration} min</Text>
                    </View>
                </View>

                 {/* ── Quick Action Buttons (Contact and Directions) ── */}
                 <View style={s.quickActionsRow}>
                    <TouchableOpacity style={[s.quickActionBtn, s.contactBtn]} onPress={handleContactCustomer}>
                        <Ionicons name="call" size={20} color="#0ea5e9" />
                        <Text style={s.contactBtnTxt}>Contact Customer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[s.quickActionBtn, s.directionsBtn]} onPress={openNavigation}>
                        <Ionicons name="navigate" size={20} color="#16a34a" />
                        <Text style={s.directionsBtnTxt}>Get Directions</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Vehicle & Car Care Notes ── */}
                <View style={s.card}>
                    <CardTitle icon="car-sport" title="Vehicle" />

                    <View style={s.vehicleRow}>
                        <Text style={s.vehicleEmoji}>{vehicleIcon}</Text>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={s.vehicleName}>{booking.vehicle.nickname || `${booking.vehicle.make} ${booking.vehicle.model}`}</Text>
                            <Text style={s.vehicleDetails}>{booking.vehicle.make} {booking.vehicle.model} · {booking.vehicle.year} · {booking.vehicle.color}</Text>
                            <Text style={s.vehiclePlate}>{booking.vehicle.licensePlate}</Text>
                        </View>
                        <View style={s.vehicleTypePill}>
                            <Text style={s.vehicleTypeTxt}>{booking.vehicle.type}</Text>
                        </View>
                    </View>

                    {booking.priceBreakdown && booking.priceBreakdown.multiplier > 1.0 && (
                        <View style={s.multiplierRow}>
                            <Ionicons name="information-circle-outline" size={14} color="#0ca6e8" />
                            <Text style={s.multiplierTxt}>
                                {booking.vehicle.type} vehicle — {Math.round((booking.priceBreakdown.multiplier - 1) * 100)}% size surcharge applied
                            </Text>
                        </View>
                    )}

                    {/* Special instructions — prominent */}
                    {hasSpecialNotes ? (
                        <View style={s.specialNotesBox}>
                            <View style={s.specialNotesHeader}>
                                <Ionicons name="warning" size={18} color="#d97706" />
                                <Text style={s.specialNotesTitle}>⚠️ Special Instructions</Text>
                            </View>
                            <Text style={s.specialNotesTxt}>{booking.notes}</Text>
                        </View>
                    ) : (
                        <View style={s.noNotesRow}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                            <Text style={s.noNotesTxt}>No special instructions from customer</Text>
                        </View>
                    )}
                </View>

                {/* ── Location Details ── */}
                <View style={s.card}>
                    <CardTitle icon="location" title="Service Location" />
                    <Text style={s.addressLabel}>{booking.address.label}</Text>
                    <Text style={s.addressLine}>{booking.address.addressLine1}</Text>
                    {booking.address.addressLine2 && <Text style={s.addressLine}>{booking.address.addressLine2}</Text>}
                    <Text style={s.addressLine}>{booking.address.city}{booking.address.postalCode ? `, ${booking.address.postalCode}` : ''}</Text>
                </View>

                {/* ── Schedule ── */}
                <View style={s.card}>
                    <CardTitle icon="time" title="Schedule Information" />

                    <View style={s.scheduleGrid}>
                        <ScheduleItem label="Date" value={formatDate(booking.scheduledDate)} />
                        <ScheduleItem label="Service" value={booking.service.name} />
                    </View>

                    {/* Time display — show both if different */}
                    <View style={s.timeBlock}>
                        <Text style={s.timeLbl}>Agreed Arrival Time</Text>
                        <Text style={s.timeVal}>{fmt(booking.washerPreferredTime || booking.scheduledTime)}</Text>
                        {timeChanged && (
                            <View style={s.timeChangedRow}>
                                <Ionicons name="information-circle-outline" size={13} color="#6b7280" />
                                <Text style={s.timeChangedTxt}>Customer originally requested {fmt(booking.scheduledTime)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Action Buttons ── */}
                {!booking.arrivedAt && !booking.startedAt && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.arriveBtn]}
                        onPress={() => handleUpdateStatus('arrive', 'Confirm Arrival', "Have you arrived at the customer's location?", 'Customer notified you have arrived!')}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="location" size={24} color="#fff" /><Text style={s.actionBtnTxt}>I've Arrived</Text></>}
                    </TouchableOpacity>
                )}

                {booking.arrivedAt && !booking.startedAt && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.startBtn]}
                        onPress={() => handleUpdateStatus('start', 'Start Wash', 'Begin the washing process?', 'Started vehicle wash.')}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="play-circle" size={24} color="#fff" /><Text style={s.actionBtnTxt}>Start Wash</Text></>}
                    </TouchableOpacity>
                )}

                {booking.startedAt && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.completeBtn]}
                        onPress={() => handleUpdateStatus('complete', 'Complete Service', 'Are you done with the wash?', 'Service marked complete. Great job!')}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-done-circle" size={24} color="#fff" /><Text style={s.actionBtnTxt}>Finish Job & Complete Service</Text></>}
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function CardTitle({ icon, title }: { icon: string; title: string }) {
    return (
        <View style={s.cardTitleRow}>
            <Ionicons name={icon as any} size={18} color="#0ca6e8" />
            <Text style={s.cardTitle}>{title}</Text>
        </View>
    );
}

function ScheduleItem({ label, value }: { label: string; value: string }) {
    return (
        <View style={s.scheduleItem}>
            <Text style={s.scheduleLbl}>{label}</Text>
            <Text style={s.scheduleVal}>{value}</Text>
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
    topBar: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    topInfo: { flex: 1 },
    topService: { fontSize: 16, fontWeight: '700', color: '#0d1629' },
    topMeta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
    topAddress: { fontSize: 13, color: '#9ca3af', marginTop: 4, maxWidth: '100%' },
    scroll: { padding: 20, paddingBottom: 40 },

    earningsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1629', borderRadius: 18, padding: 20, marginBottom: 16 },
    earningsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 6 },
    earningsValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
    durationPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(12,166,232,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
    durationTxt: { fontSize: 15, fontWeight: '700', color: '#0ca6e8' },

    quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    contactBtn: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
    contactBtnTxt: { fontSize: 15, fontWeight: '700', color: '#0284c7' },
    directionsBtn: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
    directionsBtnTxt: { fontSize: 15, fontWeight: '700', color: '#16a34a' },

    card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0d1629' },

    scheduleGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    scheduleItem: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
    scheduleLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
    scheduleVal: { fontSize: 14, fontWeight: '700', color: '#0d1629' },

    timeBlock: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
    timeLbl: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
    timeVal: { fontSize: 22, fontWeight: '800', color: '#0d1629' },
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

    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 12 },
    arriveBtn: { backgroundColor: '#ea580c' },
    startBtn: { backgroundColor: '#f59e0b' },
    completeBtn: { backgroundColor: '#16a34a' },
    actionBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
