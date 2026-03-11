import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Platform, ScrollView,
    StyleSheet, Text, TouchableOpacity, View, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../services/apiClient';

interface JobRequest {
    id: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    totalPrice: number;
    currency: string;
    notes?: string;
    paidWithSubscription: boolean;
    priceBreakdown?: { basePrice: number; multiplier: number; totalPrice: number; vehicleType: string };
    service: { name: string; price: number; duration: number; currency: string; categoryId: string };
    vehicle: { make: string; model: string; year: number; color: string; licensePlate: string; nickname: string; type: string };
    address: { label: string; addressLine1: string; addressLine2?: string; city: string; postalCode?: string; country: string; location?: { latitude: number; longitude: number } };
    createdAt: any;
}

const TIME_SLOTS = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

function fmt(t: string) {
    const [h, m] = t.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const VEHICLE_TYPE_ICONS: Record<string, string> = {
    SUV: '🚙', Van: '🚐', Truck: '🛻', Sedan: '🚗', Hatchback: '🚗', Coupe: '🚗', Convertible: '🚗', Wagon: '🚗',
};

export default function WasherJobRequestScreen() {
    const { id: requestId } = useLocalSearchParams<{ id: string }>();
    const [request, setRequest] = useState<JobRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [declining, setDeclining] = useState(false);

    // Accept modal state
    const [acceptModalVisible, setAcceptModalVisible] = useState(false);
    const [preferredTime, setPreferredTime] = useState<string | null>(null);

    useEffect(() => {
        if (!requestId) { Alert.alert('Error', 'Job not found'); router.back(); return; }
        loadRequest();
    }, []);

    const loadRequest = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`/bookings/${requestId}`, {}, 'provider');
            if (res.success) {
                const job: JobRequest = res.data.booking;
                setRequest(job);
                setPreferredTime(job.scheduledTime); // default to customer's requested time
                if (job.status !== 'pending') {
                    Alert.alert('Job Unavailable', `This job has already been ${job.status}.`, [{ text: 'OK', onPress: () => router.back() }]);
                }
            } else {
                Alert.alert('Error', 'Job not found'); router.back();
            }
        } catch { Alert.alert('Error', 'Failed to load job details'); }
        finally { setLoading(false); }
    };

    const handleAcceptConfirm = async () => {
        if (!request || !preferredTime) return;
        setAcceptModalVisible(false);
        setAccepting(true);
        try {
            const res = await apiFetch(`/bookings/${requestId}/accept`, {
                method: 'PATCH',
                body: JSON.stringify({ preferredTime }),
            }, 'provider');

            if (res.success) {
                Alert.alert(
                    '🎉 Job Accepted!',
                    `You got the job! ${preferredTime !== request.scheduledTime ? `You've set your arrival for ${fmt(preferredTime)} (customer requested ${fmt(request.scheduledTime)}).` : `See you at ${fmt(preferredTime)}.`}`,
                    [{ text: 'View Job', onPress: () => router.replace({ pathname: '/washer-booking-details', params: { id: requestId } }) }]
                );
            } else {
                Alert.alert('Job Taken 😓', res.message || 'Another washer already accepted this job. Better luck next time!');
                router.back();
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to accept job');
        } finally { setAccepting(false); }
    };

    const handleDecline = () => {
        Alert.alert(
            'Decline Job',
            'Are you sure you want to skip this job request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        setDeclining(true);
                        try {
                            await apiFetch(`/bookings/${requestId}/reject`, {
                                method: 'PATCH',
                                body: JSON.stringify({ reason: 'Not available at this time' }),
                            }, 'provider');
                            Alert.alert('Declined', 'Job skipped.');
                            router.back();
                        } catch { Alert.alert('Error', 'Failed to decline job'); }
                        finally { setDeclining(false); }
                    },
                },
            ]
        );
    };

    const openNavigation = () => {
        if (!request?.address.location) { Alert.alert('No coordinates', 'Location coordinates unavailable for this address.'); return; }
        const { latitude, longitude } = request.address.location;
        const url = Platform.OS === 'ios'
            ? `maps://app?daddr=${latitude},${longitude}`
            : `google.navigation:q=${latitude},${longitude}`;
        Linking.openURL(url);
    };

    if (loading) return (
        <View style={s.center}><ActivityIndicator size="large" color="#0ca6e8" /><Text style={s.loadingTxt}>Loading job details...</Text></View>
    );
    if (!request) return (
        <View style={s.center}><Text style={{ color: '#ef4444' }}>Job not found</Text></View>
    );

    const vehicleIcon = VEHICLE_TYPE_ICONS[request.vehicle.type] || '🚗';
    const hasSpecialNotes = !!request.notes?.trim();
    const timeChanged = preferredTime && preferredTime !== request.scheduledTime;

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="close" size={26} color="#0d1629" /></TouchableOpacity>
                <Text style={s.headerTitle}>Job Request</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Race mode banner */}
                <View style={s.raceBanner}>
                    <View style={s.raceBannerLeft}>
                        <Text style={s.raceIcon}>🏁</Text>
                        <View>
                            <Text style={s.raceBannerTitle}>RACE MODE ACTIVE</Text>
                            <Text style={s.raceBannerSub}>First to accept wins this job!</Text>
                        </View>
                    </View>
                    <View style={s.racePulseDot} />
                </View>

                {/* Earnings card */}
                <View style={s.earningsCard}>
                    <View>
                        <Text style={s.earningsLabel}>You'll Earn</Text>
                        <Text style={s.earningsAmount}>
                            {request.paidWithSubscription
                                ? <Text style={{ color: '#16a34a' }}>Subscription Job</Text>
                                : `LKR ${request.totalPrice.toLocaleString()}`}
                        </Text>
                        {request.priceBreakdown && request.priceBreakdown.multiplier > 1.0 && (
                            <Text style={s.earningsNote}>Includes {request.vehicle.type} surcharge (+{Math.round((request.priceBreakdown.multiplier - 1) * 100)}%)</Text>
                        )}
                    </View>
                    <View style={s.durationPill}>
                        <Ionicons name="time-outline" size={16} color="#0ca6e8" />
                        <Text style={s.durationTxt}>~{request.duration} min</Text>
                    </View>
                </View>

                {/* ── Vehicle Details ── */}
                <View style={s.card}>
                    <View style={s.cardTitleRow}>
                        <Ionicons name="car-sport" size={18} color="#0ca6e8" />
                        <Text style={s.cardTitle}>Vehicle</Text>
                    </View>

                    <View style={s.vehicleMain}>
                        <Text style={s.vehicleEmoji}>{vehicleIcon}</Text>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={s.vehicleName}>{request.vehicle.nickname || `${request.vehicle.make} ${request.vehicle.model}`}</Text>
                            <Text style={s.vehicleDetails}>{request.vehicle.make} {request.vehicle.model} · {request.vehicle.year}</Text>
                        </View>
                    </View>

                    <View style={s.vehicleMetaGrid}>
                        <VehicleMeta icon="ellipse-outline" label="Type" value={request.vehicle.type} />
                        <VehicleMeta icon="color-palette-outline" label="Color" value={request.vehicle.color} />
                        <VehicleMeta icon="card-outline" label="Plate" value={request.vehicle.licensePlate} />
                    </View>

                    {/* Special car care notes */}
                    {hasSpecialNotes ? (
                        <View style={s.notesBox}>
                            <View style={s.notesHeader}>
                                <Ionicons name="warning" size={16} color="#d97706" />
                                <Text style={s.notesHeaderTxt}>Customer's Special Instructions</Text>
                            </View>
                            <Text style={s.notesTxt}>{request.notes}</Text>
                        </View>
                    ) : (
                        <View style={s.noNotesRow}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                            <Text style={s.noNotesTxt}>No special instructions from customer</Text>
                        </View>
                    )}
                </View>

                {/* ── Schedule ── */}
                <View style={s.card}>
                    <View style={s.cardTitleRow}>
                        <Ionicons name="calendar" size={18} color="#0ca6e8" />
                        <Text style={s.cardTitle}>Schedule</Text>
                    </View>
                    <View style={s.scheduleRow}>
                        <View style={s.scheduleItem}>
                            <Text style={s.scheduleLabel}>Date</Text>
                            <Text style={s.scheduleValue}>{formatDate(request.scheduledDate)}</Text>
                        </View>
                    </View>
                    <View style={s.scheduleRow}>
                        <View style={s.scheduleItem}>
                            <Text style={s.scheduleLabel}>Customer's Requested Time</Text>
                            <Text style={s.scheduleValue}>{fmt(request.scheduledTime)}</Text>
                        </View>
                    </View>
                    <View style={s.scheduleRow}>
                        <View style={s.scheduleItem}>
                            <Text style={s.scheduleLabel}>Service</Text>
                            <Text style={s.scheduleValue}>{request.service.name}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Location ── */}
                <View style={s.card}>
                    <View style={s.cardTitleRow}>
                        <Ionicons name="location" size={18} color="#0ca6e8" />
                        <Text style={s.cardTitle}>Service Location</Text>
                    </View>
                    <Text style={s.addressLabel}>{request.address.label}</Text>
                    <Text style={s.addressLine}>{request.address.addressLine1}</Text>
                    {request.address.addressLine2 && <Text style={s.addressLine}>{request.address.addressLine2}</Text>}
                    <Text style={s.addressLine}>{request.address.city}{request.address.postalCode ? `, ${request.address.postalCode}` : ''}</Text>
                    {request.address.location && (
                        <TouchableOpacity style={s.navBtn} onPress={openNavigation}>
                            <Ionicons name="navigate-outline" size={16} color="#0ca6e8" />
                            <Text style={s.navBtnTxt}>Open in Maps</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Action Buttons ── */}
                <View style={s.actionRow}>
                    <TouchableOpacity style={s.declineBtn} onPress={handleDecline} disabled={declining || accepting}>
                        {declining ? <ActivityIndicator color="#ef4444" /> : (
                            <><Ionicons name="close-circle-outline" size={20} color="#ef4444" /><Text style={s.declineTxt}>Skip</Text></>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={s.acceptBtn} onPress={() => setAcceptModalVisible(true)} disabled={accepting || declining}>
                        {accepting ? <ActivityIndicator color="#fff" /> : (
                            <><Ionicons name="flash" size={20} color="#fff" /><Text style={s.acceptTxt}>Accept Job</Text></>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Accept Modal: Preferred Time ── */}
            <Modal visible={acceptModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAcceptModalVisible(false)}>
                <View style={s.modalWrap}>
                    <View style={s.modalHead}>
                        <TouchableOpacity onPress={() => setAcceptModalVisible(false)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
                        <Text style={s.modalTitle}>Confirm Arrival Time</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView contentContainerStyle={s.modalScroll}>
                        {/* Job summary */}
                        <View style={s.modalSummary}>
                            <Text style={s.modalSummaryService}>{request.service.name}</Text>
                            <Text style={s.modalSummaryVehicle}>
                                {vehicleIcon} {request.vehicle.nickname || `${request.vehicle.make} ${request.vehicle.model}`} · {request.vehicle.licensePlate}
                            </Text>
                            <Text style={s.modalSummaryDate}>{formatDate(request.scheduledDate)}</Text>
                        </View>

                        {/* Customer's requested time callout */}
                        <View style={s.customerTimeRow}>
                            <Ionicons name="person-circle-outline" size={18} color="#6b7280" />
                            <Text style={s.customerTimeTxt}>Customer requested: <Text style={{ fontWeight: '700', color: '#0d1629' }}>{fmt(request.scheduledTime)}</Text></Text>
                        </View>

                        <Text style={s.modalSectionTitle}>Your Preferred Arrival Time</Text>
                        <Text style={s.modalSectionSub}>You can confirm the customer's time or pick a different slot. The customer will be notified.</Text>

                        <View style={s.timeGrid}>
                            {TIME_SLOTS.map(t => {
                                const isSel = preferredTime === t;
                                const isCustTime = t === request.scheduledTime;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[s.timeChip, isSel && s.timeChipSel, isCustTime && !isSel && s.timeChipCust]}
                                        onPress={() => setPreferredTime(t)}
                                    >
                                        <Text style={[s.timeChipTxt, isSel && s.timeChipSelTxt, isCustTime && !isSel && s.timeChipCustTxt]}>{fmt(t)}</Text>
                                        {isCustTime && <Text style={[s.timeChipBadge, isSel && { color: '#fff' }]}>requested</Text>}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Difference notice */}
                        {timeChanged && (
                            <View style={s.timeChangedNotice}>
                                <Ionicons name="information-circle-outline" size={16} color="#0ca6e8" />
                                <Text style={s.timeChangedTxt}>
                                    You're arriving at {fmt(preferredTime!)} instead of the customer's requested {fmt(request.scheduledTime)}. They'll be notified.
                                </Text>
                            </View>
                        )}

                        {/* Special notes reminder */}
                        {hasSpecialNotes && (
                            <View style={s.notesReminderBox}>
                                <Ionicons name="warning" size={16} color="#d97706" />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={s.notesReminderTitle}>Remember: Special Instructions</Text>
                                    <Text style={s.notesReminderTxt}>{request.notes}</Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity style={[s.confirmBtn, !preferredTime && s.confirmBtnDisabled]} onPress={handleAcceptConfirm} disabled={!preferredTime || accepting}>
                            {accepting ? <ActivityIndicator color="#fff" /> : (
                                <><Ionicons name="flash" size={20} color="#fff" /><Text style={s.confirmBtnTxt}>Accept & Set Arrival {preferredTime ? fmt(preferredTime) : ''}</Text></>
                            )}
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

function VehicleMeta({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={s.vehicleMetaItem}>
            <Ionicons name={icon as any} size={14} color="#9ca3af" />
            <Text style={s.vehicleMetaLabel}>{label}</Text>
            <Text style={s.vehicleMetaValue}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', gap: 10 },
    loadingTxt: { fontSize: 15, color: '#6b7280', marginTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    scroll: { padding: 20, paddingBottom: 40 },

    // Race banner
    raceBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1629', borderRadius: 16, padding: 16, marginBottom: 16 },
    raceBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    raceIcon: { fontSize: 28 },
    raceBannerTitle: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 1 },
    raceBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    racePulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e' },

    // Earnings
    earningsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: '#bae6fd' },
    earningsLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
    earningsAmount: { fontSize: 28, fontWeight: '800', color: '#0d1629' },
    earningsNote: { fontSize: 12, color: '#0ca6e8', marginTop: 4 },
    durationPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e0f4fd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    durationTxt: { fontSize: 14, fontWeight: '700', color: '#0ca6e8' },

    // Cards
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0d1629' },

    // Vehicle
    vehicleMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    vehicleEmoji: { fontSize: 40 },
    vehicleName: { fontSize: 17, fontWeight: '700', color: '#0d1629' },
    vehicleDetails: { fontSize: 13, color: '#6b7280', marginTop: 3 },
    vehicleMetaGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    vehicleMetaItem: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
    vehicleMetaLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
    vehicleMetaValue: { fontSize: 13, color: '#0d1629', fontWeight: '700', textAlign: 'center' },

    // Notes
    notesBox: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
    notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    notesHeaderTxt: { fontSize: 13, fontWeight: '700', color: '#92400e' },
    notesTxt: { fontSize: 14, color: '#78350f', lineHeight: 20 },
    noNotesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    noNotesTxt: { fontSize: 13, color: '#16a34a' },

    // Schedule
    scheduleRow: { marginBottom: 12 },
    scheduleItem: {},
    scheduleLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginBottom: 3 },
    scheduleValue: { fontSize: 15, fontWeight: '600', color: '#0d1629' },

    // Address
    addressLabel: { fontSize: 15, fontWeight: '700', color: '#0d1629', marginBottom: 4 },
    addressLine: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd', alignSelf: 'flex-start' },
    navBtnTxt: { fontSize: 14, color: '#0ca6e8', fontWeight: '600' },

    // Actions
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff' },
    declineTxt: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
    acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: '#0ca6e8' },
    acceptTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

    // Accept modal
    modalWrap: { flex: 1, backgroundColor: '#f8fafc' },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    modalScroll: { padding: 20, paddingBottom: 40 },

    modalSummary: { backgroundColor: '#e0f4fd', borderRadius: 16, padding: 18, marginBottom: 16 },
    modalSummaryService: { fontSize: 18, fontWeight: '800', color: '#0d1629', marginBottom: 4 },
    modalSummaryVehicle: { fontSize: 14, color: '#374151', marginBottom: 4 },
    modalSummaryDate: { fontSize: 13, color: '#6b7280' },

    customerTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    customerTimeTxt: { fontSize: 14, color: '#6b7280', flex: 1 },

    modalSectionTitle: { fontSize: 15, fontWeight: '700', color: '#0d1629', marginBottom: 4 },
    modalSectionSub: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 18 },

    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    timeChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    timeChipSel: { backgroundColor: '#0ca6e8', borderColor: '#0ca6e8' },
    timeChipCust: { borderColor: '#0ca6e8', borderWidth: 1.5 },
    timeChipTxt: { fontSize: 14, fontWeight: '600', color: '#374151' },
    timeChipSelTxt: { color: '#fff' },
    timeChipCustTxt: { color: '#0ca6e8' },
    timeChipBadge: { fontSize: 9, color: '#0ca6e8', fontWeight: '700', marginTop: 2 },

    timeChangedNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#e0f4fd', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#bae6fd' },
    timeChangedTxt: { flex: 1, fontSize: 13, color: '#0d1629', lineHeight: 18 },

    notesReminderBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#fde68a' },
    notesReminderTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 4 },
    notesReminderTxt: { fontSize: 13, color: '#78350f', lineHeight: 18 },

    confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0ca6e8', borderRadius: 16, paddingVertical: 18 },
    confirmBtnDisabled: { backgroundColor: '#d1d5db' },
    confirmBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
});