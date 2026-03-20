import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, ScrollView, StyleSheet,
    Text, TouchableOpacity, View, SafeAreaView, useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../services/apiClient';

interface BookingDetail {
    id: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    totalPrice: number;
    currency: string;
    paidWithSubscription: boolean;
    paymentPath: string;
    notes?: string;
    service: { name: string; duration: number };
    vehicle: { make: string; model: string; year: number; nickname: string; licensePlate: string; type: string };
    address: { label: string; addressLine1: string; city: string };
    priceBreakdown?: { basePrice: number; multiplier: number; totalPrice: number; vehicleType: string };
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

export default function BookingConfirmationScreen() {
    const { bookingId, path } = useLocalSearchParams<{ bookingId: string; path: string }>();
    const { width } = useWindowDimensions();
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { loadBooking(); }, []);

    const loadBooking = async () => {
        try {
            const res = await apiFetch(`/bookings/${bookingId}`, {}, 'customer');
            if (res.success) setBooking(res.data.booking);
        } catch { }
        finally {
            setLoading(false);
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]).start();
        }
    };

    const isSubscription = path === 'subscription';

    return (
        <SafeAreaView style={s.container}>
            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Success Icon */}
                <Animated.View style={[s.iconWrap, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
                    <View style={[s.iconCircle, {
                        backgroundColor: isSubscription ? '#dcfce7' : '#e0f4fd',
                        width: width * 0.32,
                        height: width * 0.32,
                        borderRadius: (width * 0.32) / 2,
                    }]}>
                        <Ionicons
                            name="checkmark-circle"
                            size={width * 0.18}
                            color={isSubscription ? '#16a34a' : '#0ca6e8'}
                        />
                    </View>
                </Animated.View>

                <Animated.View style={[s.content, { opacity: fadeAnim }]}>
                    <Text style={s.title}>Booking Confirmed!</Text>
                    <Text style={s.subtitle}>
                        {isSubscription
                            ? 'Your subscription wash has been booked. A washer will accept your job shortly.'
                            : 'Payment successful! A washer will accept your job shortly.'}
                    </Text>

                    {/* Payment badge */}
                    <View style={s.badgeRow}>
                        <View style={[s.badge, { backgroundColor: isSubscription ? '#dcfce7' : '#dbeafe' }]}>
                            <Ionicons
                                name={isSubscription ? 'refresh-circle' : 'card'}
                                size={14}
                                color={isSubscription ? '#16a34a' : '#2563eb'}
                            />
                            <Text style={[s.badgeTxt, { color: isSubscription ? '#16a34a' : '#2563eb' }]}>
                                {isSubscription ? 'Paid via Subscription' : 'Paid via PayHere'}
                            </Text>
                        </View>
                    </View>

                    {/* Booking detail card */}
                    {loading ? (
                        <View style={s.loadingCard}>
                            <ActivityIndicator color="#0ca6e8" />
                        </View>
                    ) : booking ? (
                        <View style={s.detailCard}>
                            <Text style={s.detailCardTitle}>Booking Summary</Text>

                            <DetailRow icon="construct-outline" label="Service" value={booking.service.name} />
                            <DetailRow icon="calendar-outline" label="Date" value={formatDate(booking.scheduledDate)} />
                            <DetailRow icon="time-outline" label="Time" value={fmt(booking.scheduledTime)} />
                            <DetailRow
                                icon="car-outline"
                                label="Vehicle"
                                value={booking.vehicle.nickname || `${booking.vehicle.make} ${booking.vehicle.model}`}
                                sub={`${booking.vehicle.type} · ${booking.vehicle.licensePlate}`}
                            />
                            <DetailRow
                                icon="location-outline"
                                label="Location"
                                value={booking.address.label}
                                sub={`${booking.address.addressLine1}, ${booking.address.city}`}
                            />

                            {/* Price breakdown */}
                            <View style={s.divider} />
                            {isSubscription ? (
                                <View style={s.priceRow}>
                                    <Text style={s.priceLbl}>Total Charged</Text>
                                    <Text style={[s.priceVal, { color: '#16a34a' }]}>FREE (Subscription)</Text>
                                </View>
                            ) : (
                                <>
                                    {booking.priceBreakdown && booking.priceBreakdown.multiplier > 1.0 && (
                                        <View style={s.priceRow}>
                                            <Text style={s.priceLbl}>Base price</Text>
                                            <Text style={s.priceVal}>LKR {booking.priceBreakdown.basePrice.toLocaleString()}</Text>
                                        </View>
                                    )}
                                    {booking.priceBreakdown && booking.priceBreakdown.multiplier > 1.0 && (
                                        <View style={s.priceRow}>
                                            <Text style={s.priceLbl}>{booking.priceBreakdown.vehicleType} surcharge</Text>
                                            <Text style={s.priceVal}>+LKR {(booking.priceBreakdown.totalPrice - booking.priceBreakdown.basePrice).toLocaleString()}</Text>
                                        </View>
                                    )}
                                    <View style={s.priceRow}>
                                        <Text style={s.priceTotalLbl}>Total Charged</Text>
                                        <Text style={s.priceTotalVal}>LKR {booking.totalPrice.toLocaleString()}</Text>
                                    </View>
                                </>
                            )}

                            {booking.notes && (
                                <>
                                    <View style={s.divider} />
                                    <View style={s.notesBox}>
                                        <Ionicons name="document-text-outline" size={14} color="#6b7280" />
                                        <Text style={s.notesTxt}>{booking.notes}</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    ) : null}

                    {/* What happens next */}
                    <View style={s.nextStepsCard}>
                        <Text style={s.nextStepsTitle}>What happens next?</Text>
                        <NextStep n={1} text="Nearby washers are notified about your booking right now." />
                        <NextStep n={2} text="The first available washer will accept your job." />
                        <NextStep n={3} text="You'll be notified once a washer is assigned." />
                        <NextStep n={4} text="Your washer arrives at the scheduled time." />
                    </View>

                    {/* Actions */}
                    <TouchableOpacity
                        style={s.primaryBtn}
                        onPress={() => router.replace({ pathname: '/booking-details', params: { id: bookingId } })}
                    >
                        <Ionicons name="eye-outline" size={20} color="#fff" />
                        <Text style={s.primaryBtnTxt}>Track My Booking</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.secondaryBtn}
                        onPress={() => router.replace('/customer-home' as any)}
                    >
                        <Text style={s.secondaryBtnTxt}>Back to Home</Text>
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function DetailRow({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
    return (
        <View style={s.detailRow}>
            <View style={s.detailIconWrap}>
                <Ionicons name={icon as any} size={16} color="#0ca6e8" />
            </View>
            <View style={s.detailRowText}>
                <Text style={s.detailLbl}>{label}</Text>
                <Text style={s.detailVal}>{value}</Text>
                {sub && <Text style={s.detailSub}>{sub}</Text>}
            </View>
        </View>
    );
}

function NextStep({ n, text }: { n: number; text: string }) {
    return (
        <View style={s.nextStepRow}>
            <View style={s.nextStepDot}>
                <Text style={s.nextStepNum}>{n}</Text>
            </View>
            <Text style={s.nextStepTxt}>{text}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },

    // Removed alignItems: 'center' — was clipping card widths and text
    scroll: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },

    iconWrap: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
    iconCircle: { justifyContent: 'center', alignItems: 'center' },

    // content block fills full width
    content: { width: '100%' },

    title: { fontSize: 26, fontWeight: '800', color: '#0d1629', textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 18 },

    badgeRow: { alignItems: 'center', marginBottom: 24 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    badgeTxt: { fontSize: 13, fontWeight: '700' },

    loadingCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 20 },

    detailCard: {
        width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20,
        marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    detailCardTitle: { fontSize: 16, fontWeight: '700', color: '#0d1629', marginBottom: 16 },

    detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    detailIconWrap: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: '#e0f4fd',
        justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2,
        flexShrink: 0,  // prevents icon from shrinking
    },
    detailRowText: { flex: 1 },  // ensures text fills remaining space and wraps correctly
    detailLbl: { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
    detailVal: { fontSize: 15, fontWeight: '600', color: '#0d1629' },
    detailSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },

    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },

    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    priceLbl: { fontSize: 14, color: '#6b7280' },
    priceVal: { fontSize: 14, fontWeight: '600', color: '#374151' },
    priceTotalLbl: { fontSize: 15, fontWeight: '700', color: '#0d1629' },
    priceTotalVal: { fontSize: 18, fontWeight: '800', color: '#0ca6e8' },

    notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
    notesTxt: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 18 },

    nextStepsCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20 },
    nextStepsTitle: { fontSize: 15, fontWeight: '700', color: '#0d1629', marginBottom: 14 },
    nextStepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    nextStepDot: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#0ca6e8',
        justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0,
    },
    nextStepNum: { fontSize: 13, fontWeight: '800', color: '#fff' },
    nextStepTxt: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 22, paddingTop: 4 },

    primaryBtn: {
        width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, backgroundColor: '#0ca6e8', borderRadius: 16, paddingVertical: 18, marginBottom: 12,
    },
    primaryBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
    secondaryBtn: { width: '100%', alignItems: 'center', paddingVertical: 14 },
    secondaryBtnTxt: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
});