import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import PayHere from '@/utils/Payhere';

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

function Step({ n, label }: { n: number; label: any }) {
    return (
        <View style={s.stepRow}>
            <View style={s.stepDot}><Text style={s.stepNum}>{n}</Text></View>
            <Text style={s.stepLabel}>{label}</Text>
        </View>
    );
}

function PickerModal({ visible, title, onClose, children }: any) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={s.modalWrap}>
                <View style={s.modalHead}>
                    <Text style={s.modalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>{children}</ScrollView>
            </View>
        </Modal>
    );
}

export default function CreateBookingScreen() {
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

    if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#0ca6e8" /></View>;
    if (!service) return (
        <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={{ color: '#ef4444', marginTop: 8, fontSize: 16 }}>Service not found</Text>
            <TouchableOpacity onPress={() => router.back()} style={s.retryBtn}><Text style={s.retryTxt}>Go Back</Text></TouchableOpacity>
        </View>
    );

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color="#0d1629" /></TouchableOpacity>
                <Text style={s.headerTitle}>Book Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Service card */}
                <View style={s.serviceCard}>
                    <View style={s.serviceIconCircle}><Ionicons name="car-sport" size={28} color="#0ca6e8" /></View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={s.serviceName}>{service.name}</Text>
                        <View style={s.serviceMeta}>
                            <Ionicons name="time-outline" size={13} color="#6b7280" />
                            <Text style={s.serviceMetaTxt}>{service.duration} min · Base LKR {service.price.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Step 1: Vehicle */}
                <Step n={1} label="Select Vehicle" />
                <TouchableOpacity style={s.selectCard} onPress={() => setVehicleModal(true)}>
                    {selectedVehicle ? (
                        <View style={s.selectInner}>
                            <View style={s.selectIcon}><Ionicons name="car" size={22} color="#0ca6e8" /></View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={s.selectPrimary}>{selectedVehicle.nickname || `${selectedVehicle.make} ${selectedVehicle.model}`}</Text>
                                <Text style={s.selectSecondary}>{selectedVehicle.type} · {selectedVehicle.year} · {selectedVehicle.licensePlate}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                        </View>
                    ) : (
                        <View style={s.selectInner}>
                            <Ionicons name="add-circle-outline" size={22} color="#9ca3af" />
                            <Text style={[s.selectSecondary, { marginLeft: 10 }]}>Tap to select a vehicle</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {priceBreakdown && priceBreakdown.multiplier > 1.0 && (
                    <View style={s.notice}>
                        <Ionicons name="information-circle-outline" size={14} color="#92400e" />
                        <Text style={s.noticeTxt}>{priceBreakdown.vehicleType} pricing: +{Math.round((priceBreakdown.multiplier - 1) * 100)}% on base price</Text>
                    </View>
                )}

                {/* Step 2: Payment */}
                <Step n={2} label="How to Pay?" />
                <TouchableOpacity style={[s.payCard, paymentPath === 'subscription' && s.payCardActive, !subscription && s.payCardDisabled]} onPress={() => subscription && setPaymentPath('subscription')} activeOpacity={subscription ? 0.7 : 1}>
                    <View style={s.payCardRow}>
                        <View style={[s.radio, paymentPath === 'subscription' && s.radioActive]}>{paymentPath === 'subscription' && <View style={s.radioDot} />}</View>
                        <View style={[s.payIconCircle, { backgroundColor: '#f0fdf4' }]}><Ionicons name="refresh-circle" size={22} color={subscription ? '#16a34a' : '#9ca3af'} /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={s.payTitleRow}>
                                <Text style={[s.payTitle, !subscription && { color: '#9ca3af' }]}>Subscription Wash</Text>
                                {subscription && <View style={s.freeBadge}><Text style={s.freeBadgeText}>FREE</Text></View>}
                            </View>
                            <Text style={[s.paySub, !subscription && { color: '#d1d5db' }]}>
                                {subscription ? `${subscription.planName} · ${subscription.remainingWashes} wash${subscription.remainingWashes !== 1 ? 'es' : ''} left` : 'No active subscription for this vehicle'}
                            </Text>
                        </View>
                    </View>
                    {!subscription && (
                        <View style={s.noSubRow}>
                            <Text style={s.noSubTxt}>No subscription for this vehicle. </Text>
                            <TouchableOpacity onPress={() => router.push('/subscriptions' as any)}><Text style={s.noSubLink}>Get one →</Text></TouchableOpacity>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={[s.payCard, paymentPath === 'one_time' && s.payCardActive]} onPress={() => setPaymentPath('one_time')}>
                    <View style={s.payCardRow}>
                        <View style={[s.radio, paymentPath === 'one_time' && s.radioActive]}>{paymentPath === 'one_time' && <View style={s.radioDot} />}</View>
                        <View style={[s.payIconCircle, { backgroundColor: '#eff6ff' }]}><Ionicons name="card" size={22} color="#2563eb" /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={s.payTitleRow}>
                                <Text style={s.payTitle}>One-Time Payment</Text>
                                <View style={[s.freeBadge, { backgroundColor: '#dbeafe' }]}><Text style={[s.freeBadgeText, { color: '#2563eb' }]}>CARD / BANK</Text></View>
                            </View>
                            <Text style={s.paySub}>{priceBreakdown ? `LKR ${priceBreakdown.totalPrice.toLocaleString()} via PayHere` : `LKR ${service.price.toLocaleString()} via PayHere`}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Step 3: Date */}
                <Step n={3} label="Select Date" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateRow}>
                    {next7().map(d => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        const isSel = d.toDateString() === selectedDate.toDateString();
                        return (
                            <TouchableOpacity key={d.toDateString()} style={[s.dateChip, isSel && s.dateChipSel]} onPress={() => setSelectedDate(d)}>
                                <Text style={[s.dateDow, isSel && s.dateSelTxt]}>{isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                                <Text style={[s.dateNum, isSel && s.dateSelTxt]}>{d.getDate()}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Step 4: Time */}
                <Step n={4} label="Preferred Time" />
                <View style={s.timeGrid}>
                    {TIME_SLOTS.map(t => {
                        const isSel = selectedTime === t;
                        return (
                            <TouchableOpacity key={t} style={[s.timeChip, isSel && s.timeChipSel]} onPress={() => setSelectedTime(t)}>
                                <Text style={[s.timeChipTxt, isSel && s.timeChipSelTxt]}>{fmt(t)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Step 5: Address */}
                <Step n={5} label="Service Location" />
                <TouchableOpacity style={s.selectCard} onPress={() => setAddressModal(true)}>
                    {selectedAddress ? (
                        <View style={s.selectInner}>
                            <View style={s.selectIcon}><Ionicons name="location" size={20} color="#0ca6e8" /></View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={s.selectPrimary}>{selectedAddress.label}</Text>
                                <Text style={s.selectSecondary} numberOfLines={1}>{selectedAddress.addressLine1}, {selectedAddress.city}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                        </View>
                    ) : (
                        <View style={s.selectInner}>
                            <Ionicons name="add-circle-outline" size={22} color="#9ca3af" />
                            <Text style={[s.selectSecondary, { marginLeft: 10 }]}>Tap to select a location</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Step 6: Notes */}
                <Step n={6} label={<>Special Instructions <Text style={s.optional}>(optional)</Text></>} />
                <View style={s.notesBox}>
                    <TextInput style={s.notesInput} multiline numberOfLines={3} placeholder="e.g. Gate code, avoid the spoiler, scratch on rear bumper — please be careful..." placeholderTextColor="#9ca3af" value={notes} onChangeText={setNotes} textAlignVertical="top" />
                </View>

                {/* Price Summary */}
                {paymentPath && priceBreakdown && (
                    <View style={s.priceSummary}>
                        <Text style={s.priceSummaryTitle}>Price Summary</Text>
                        <View style={s.priceRow}><Text style={s.priceLabel}>{service.name}</Text><Text style={s.priceVal}>LKR {priceBreakdown.basePrice.toLocaleString()}</Text></View>
                        {priceBreakdown.multiplier > 1.0 && (
                            <View style={s.priceRow}><Text style={s.priceLabel}>{priceBreakdown.vehicleType} surcharge</Text><Text style={s.priceVal}>+LKR {(priceBreakdown.totalPrice - priceBreakdown.basePrice).toLocaleString()}</Text></View>
                        )}
                        {paymentPath === 'subscription' && (
                            <View style={s.priceRow}><Text style={[s.priceLabel, { color: '#16a34a' }]}>Subscription discount</Text><Text style={[s.priceVal, { color: '#16a34a' }]}>-LKR {priceBreakdown.totalPrice.toLocaleString()}</Text></View>
                        )}
                        <View style={s.priceDivider} />
                        <View style={s.priceRow}>
                            <Text style={s.priceTotalLabel}>Total</Text>
                            <Text style={[s.priceTotalVal, { color: paymentPath === 'subscription' ? '#16a34a' : '#0ca6e8' }]}>{paymentPath === 'subscription' ? 'FREE' : `LKR ${priceBreakdown.totalPrice.toLocaleString()}`}</Text>
                        </View>
                        {paymentPath === 'subscription' && <Text style={s.subNote}>1 wash deducted from your {subscription?.planName} plan</Text>}
                    </View>
                )}

                {/* CTA */}
                <TouchableOpacity style={[s.bookBtn, (!canBook || submitting) && s.bookBtnDisabled]} onPress={handleBook} disabled={!canBook || submitting}>
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
            <PickerModal visible={vehicleModal} title="Select Vehicle" onClose={() => setVehicleModal(false)}>
                {vehicles.length === 0 ? (
                    <View style={s.modalEmpty}>
                        <Ionicons name="car-outline" size={40} color="#d1d5db" />
                        <Text style={s.modalEmptyTxt}>No vehicles added</Text>
                        <TouchableOpacity style={s.modalEmptyBtn} onPress={() => { setVehicleModal(false); router.push('/vehicles' as any); }}><Text style={s.modalEmptyBtnTxt}>Add Vehicle</Text></TouchableOpacity>
                    </View>
                ) : vehicles.map(v => (
                    <TouchableOpacity key={v.id} style={[s.modalItem, selectedVehicle?.id === v.id && s.modalItemSel]} onPress={() => handleVehicleSelect(v)}>
                        <View style={s.modalItemIcon}><Ionicons name="car" size={22} color={selectedVehicle?.id === v.id ? '#0ca6e8' : '#6b7280'} /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.modalItemPrimary}>{v.nickname || `${v.make} ${v.model}`}</Text>
                            <Text style={s.modalItemSec}>{v.type} · {v.year} · {v.licensePlate}</Text>
                        </View>
                        {selectedVehicle?.id === v.id && <Ionicons name="checkmark-circle" size={22} color="#0ca6e8" />}
                    </TouchableOpacity>
                ))}
            </PickerModal>

            {/* Address Modal */}
            <PickerModal visible={addressModal} title="Service Location" onClose={() => setAddressModal(false)}>
                {addresses.length === 0 ? (
                    <View style={s.modalEmpty}>
                        <Ionicons name="location-outline" size={40} color="#d1d5db" />
                        <Text style={s.modalEmptyTxt}>No addresses saved</Text>
                        <TouchableOpacity style={s.modalEmptyBtn} onPress={() => { setAddressModal(false); router.push('/profile' as any); }}><Text style={s.modalEmptyBtnTxt}>Add Address</Text></TouchableOpacity>
                    </View>
                ) : addresses.map(a => (
                    <TouchableOpacity key={a.id} style={[s.modalItem, selectedAddress?.id === a.id && s.modalItemSel]} onPress={() => { setSelectedAddress(a); setAddressModal(false); }}>
                        <View style={s.modalItemIcon}><Ionicons name="location" size={22} color={selectedAddress?.id === a.id ? '#0ca6e8' : '#6b7280'} /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.modalItemPrimary}>{a.label}{a.isDefault ? ' (Default)' : ''}</Text>
                            <Text style={s.modalItemSec} numberOfLines={1}>{a.addressLine1}, {a.city}</Text>
                        </View>
                        {selectedAddress?.id === a.id && <Ionicons name="checkmark-circle" size={22} color="#0ca6e8" />}
                    </TouchableOpacity>
                ))}
            </PickerModal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', gap: 10 },
    retryBtn: { backgroundColor: '#0ca6e8', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    retryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    scroll: { padding: 20, paddingBottom: 40 },
    serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f4fd', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#bae6fd' },
    serviceIconCircle: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#bae6fd', justifyContent: 'center', alignItems: 'center' },
    serviceName: { fontSize: 16, fontWeight: '700', color: '#0d1629' },
    serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    serviceMetaTxt: { fontSize: 13, color: '#0ca6e8' },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 8 },
    stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0ca6e8', justifyContent: 'center', alignItems: 'center' },
    stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
    stepLabel: { fontSize: 15, fontWeight: '700', color: '#0d1629' },
    optional: { fontWeight: '400', color: '#9ca3af', fontSize: 13 },
    selectCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 6 },
    selectInner: { flexDirection: 'row', alignItems: 'center' },
    selectIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0f4fd', justifyContent: 'center', alignItems: 'center' },
    selectPrimary: { fontSize: 15, fontWeight: '600', color: '#0d1629' },
    selectSecondary: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: '#fde68a' },
    noticeTxt: { fontSize: 13, color: '#92400e', flex: 1 },
    payCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 16, marginBottom: 10 },
    payCardActive: { borderColor: '#0ca6e8', backgroundColor: '#f0faff' },
    payCardDisabled: { backgroundColor: '#fafafa' },
    payCardRow: { flexDirection: 'row', alignItems: 'center' },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
    radioActive: { borderColor: '#0ca6e8' },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0ca6e8' },
    payIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    payTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    payTitle: { fontSize: 15, fontWeight: '700', color: '#0d1629' },
    paySub: { fontSize: 13, color: '#374151', marginTop: 3 },
    freeBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    freeBadgeText: { fontSize: 11, fontWeight: '800', color: '#16a34a', letterSpacing: 0.5 },
    noSubRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    noSubTxt: { fontSize: 12, color: '#9ca3af' },
    noSubLink: { fontSize: 13, color: '#0ca6e8', fontWeight: '700' },
    dateRow: { paddingBottom: 10, gap: 8, paddingLeft: 2, marginBottom: 6 },
    dateChip: { width: 64, height: 72, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', gap: 4 },
    dateChipSel: { backgroundColor: '#0ca6e8', borderColor: '#0ca6e8' },
    dateDow: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
    dateNum: { fontSize: 20, color: '#0d1629', fontWeight: '800' },
    dateSelTxt: { color: '#fff' },
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    timeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
    timeChipSel: { backgroundColor: '#0ca6e8', borderColor: '#0ca6e8' },
    timeChipTxt: { fontSize: 14, fontWeight: '600', color: '#374151' },
    timeChipSelTxt: { color: '#fff' },
    notesBox: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 8 },
    notesInput: { fontSize: 15, color: '#0d1629', minHeight: 72, lineHeight: 22 },
    priceSummary: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18, marginTop: 20, marginBottom: 8 },
    priceSummaryTitle: { fontSize: 16, fontWeight: '700', color: '#0d1629', marginBottom: 14 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    priceLabel: { fontSize: 14, color: '#6b7280' },
    priceVal: { fontSize: 14, color: '#374151', fontWeight: '600' },
    priceDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
    priceTotalLabel: { fontSize: 16, fontWeight: '700', color: '#0d1629' },
    priceTotalVal: { fontSize: 20, fontWeight: '800' },
    subNote: { fontSize: 12, color: '#16a34a', marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
    bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0ca6e8', borderRadius: 16, paddingVertical: 18, marginTop: 16 },
    bookBtnDisabled: { backgroundColor: '#d1d5db' },
    bookBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
    modalWrap: { flex: 1, backgroundColor: '#f8fafc' },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    modalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 10 },
    modalItemSel: { borderColor: '#0ca6e8', backgroundColor: '#f0faff' },
    modalItemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
    modalItemPrimary: { fontSize: 15, fontWeight: '600', color: '#0d1629' },
    modalItemSec: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    modalEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    modalEmptyTxt: { fontSize: 15, color: '#6b7280' },
    modalEmptyBtn: { backgroundColor: '#0ca6e8', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
    modalEmptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});