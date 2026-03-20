// app/marketplace-checkout.tsx
// Marketplace checkout screen — reuses payment-screen card UI pattern
// Receives cart items as a JSON param from marketplace.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, Image, Keyboard,
    KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
    Switch, Text, TextInput, TouchableOpacity,
    TouchableWithoutFeedback, View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ── Card assets (same as payment-screen) ─────────────────────────────────────
const cardLogos: any = {
    Visa:             require('../assets/cards/visa.png'),
    MasterCard:       require('../assets/cards/mastercard.png'),
    'American Express': require('../assets/cards/amex.png'),
};
const chip = require('../assets/cards/chip.png');
const nfc  = require('../assets/cards/nfc.png');

// ── Types ─────────────────────────────────────────────────────────────────────
interface CartItem {
    product: { id: string; name: string; price: number; image: any };
    quantity: number;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MarketplaceCheckoutScreen() {
    const { colors, isDark } = useTheme();
    const { cartJson, subtotal, shipping, total } = useLocalSearchParams<{
        cartJson: string;
        subtotal: string;
        shipping: string;
        total: string;
    }>();

    const cart: CartItem[] = JSON.parse(cartJson || '[]');
    const subtotalNum  = parseFloat(subtotal  || '0');
    const shippingNum  = parseFloat(shipping  || '0');
    const totalNum     = parseFloat(total     || '0');

    // ── Card state ────────────────────────────────────────────────────────────
    const [step, setStep]         = useState<'order' | 'payment'>('order');
    const [cardType, setCardType] = useState('Visa');
    const [cardNumber, setCardNumber] = useState('');
    const [holder, setHolder]     = useState('');
    const [expiry, setExpiry]     = useState('');
    const [cvv, setCvv]           = useState('');
    const [saveCard, setSaveCard] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ── Card animations ───────────────────────────────────────────────────────
    const flipAnim = useState(new Animated.Value(0))[0];
    const tilt     = useState(new Animated.Value(0))[0];

    const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
    const backRotate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
    const tiltRotate  = tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] });

    const flipFront = () => Animated.timing(flipAnim, { toValue: 0,   duration: 400, useNativeDriver: true }).start();
    const flipBack  = () => Animated.timing(flipAnim, { toValue: 180, duration: 400, useNativeDriver: true }).start();
    const handleTilt = (x: number) => Animated.spring(tilt, { toValue: x, useNativeDriver: true }).start();

    // ── Card helpers ──────────────────────────────────────────────────────────
    const detectCardType = (num: string) => {
        const c = num.replace(/\s/g, '');
        if (/^4/.test(c))        return 'Visa';
        if (/^5[1-5]/.test(c))  return 'MasterCard';
        if (/^3[47]/.test(c))   return 'American Express';
        return 'Visa';
    };

    const formatCard = (text: string) => {
        const clean = text.replace(/\D/g, '');
        return (clean.match(/.{1,4}/g) || []).join(' ');
    };

    const handleCardNumber = (text: string) => {
        let formatted = formatCard(text);
        const detected = detectCardType(formatted);
        setCardType(detected);
        setCardNumber(detected === 'American Express' ? formatted.slice(0, 17) : formatted.slice(0, 19));
    };

    const getGradient = (): [string, string, string] => {
        switch (cardType) {
            case 'Visa':             return ['#5a71d8ff', '#764ba2', '#6B73FF'];
            case 'MasterCard':       return ['#f12711', '#f5af19', '#f7971e'];
            case 'American Express': return ['#00c6ff', '#0072ff', '#00d2ff'];
            default:                 return ['#667eea', '#764ba2', '#6B73FF'];
        }
    };

    // ── Place order ───────────────────────────────────────────────────────────
    const handlePlaceOrder = async () => {
        if (!cardNumber || !holder || !expiry || !cvv) {
            Alert.alert('Incomplete', 'Please fill in all card details.');
            return;
        }

        setSubmitting(true);
        try {
            // Simulate payment processing (replace with real PayHere integration)
            await new Promise(r => setTimeout(r, 1800));

            Alert.alert(
                '🎉 Order Placed!',
                `Your order of LKR ${totalNum.toFixed(2)} has been confirmed.\nExpected delivery: 2–3 business days.`,
                [{
                    text: 'Continue Shopping',
                    onPress: () => router.replace('/marketplace' as any),
                }]
            );
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to place order.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[s.container, { backgroundColor: colors.background }]}>

                    {/* Header */}
                    <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                        <TouchableOpacity onPress={() => step === 'payment' ? setStep('order') : router.back()} style={s.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>
                            {step === 'order' ? 'Review Order' : 'Payment'}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Step indicator */}
                    <View style={[s.stepBar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                        {(['order', 'payment'] as const).map((st, i) => (
                            <View key={st} style={s.stepItem}>
                                <View style={[s.stepDot, { backgroundColor: step === st || (st === 'order' && step === 'payment') ? colors.accent : colors.divider }]}>
                                    {st === 'order' && step === 'payment'
                                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                                        : <Text style={s.stepNum}>{i + 1}</Text>
                                    }
                                </View>
                                <Text style={[s.stepLabel, { color: step === st ? colors.accent : colors.textSecondary }]}>
                                    {st === 'order' ? 'Order' : 'Payment'}
                                </Text>
                            </View>
                        ))}
                        <View style={[s.stepConnector, { backgroundColor: step === 'payment' ? colors.accent : colors.divider }]} />
                    </View>

                    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                        {/* ── STEP 1: Order Review ── */}
                        {step === 'order' && (
                            <>
                                {/* Items */}
                                <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                                    <View style={s.cardTitleRow}>
                                        <Ionicons name="cart-outline" size={18} color={colors.accent} />
                                        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                                            Order Items ({cart.length})
                                        </Text>
                                    </View>
                                    {cart.map((item, i) => (
                                        <View key={item.product.id} style={[s.orderItem, i < cart.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                                            <Text style={[s.orderItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                                                {item.product.name}
                                            </Text>
                                            <View style={s.orderItemRight}>
                                                <Text style={[s.orderItemQty, { color: colors.textSecondary }]}>x{item.quantity}</Text>
                                                <Text style={[s.orderItemPrice, { color: colors.textPrimary }]}>
                                                    LKR {(item.product.price * item.quantity).toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                {/* Summary */}
                                <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                                    <View style={s.cardTitleRow}>
                                        <Ionicons name="receipt-outline" size={18} color={colors.accent} />
                                        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Order Summary</Text>
                                    </View>
                                    <View style={s.summaryRow}>
                                        <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                                        <Text style={[s.summaryValue, { color: colors.textPrimary }]}>LKR {subtotalNum.toFixed(2)}</Text>
                                    </View>
                                    <View style={s.summaryRow}>
                                        <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
                                        {shippingNum === 0
                                            ? <Text style={[s.summaryValue, { color: colors.success || '#16a34a' }]}>FREE</Text>
                                            : <Text style={[s.summaryValue, { color: colors.textPrimary }]}>LKR {shippingNum.toFixed(2)}</Text>
                                        }
                                    </View>
                                    <View style={[s.divider, { backgroundColor: colors.divider }]} />
                                    <View style={s.summaryRow}>
                                        <Text style={[s.totalLabel, { color: colors.textPrimary }]}>Total</Text>
                                        <Text style={[s.totalValue, { color: colors.accent }]}>LKR {totalNum.toFixed(2)}</Text>
                                    </View>
                                    {shippingNum === 0 && (
                                        <View style={[s.freeShippingBadge, { backgroundColor: isDark ? 'rgba(22,163,74,0.1)' : '#f0fdf4' }]}>
                                            <Ionicons name="checkmark-circle-outline" size={14} color={colors.success || '#16a34a'} />
                                            <Text style={[s.freeShippingTxt, { color: colors.success || '#16a34a' }]}>
                                                Free shipping applied on orders over LKR 100
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Delivery info */}
                                <View style={[s.card, { backgroundColor: colors.cardBackground }]}>
                                    <View style={s.cardTitleRow}>
                                        <Ionicons name="bicycle-outline" size={18} color={colors.accent} />
                                        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Delivery</Text>
                                    </View>
                                    <View style={s.deliveryRow}>
                                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                                        <Text style={[s.deliveryText, { color: colors.textSecondary }]}>
                                            Estimated delivery: 2–3 business days
                                        </Text>
                                    </View>
                                    <View style={s.deliveryRow}>
                                        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                                        <Text style={[s.deliveryText, { color: colors.textSecondary }]}>
                                            Delivered to your registered address
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[s.continueBtn, { backgroundColor: colors.accent }]}
                                    onPress={() => setStep('payment')}
                                >
                                    <Ionicons name="card-outline" size={20} color="#fff" />
                                    <Text style={s.continueBtnTxt}>Continue to Payment</Text>
                                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── STEP 2: Payment ── */}
                        {step === 'payment' && (
                            <>
                                {/* Amount banner */}
                                <View style={[s.amountBanner, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd', borderColor: isDark ? colors.accent : '#bae6fd' }]}>
                                    <View style={[s.amountIconCircle, { backgroundColor: isDark ? 'rgba(12,166,232,0.2)' : '#bae6fd' }]}>
                                        <Ionicons name="card" size={22} color={colors.accent} />
                                    </View>
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={[s.amountLabel, { color: colors.textSecondary }]}>
                                            {cart.length} item{cart.length !== 1 ? 's' : ''} · Marketplace Order
                                        </Text>
                                        <Text style={[s.amountValue, { color: colors.accent }]}>
                                            LKR {totalNum.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Card preview */}
                                <View
                                    style={s.cardContainer}
                                    onTouchMove={e => handleTilt(e.nativeEvent.locationX > 150 ? 1 : -1)}
                                    onTouchEnd={() => handleTilt(0)}
                                >
                                    <Animated.View style={[s.cardPreview, { transform: [{ rotateY: frontRotate }, { rotateZ: tiltRotate }] }]}>
                                        <LinearGradient colors={getGradient()} style={s.cardGradient}>
                                            <View style={s.topRow}>
                                                <Image source={chip} style={s.chip} />
                                                <Image source={nfc}  style={s.nfcImg} />
                                                <Image source={cardLogos[cardType]} style={s.cardLogo} />
                                            </View>
                                            <Text style={s.cardNumber}>{cardNumber || 'XXXX XXXX XXXX XXXX'}</Text>
                                            <View style={s.cardRow}>
                                                <View>
                                                    <Text style={s.labelSmall}>CARD HOLDER</Text>
                                                    <Text style={s.cardValue}>{holder || 'YOUR NAME'}</Text>
                                                </View>
                                                <View>
                                                    <Text style={s.labelSmall}>EXPIRES</Text>
                                                    <Text style={s.cardValue}>{expiry || 'MM/YY'}</Text>
                                                </View>
                                            </View>
                                        </LinearGradient>
                                    </Animated.View>
                                    <Animated.View style={[s.cardBack, { transform: [{ rotateY: backRotate }] }]}>
                                        <View style={s.strip} />
                                        <Text style={s.cvvTxt}>{cvv || '***'}</Text>
                                    </Animated.View>
                                </View>

                                {/* Card type selector */}
                                <Text style={[s.inputLabel, { color: colors.textPrimary }]}>Card Type</Text>
                                <View style={s.typeSelector}>
                                    {['Visa', 'MasterCard', 'American Express'].map(type => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                s.typeBtn,
                                                { borderColor: colors.divider, backgroundColor: colors.cardBackground },
                                                cardType === type && { backgroundColor: colors.accent, borderColor: colors.accent },
                                            ]}
                                            onPress={() => setCardType(type)}
                                        >
                                            <Image source={cardLogos[type]} style={s.selectorLogo} />
                                            <Text style={[s.typeTxt, { color: colors.textSecondary }, cardType === type && { color: '#fff' }]}>
                                                {type === 'American Express' ? 'AMEX' : type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Inputs */}
                                <Text style={[s.inputLabel, { color: colors.textPrimary }]}>Card Number</Text>
                                <TextInput
                                    style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                                    keyboardType="numeric"
                                    value={cardNumber}
                                    onChangeText={handleCardNumber}
                                    placeholderTextColor={colors.textSecondary}
                                    placeholder="0000 0000 0000 0000"
                                    onFocus={flipFront}
                                />

                                <Text style={[s.inputLabel, { color: colors.textPrimary }]}>Card Holder</Text>
                                <TextInput
                                    style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                                    value={holder}
                                    onChangeText={setHolder}
                                    placeholderTextColor={colors.textSecondary}
                                    placeholder="Full name on card"
                                    autoCapitalize="words"
                                    onFocus={flipFront}
                                />

                                <View style={s.rowInputs}>
                                    <View style={s.half}>
                                        <Text style={[s.inputLabel, { color: colors.textPrimary }]}>Expiry</Text>
                                        <TextInput
                                            style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                                            value={expiry}
                                            onFocus={flipFront}
                                            onChangeText={text => {
                                                let clean = text.replace(/[^\d]/g, '');
                                                if (clean.length >= 2) clean = clean.slice(0, 2) + '/' + clean.slice(2, 4);
                                                setExpiry(clean);
                                            }}
                                            placeholderTextColor={colors.textSecondary}
                                            placeholder="MM/YY"
                                            keyboardType="numeric"
                                            maxLength={5}
                                        />
                                    </View>
                                    <View style={s.half}>
                                        <Text style={[s.inputLabel, { color: colors.textPrimary }]}>CVV</Text>
                                        <TextInput
                                            style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                                            value={cvv}
                                            keyboardType="numeric"
                                            onFocus={flipBack}
                                            onBlur={flipFront}
                                            onChangeText={text => setCvv(text.slice(0, cardType === 'American Express' ? 4 : 3))}
                                            placeholderTextColor={colors.textSecondary}
                                            placeholder="***"
                                            secureTextEntry
                                        />
                                    </View>
                                </View>

                                {/* Save card toggle */}
                                <View style={[s.saveRow, { borderTopColor: colors.divider }]}>
                                    <View>
                                        <Text style={[s.saveLabel, { color: colors.textPrimary }]}>Save Card</Text>
                                        <Text style={[s.saveSub, { color: colors.textSecondary }]}>For faster checkout next time</Text>
                                    </View>
                                    <Switch value={saveCard} onValueChange={setSaveCard} trackColor={{ false: colors.divider, true: colors.accent }} thumbColor="#fff" />
                                </View>

                                {/* Pay button */}
                                <TouchableOpacity
                                    style={[s.payBtn, { backgroundColor: colors.accent }, submitting && { opacity: 0.6 }]}
                                    onPress={handlePlaceOrder}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="lock-closed" size={18} color="#fff" />
                                            <Text style={s.payBtnTxt}>Pay LKR {totalNum.toFixed(2)}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <Text style={[s.secureNote, { color: colors.textSecondary }]}>
                                    Secured by PayHere. Your card details are never stored on our servers.
                                </Text>
                            </>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Processing overlay */}
                    {submitting && (
                        <View style={s.overlay}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={s.overlayText}>Processing payment...</Text>
                            <Text style={s.overlaySubText}>Please don't close the app</Text>
                        </View>
                    )}
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container:          { flex: 1 },
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    backBtn:            { width: 40, height: 40, justifyContent: 'center' },
    headerTitle:        { fontSize: 18, fontWeight: '700' },

    stepBar:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 8, position: 'relative' },
    stepItem:           { alignItems: 'center', gap: 4, zIndex: 1 },
    stepDot:            { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    stepNum:            { fontSize: 12, fontWeight: '800', color: '#fff' },
    stepLabel:          { fontSize: 11, fontWeight: '600' },
    stepConnector:      { position: 'absolute', height: 2, width: 60, top: 24 },

    scroll:             { padding: 20, paddingBottom: 40 },

    card:               { borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    cardTitle:          { fontSize: 15, fontWeight: '700' },

    orderItem:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    orderItemName:      { flex: 1, fontSize: 14, fontWeight: '600' },
    orderItemRight:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
    orderItemQty:       { fontSize: 13 },
    orderItemPrice:     { fontSize: 14, fontWeight: '700' },

    summaryRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel:       { fontSize: 14 },
    summaryValue:       { fontSize: 14, fontWeight: '600' },
    divider:            { height: 1, marginVertical: 10 },
    totalLabel:         { fontSize: 15, fontWeight: '700' },
    totalValue:         { fontSize: 20, fontWeight: '800' },

    freeShippingBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, padding: 8, marginTop: 8 },
    freeShippingTxt:    { fontSize: 12, fontWeight: '600', flex: 1 },

    deliveryRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    deliveryText:       { fontSize: 13, flex: 1 },

    continueBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 8 },
    continueBtnTxt:     { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },

    // Payment step
    amountBanner:       { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1 },
    amountIconCircle:   { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    amountLabel:        { fontSize: 13, marginBottom: 2 },
    amountValue:        { fontSize: 20, fontWeight: '800' },

    cardContainer:      { height: 200, marginBottom: 28 },
    cardPreview:        { position: 'absolute', width: '100%', height: 200, backfaceVisibility: 'hidden' },
    cardGradient:       { flex: 1, borderRadius: 20, padding: 20, justifyContent: 'space-between' },
    topRow:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip:               { width: 50, height: 35 },
    nfcImg:             { width: 30, height: 25 },
    cardLogo:           { width: 60, height: 35 },
    cardBack:           { position: 'absolute', width: '100%', height: 200, backgroundColor: '#1e293b', borderRadius: 20, padding: 20, backfaceVisibility: 'hidden' },
    strip:              { height: 40, backgroundColor: '#000', marginBottom: 20 },
    cvvTxt:             { color: '#fff', alignSelf: 'flex-end', fontSize: 18, fontWeight: '700' },
    cardNumber:         { color: '#fff', fontSize: 22, letterSpacing: 3 },
    cardRow:            { flexDirection: 'row', justifyContent: 'space-between' },
    labelSmall:         { color: '#ddd', fontSize: 10 },
    cardValue:          { color: '#fff', fontSize: 16, fontWeight: '600' },

    typeSelector:       { flexDirection: 'row', gap: 8, marginBottom: 4 },
    typeBtn:            { flex: 1, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', gap: 4 },
    selectorLogo:       { width: 35, height: 20, marginBottom: 4 },
    typeTxt:            { fontWeight: '600', fontSize: 12 },

    inputLabel:         { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
    input:              { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 15 },
    rowInputs:          { flexDirection: 'row', justifyContent: 'space-between' },
    half:               { width: '48%' },

    saveRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1 },
    saveLabel:          { fontSize: 15, fontWeight: '600' },
    saveSub:            { fontSize: 12, marginTop: 2 },

    payBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 24 },
    payBtnTxt:          { color: '#fff', fontWeight: '800', fontSize: 16 },
    secureNote:         { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },

    overlay:            { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
    overlayText:        { color: '#fff', marginTop: 16, fontSize: 16, fontWeight: '700' },
    overlaySubText:     { color: 'rgba(255,255,255,0.7)', marginTop: 6, fontSize: 13 },
});