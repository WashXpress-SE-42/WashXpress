import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import PayHere from '@/utils/Payhere';
import { useTheme } from '../context/ThemeContext';

interface Service { id: string; name: string; price: number; currency: string; duration: number; categoryId: string; }
interface Vehicle { id: string; make: string; model: string; year: number; color: string; licensePlate: string; nickname: string; type: string; }
interface Address { id: string; label: string; addressLine1: string; addressLine2?: string; city: string; postalCode?: string; country: string; isDefault?: boolean; }
interface Subscription { id: string; planName: string; remainingWashes: number; totalWashes: number; status: string; vehicleId: string; }
interface PriceBreakdown { basePrice: number; multiplier: number; totalPrice: number; vehicleType: string; }
type PaymentPath = 'subscription' | 'one_time' | null;

const TIME_SLOTS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const MULTIPLIERS: Record<string, number> = { Sedan: 1.0, Hatchback: 1.0, Coupe: 1.0, Convertible: 1.1, Wagon: 1.2, SUV: 1.3, Van: 1.4, Truck: 1.5 };

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
function fmt(t: string) { const [h, m] = t.split(':').map(Number); return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }
function next7() { return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }); }

function Step({ n, label, colors }: { n: number; label: any; colors: any }) {
    return (
        <View style={s.stepRow}>
            <View style={[s.stepDot, { backgroundColor: colors.accent }]}><Text style={s.stepNum}>{n}</Text></View>
            <Text style={[s.stepLabel, { color: colors.textPrimary }]}>{label}</Text>
        </View>
    );
}

function PickerModal({ visible, title, onClose, children, colors }: any) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[s.modalWrap, { backgroundColor: colors.background }]}>
                <View style={[s.modalHead, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                    <Text style={[s.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
                    <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>{children}</ScrollView>
            </View>
        </Modal>
    );
}

export default function CreateBookingScreen() {
    const { colors, isDark } = useTheme();
    const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
    const [service, setService] = useState<Service | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [paymentPath, setPaymentPath] = useState<PaymentPath>(null);
    const [notes, setNotes] = useState('');
    const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [vehicleModal, setVehicleModal] = useState(false);
    const [addressModal, setAddressModal] = useState(false);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        try {
            setLoading(true);
            const [svcRes, vRes, aRes] = await Promise.all([
                apiFetch(`/services/${serviceId}`, {}, 'customer'),
                apiFetch('/vehicles', {}, 'customer'),
                apiFetch('/addresses', {}, 'customer'),
            ]);
            if (svcRes.success) setService(svcRes.data.service);
            if (vRes.success) {
                const vList: Vehicle[] = vRes.data.vehicles || [];
                setVehicles(vList);
                if (vList[0]) { setSelectedVehicle(vList[0]); checkSub(vList[0].id); }
            }
            if (aRes.success) {
                const aList: Address[] = aRes.data.addresses || [];
                setAddresses(aList);
                setSelectedAddress(aList.find(a => a.isDefault) || aList[0] || null);
            }
        } catch { Alert.alert('Error', 'Failed to load booking details.'); }
        finally { setLoading(false); }
    };

    const checkSub = useCallback(async (vehicleId: string) => {
        try {
            const res = await apiFetch(`/subscriptions?vehicleId=${vehicleId}&status=active`, {}, 'customer');
            const sub = res.data?.subscriptions?.[0];
            if (sub?.remainingWashes > 0) { setSubscription(sub); setPaymentPath('subscription'); }
            else { setSubscription(null); setPaymentPath('one_time'); }
        } catch { setSubscription(null); setPaymentPath('one_time'); }
    }, []);

    useEffect(() => {
        if (!service || !selectedVehicle) return;
        const multiplier = MULTIPLIERS[selectedVehicle.type] ?? 1.0;
        setPriceBreakdown({ basePrice: service.price, multiplier, totalPrice: Math.round(service.price * multiplier), vehicleType: selectedVehicle.type });
    }, [service, selectedVehicle]);

    const handleVehicleSelect = async (v: Vehicle) => {
        setSelectedVehicle(v); setVehicleModal(false); setSubscription(null); setPaymentPath(null);
        await checkSub(v.id);
    };

    const handleBook = async () => {
        if (!service || !selectedVehicle || !selectedAddress || !selectedTime || !paymentPath) {
            Alert.alert('Incomplete', 'Please complete all required fields.'); return;
        }
        paymentPath === 'subscription' ? bookWithSub() : bookWithPayment();
    };

    const bookWithSub = async () => {
        setSubmitting(true);
        try {
            const res = await apiFetch('/bookings', {
                method: 'POST',
                body: JSON.stringify({ serviceId: service!.id, vehicleId: selectedVehicle!.id, addressId: selectedAddress!.id, scheduledDate: toDateStr(selectedDate), scheduledTime: selectedTime, notes: notes.trim() || undefined, paymentPath: 'subscription', subscriptionId: subscription!.id }),
            }, 'customer');
            if (res.success) router.replace({ pathname: '/booking-confirmation', params: { bookingId: res.data.booking.id, path: 'subscription' } });
            else Alert.alert('Error', res.message || 'Failed to create booking.');
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSubmitting(false); }
    };

    const bookWithPayment = async () => {
        if (!priceBreakdown) return;
        setSubmitting(true);
        try {
            const bookingRes = await apiFetch('/bookings', {
                method: 'POST',
                body: JSON.stringify({ serviceId: service!.id, vehicleId: selectedVehicle!.id, addressId: selectedAddress!.id, scheduledDate: toDateStr(selectedDate), scheduledTime: selectedTime, notes: notes.trim() || undefined, paymentPath: 'one_time' }),
            }, 'customer');
            if (!bookingRes.success) { Alert.alert('Error', bookingRes.message); setSubmitting(false); return; }
            const bookingId = bookingRes.data.booking.id;

            const hashRes = await apiFetch('/payments/hash', {
                method: 'POST',
                body: JSON.stringify({ bookingId, amount: priceBreakdown.totalPrice, currency: service!.currency || 'LKR' }),
            }, 'customer');
            if (!hashRes.success) { Alert.alert('Error', 'Failed to initiate payment.'); setSubmitting(false); return; }

            const p = hashRes.data;
            PayHere.startPayment(
                { sandbox: true, merchant_id: p.merchantId, notify_url: p.notifyUrl, order_id: bookingId, items: service!.name, amount: String(priceBreakdown.totalPrice), currency: service!.currency || 'LKR', first_name: p.firstName || '', last_name: p.lastName || '', email: p.email || '', phone: p.phone || '', address: selectedAddress!.addressLine1, city: selectedAddress!.city, country: 'Sri Lanka', custom_1: bookingId, custom_2: '', hash: p.hash },
                () => { setSubmitting(false); router.replace({ pathname: '/booking-confirmation', params: { bookingId, path: 'one_time' } }); },
                (err: string) => { setSubmitting(false); Alert.alert('Payment Failed', err); },
                () => { setSubmitting(false); Alert.alert('Cancelled', 'Payment was cancelled. Your booking is held for 10 minutes.'); },
            );
        } catch (e: any) { Alert.alert('Error', e.message); setSubmitting(false); }
    };

    const canBook = !!selectedVehicle && !!selectedAddress && !!selectedTime && !!paymentPath;

    if (loading) return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></View>;
    if (!service) return (
        <View style={[s.center, { backgroundColor: colors.background }]}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={{ color: colors.error, marginTop: 8, fontSize: 16 }}>Service not found</Text>
            <TouchableOpacity onPress={() => router.back()} style={[s.retryBtn, { backgroundColor: colors.accent }]}><Text style={s.retryTxt}>Go Back</Text></TouchableOpacity>
        </View>
    );

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></TouchableOpacity>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Book Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Service card */}
                <View style={[s.serviceCard, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#e0f4fd', borderColor: isDark ? colors.accent : '#bae6fd' }]}>
                    <View style={[s.serviceIconCircle, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.2)' : '#bae6fd' }]}><Ionicons name="car-sport" size={28} color={colors.accent} /></View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[s.serviceName, { color: colors.textPrimary }]}>{service.name}</Text>
                        <View style={s.serviceMeta}>
                            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                            <Text style={[s.serviceMetaTxt, { color: colors.accent }]}>{service.duration} min · Base LKR {service.price.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Step 1: Vehicle */}
                <Step n={1} label="Select Vehicle" colors={colors} />
                <TouchableOpacity style={[s.selectCard, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]} onPress={() => setVehicleModal(true)}>
                    {selectedVehicle ? (
                        <View style={s.selectInner}>
                            <View style={[s.selectIcon, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#e0f4fd' }]}><Ionicons name="car" size={22} color={colors.accent} /></View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[s.selectPrimary, { color: colors.textPrimary }]}>{selectedVehicle.nickname || `${selectedVehicle.make} ${selectedVehicle.model}`}</Text>
                                <Text style={[s.selectSecondary, { color: colors.textSecondary }]}>{selectedVehicle.type} · {selectedVehicle.year} · {selectedVehicle.licensePlate}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </View>
                    ) : (
                        <View style={s.selectInner}>
                            <Ionicons name="add-circle-outline" size={22} color={colors.textSecondary} />
                            <Text style={[s.selectSecondary, { marginLeft: 10, color: colors.textSecondary }]}>Tap to select a vehicle</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {priceBreakdown && priceBreakdown.multiplier > 1.0 && (
                    <View style={[s.notice, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', borderColor: isDark ? colors.warning : '#fde68a' }]}>
                        <Ionicons name="information-circle-outline" size={14} color={isDark ? colors.warning : '#92400e'} />
                        <Text style={[s.noticeTxt, { color: isDark ? colors.warning : '#92400e' }]}>{priceBreakdown.vehicleType} pricing: +{Math.round((priceBreakdown.multiplier - 1) * 100)}% on base price</Text>
                    </View>
                )}

                {/* Step 2: Payment */}
                <Step n={2} label="How to Pay?" colors={colors} />
                <TouchableOpacity style={[s.payCard, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, paymentPath === 'subscription' && { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(12, 166, 232, 0.05)' : '#f0faff' }, !subscription && { backgroundColor: isDark ? colors.background : '#fafafa' }]} onPress={() => subscription && setPaymentPath('subscription')} activeOpacity={subscription ? 0.7 : 1}>
                    <View style={s.payCardRow}>
                        <View style={[s.radio, { borderColor: colors.divider }, paymentPath === 'subscription' && { borderColor: colors.accent }]}>{paymentPath === 'subscription' && <View style={[s.radioDot, { backgroundColor: colors.accent }]} />}</View>
                        <View style={[s.payIconCircle, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.1)' : '#f0fdf4' }]}><Ionicons name="refresh-circle" size={22} color={subscription ? colors.success : colors.textSecondary} /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={s.payTitleRow}>
                                <Text style={[s.payTitle, { color: colors.textPrimary }, !subscription && { color: colors.textSecondary }]}>Subscription Wash</Text>
                                {subscription && <View style={[s.freeBadge, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7' }]}><Text style={[s.freeBadgeText, { color: colors.success }]}>FREE</Text></View>}
                            </View>
                            <Text style={[s.paySub, { color: colors.textSecondary }, !subscription && { color: colors.textSecondary, opacity: 0.5 }]}>
                                {subscription ? `${subscription.planName} · ${subscription.remainingWashes} wash${subscription.remainingWashes !== 1 ? 'es' : ''} left` : 'No active subscription for this vehicle'}
                            </Text>
                        </View>
                    </View>
                    {!subscription && (
                        <View style={[s.noSubRow, { borderTopColor: colors.divider }]}>
                            <Text style={[s.noSubTxt, { color: colors.textSecondary }]}>No subscription for this vehicle. </Text>
                            <TouchableOpacity onPress={() => router.push('/subscriptions' as any)}><Text style={[s.noSubLink, { color: colors.accent }]}>Get one →</Text></TouchableOpacity>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={[s.payCard, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, paymentPath === 'one_time' && { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(12, 166, 232, 0.05)' : '#f0faff' }]} onPress={() => setPaymentPath('one_time')}>
                    <View style={s.payCardRow}>
                        <View style={[s.radio, { borderColor: colors.divider }, paymentPath === 'one_time' && { borderColor: colors.accent }]}>{paymentPath === 'one_time' && <View style={[s.radioDot, { backgroundColor: colors.accent }]} />}</View>
                        <View style={[s.payIconCircle, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff' }]}><Ionicons name="card" size={22} color={colors.accent} /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={s.payTitleRow}>
                                <Text style={[s.payTitle, { color: colors.textPrimary }]}>One-Time Payment</Text>
                                <View style={[s.freeBadge, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe' }]}><Text style={[s.freeBadgeText, { color: colors.accent }]}>CARD / BANK</Text></View>
                            </View>
                            <Text style={[s.paySub, { color: colors.textSecondary }]}>{priceBreakdown ? `LKR ${priceBreakdown.totalPrice.toLocaleString()} via PayHere` : `LKR ${service.price.toLocaleString()} via PayHere`}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Step 3: Date */}
                <Step n={3} label="Select Date" colors={colors} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateRow}>
                    {next7().map(d => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        const isSel = d.toDateString() === selectedDate.toDateString();
                        return (
                            <TouchableOpacity key={d.toDateString()} style={[s.dateChip, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, isSel && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => setSelectedDate(d)}>
                                <Text style={[s.dateDow, { color: colors.textSecondary }, isSel && s.dateSelTxt]}>{isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                                <Text style={[s.dateNum, { color: colors.textPrimary }, isSel && s.dateSelTxt]}>{d.getDate()}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Step 4: Time */}
                <Step n={4} label="Preferred Time" colors={colors} />
                <View style={s.timeGrid}>
                    {TIME_SLOTS.map(t => {
                        const isSel = selectedTime === t;
                        return (
                            <TouchableOpacity key={t} style={[s.timeChip, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, isSel && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => setSelectedTime(t)}>
                                <Text style={[s.timeChipTxt, { color: colors.textPrimary }, isSel && s.timeChipSelTxt]}>{fmt(t)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Step 5: Address */}
                <Step n={5} label="Service Location" colors={colors} />
                <TouchableOpacity style={[s.selectCard, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]} onPress={() => setAddressModal(true)}>
                    {selectedAddress ? (
                        <View style={s.selectInner}>
                            <View style={[s.selectIcon, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#e0f4fd' }]}><Ionicons name="location" size={20} color={colors.accent} /></View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[s.selectPrimary, { color: colors.textPrimary }]}>{selectedAddress.label}</Text>
                                <Text style={[s.selectSecondary, { color: colors.textSecondary }]} numberOfLines={1}>{selectedAddress.addressLine1}, {selectedAddress.city}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </View>
                    ) : (
                        <View style={s.selectInner}>
                            <Ionicons name="add-circle-outline" size={22} color={colors.textSecondary} />
                            <Text style={[s.selectSecondary, { marginLeft: 10, color: colors.textSecondary }]}>Tap to select a location</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Step 6: Notes */}
                <Step n={6} label={<View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={[s.stepLabel, { color: colors.textPrimary }]}>Special Instructions </Text><Text style={s.optional}>(optional)</Text></View>} colors={colors} />
                <View style={[s.notesBox, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}>
                    <TextInput style={[s.notesInput, { color: colors.textPrimary }]} multiline numberOfLines={3} placeholder="e.g. Gate code, avoid the spoiler, scratch on rear bumper — please be careful..." placeholderTextColor={colors.textSecondary} value={notes} onChangeText={setNotes} textAlignVertical="top" />
                </View>

                {/* Price Summary */}
                {paymentPath && priceBreakdown && (
                    <View style={[s.priceSummary, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}>
                        <Text style={[s.priceSummaryTitle, { color: colors.textPrimary }]}>Price Summary</Text>
                        <View style={s.priceRow}><Text style={[s.priceLabel, { color: colors.textSecondary }]}>{service.name}</Text><Text style={[s.priceVal, { color: colors.textPrimary }]}>LKR {priceBreakdown.basePrice.toLocaleString()}</Text></View>
                        {priceBreakdown.multiplier > 1.0 && (
                            <View style={s.priceRow}><Text style={[s.priceLabel, { color: colors.textSecondary }]}>{priceBreakdown.vehicleType} surcharge</Text><Text style={[s.priceVal, { color: colors.textPrimary }]}>+LKR {(priceBreakdown.totalPrice - priceBreakdown.basePrice).toLocaleString()}</Text></View>
                        )}
                        {paymentPath === 'subscription' && (
                            <View style={s.priceRow}><Text style={[s.priceLabel, { color: colors.success }]}>Subscription discount</Text><Text style={[s.priceVal, { color: colors.success }]}>-LKR {priceBreakdown.totalPrice.toLocaleString()}</Text></View>
                        )}
                        <View style={[s.priceDivider, { backgroundColor: colors.divider }]} />
                        <View style={s.priceRow}>
                            <Text style={[s.priceTotalLabel, { color: colors.textPrimary }]}>Total</Text>
                            <Text style={[s.priceTotalVal, { color: paymentPath === 'subscription' ? colors.success : colors.accent }]}>{paymentPath === 'subscription' ? 'FREE' : `LKR ${priceBreakdown.totalPrice.toLocaleString()}`}</Text>
                        </View>
                        {paymentPath === 'subscription' && <Text style={[s.subNote, { color: colors.success }]}>1 wash deducted from your {subscription?.planName} plan</Text>}
                    </View>
                )}

                {/* CTA */}
                <TouchableOpacity style={[s.bookBtn, { backgroundColor: colors.accent }, (!canBook || submitting) && [s.bookBtnDisabled, { backgroundColor: colors.divider }]]} onPress={handleBook} disabled={!canBook || submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Ionicons name={paymentPath === 'subscription' ? 'checkmark-circle' : 'card'} size={20} color="#fff" />
                            <Text style={s.bookBtnTxt}>{paymentPath === 'subscription' ? 'Confirm Booking (Free)' : `Pay LKR ${priceBreakdown?.totalPrice.toLocaleString() ?? ''} & Book`}</Text>
                        </>
                    )}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Vehicle Modal */}
            <PickerModal visible={vehicleModal} title="Select Vehicle" onClose={() => setVehicleModal(false)} colors={colors}>
                {vehicles.length === 0 ? (
                    <View style={s.modalEmpty}>
                        <Ionicons name="car-outline" size={40} color={colors.textSecondary} />
                        <Text style={[s.modalEmptyTxt, { color: colors.textSecondary }]}>No vehicles added</Text>
                        <TouchableOpacity style={[s.modalEmptyBtn, { backgroundColor: colors.accent }]} onPress={() => { setVehicleModal(false); router.push('/vehicles' as any); }}><Text style={s.modalEmptyBtnTxt}>Add Vehicle</Text></TouchableOpacity>
                    </View>
                ) : vehicles.map(v => (
                    <TouchableOpacity key={v.id} style={[s.modalItem, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, selectedVehicle?.id === v.id && { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(12, 166, 232, 0.05)' : '#f0faff' }]} onPress={() => handleVehicleSelect(v)}>
                        <View style={[s.modalItemIcon, { backgroundColor: colors.divider }]}><Ionicons name="car" size={22} color={selectedVehicle?.id === v.id ? colors.accent : colors.textSecondary} /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[s.modalItemPrimary, { color: colors.textPrimary }]}>{v.nickname || `${v.make} ${v.model}`}</Text>
                            <Text style={[s.modalItemSec, { color: colors.textSecondary }]}>{v.type} · {v.year} · {v.licensePlate}</Text>
                        </View>
                        {selectedVehicle?.id === v.id && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
                    </TouchableOpacity>
                ))}
            </PickerModal>

            {/* Address Modal */}
            <PickerModal visible={addressModal} title="Service Location" onClose={() => setAddressModal(false)} colors={colors}>
                {addresses.length === 0 ? (
                    <View style={s.modalEmpty}>
                        <Ionicons name="location-outline" size={40} color={colors.textSecondary} />
                        <Text style={[s.modalEmptyTxt, { color: colors.textSecondary }]}>No addresses saved</Text>
                        <TouchableOpacity style={[s.modalEmptyBtn, { backgroundColor: colors.accent }]} onPress={() => { setAddressModal(false); router.push('/profile' as any); }}><Text style={s.modalEmptyBtnTxt}>Add Address</Text></TouchableOpacity>
                    </View>
                ) : addresses.map(a => (
                    <TouchableOpacity key={a.id} style={[s.modalItem, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, selectedAddress?.id === a.id && { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(12, 166, 232, 0.05)' : '#f0faff' }]} onPress={() => { setSelectedAddress(a); setAddressModal(false); }}>
                        <View style={[s.modalItemIcon, { backgroundColor: colors.divider }]}><Ionicons name="location" size={22} color={selectedAddress?.id === a.id ? colors.accent : colors.textSecondary} /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[s.modalItemPrimary, { color: colors.textPrimary }]}>{a.label}{a.isDefault ? ' (Default)' : ''}</Text>
                            <Text style={[s.modalItemSec, { color: colors.textSecondary }]} numberOfLines={1}>{a.addressLine1}, {a.city}</Text>
                        </View>
                        {selectedAddress?.id === a.id && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
                    </TouchableOpacity>
                ))}
            </PickerModal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    retryBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    retryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scroll: { padding: 20, paddingBottom: 40 },
    serviceCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1 },
    serviceIconCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    serviceName: { fontSize: 16, fontWeight: '700' },
    serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    serviceMetaTxt: { fontSize: 13 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 8 },
    stepDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
    stepLabel: { fontSize: 15, fontWeight: '700' },
    optional: { fontWeight: '400', fontSize: 13 },
    selectCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 6 },
    selectInner: { flexDirection: 'row', alignItems: 'center' },
    selectIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    selectPrimary: { fontSize: 15, fontWeight: '600' },
    selectSecondary: { fontSize: 13, marginTop: 2 },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1 },
    noticeTxt: { fontSize: 13, flex: 1 },
    payCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 10 },
    payCardActive: { },
    payCardDisabled: { },
    payCardRow: { flexDirection: 'row', alignItems: 'center' },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
    radioActive: { },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    payIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    payTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    payTitle: { fontSize: 15, fontWeight: '700' },
    paySub: { fontSize: 13, marginTop: 3 },
    freeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    freeBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    noSubRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
    noSubTxt: { fontSize: 12 },
    noSubLink: { fontSize: 13, fontWeight: '700' },
    dateRow: { paddingBottom: 10, gap: 8, paddingLeft: 2, marginBottom: 6 },
    dateChip: { width: 64, height: 72, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
    dateChipSel: { },
    dateDow: { fontSize: 11, fontWeight: '600' },
    dateNum: { fontSize: 20, fontWeight: '800' },
    dateSelTxt: { color: '#fff' },
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    timeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    timeChipSel: { },
    timeChipTxt: { fontSize: 14, fontWeight: '600' },
    timeChipSelTxt: { color: '#fff' },
    notesBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
    notesInput: { fontSize: 15, minHeight: 72, lineHeight: 22 },
    priceSummary: { borderRadius: 16, borderWidth: 1, padding: 18, marginTop: 20, marginBottom: 8 },
    priceSummaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    priceLabel: { fontSize: 14 },
    priceVal: { fontSize: 14, fontWeight: '600' },
    priceDivider: { height: 1, marginVertical: 10 },
    priceTotalLabel: { fontSize: 16, fontWeight: '700' },
    priceTotalVal: { fontSize: 20, fontWeight: '800' },
    subNote: { fontSize: 12, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
    bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 16 },
    bookBtnDisabled: { },
    bookBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
    modalWrap: { flex: 1 },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
    modalItemSel: { },
    modalItemIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalItemPrimary: { fontSize: 15, fontWeight: '600' },
    modalItemSec: { fontSize: 13, marginTop: 2 },
    modalEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    modalEmptyTxt: { fontSize: 15 },
    modalEmptyBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
    modalEmptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});