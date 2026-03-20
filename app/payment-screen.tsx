import PayHere from '@/utils/Payhere';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../services/apiClient';

const cardLogos: any = {
  Visa: require('../assets/cards/visa.png'),
  MasterCard: require('../assets/cards/mastercard.png'),
  'American Express': require('../assets/cards/amex.png'),
};

const chip = require('../assets/cards/chip.png');
const nfc = require('../assets/cards/nfc.png');

export default function PaymentScreen() {
  const { colors, isDark } = useTheme();

  // Route params from CreateBookingScreen
  const { bookingId, amount, serviceName } = useLocalSearchParams<{
    bookingId: string;
    amount: string;
    serviceName: string;
    scheduledDate: string;
    scheduledTime: string;
  }>();

  const [cardType, setCardType] = useState('Visa');
  const [cardNumber, setCardNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Animations
  const flipAnim = useState(new Animated.Value(0))[0];
  const tilt = useState(new Animated.Value(0))[0];

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const tiltRotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] });

  function handleTilt(x: number) {
    Animated.spring(tilt, { toValue: x, useNativeDriver: true }).start();
  }
  function flipFront() {
    Animated.timing(flipAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
  }
  function flipBack() {
    Animated.timing(flipAnim, { toValue: 180, duration: 400, useNativeDriver: true }).start();
  }

  function detectCardType(num: string) {
    const cleaned = num.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'MasterCard';
    if (/^3[47]/.test(cleaned)) return 'American Express';
    return 'Visa';
  }

  function formatCard(text: string) {
    const clean = text.replace(/\D/g, '');
    const groups = clean.match(/.{1,4}/g);
    return groups ? groups.join(' ') : '';
  }

  function handleCardNumber(text: string) {
    let formatted = formatCard(text);
    const detected = detectCardType(formatted);
    setCardType(detected);
    formatted = detected === 'American Express' ? formatted.slice(0, 17) : formatted.slice(0, 19);
    setCardNumber(formatted);
  }

  function handleCVV(text: string) {
    setCvv(text.slice(0, cardType === 'American Express' ? 4 : 3));
  }

  function getGradient(): [string, string, string] {
    switch (cardType) {
      case 'Visa':             return ['#5a71d8ff', '#764ba2', '#6B73FF'];
      case 'MasterCard':       return ['#f12711', '#f5af19', '#f7971e'];
      case 'American Express': return ['#00c6ff', '#0072ff', '#00d2ff'];
      default:                 return ['#667eea', '#764ba2', '#6B73FF'];
    }
  }

  async function handlePay() {
    if (!cardNumber || !holder || !expiry || !cvv) {
      Alert.alert('Incomplete', 'Please fill in all card details.');
      return;
    }
    if (!bookingId) {
      Alert.alert('Error', 'Missing booking information.');
      return;
    }

    setSubmitting(true);
    try {
      const hashRes = await apiFetch(
        '/payments/hash',
        { method: 'POST', body: JSON.stringify({ bookingId, amount: Number(amount), currency: 'LKR' }) },
        'customer'
      );

      if (!hashRes.success) {
        Alert.alert('Error', 'Failed to initiate payment.');
        return;
      }

      const p = hashRes.data;

      PayHere.startPayment(
        {
          sandbox: true,
          merchant_id: p.merchantId,
          notify_url: p.notifyUrl,
          order_id: bookingId,
          items: serviceName || 'Car Wash',
          amount: String(amount),
          currency: 'LKR',
          first_name: p.firstName || '',
          last_name: p.lastName || '',
          email: p.email || '',
          phone: p.phone || '',
          address: p.address || '',
          city: p.city || '',
          country: 'Sri Lanka',
          custom_1: bookingId,
          custom_2: '',
          hash: p.hash,
        },
        () => {
          router.replace({
            pathname: '/booking-confirmation',
            params: { bookingId, path: 'one_time' },
          });
        },
        (err: string) => { Alert.alert('Payment Failed', err); },
        () => { Alert.alert('Cancelled', 'Payment was cancelled. Your booking is held for 10 minutes.'); }
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[s.container, { backgroundColor: colors.background }]}>

          {/* Header */}
          <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Payment</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

            {/* Amount banner */}
            {amount ? (
              <View style={[s.amountBanner, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd', borderColor: isDark ? colors.accent : '#bae6fd' }]}>
                <View style={[s.amountIconCircle, { backgroundColor: isDark ? 'rgba(12,166,232,0.2)' : '#bae6fd' }]}>
                  <Ionicons name="card" size={22} color={colors.accent} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[s.amountLabel, { color: colors.textSecondary }]}>{serviceName || 'Car Wash'}</Text>
                  <Text style={[s.amountValue, { color: colors.accent }]}>LKR {Number(amount).toLocaleString()}</Text>
                </View>
              </View>
            ) : null}

            {/* Card preview */}
            <View
              style={s.cardContainer}
              onTouchMove={(e) => handleTilt(e.nativeEvent.locationX > 150 ? 1 : -1)}
              onTouchEnd={() => handleTilt(0)}
            >
              {/* Front */}
              <Animated.View style={[s.card, { transform: [{ rotateY: frontRotate }, { rotateZ: tiltRotate }] }]}>
                <LinearGradient colors={getGradient()} style={s.cardGradient}>
                  <View style={s.topRow}>
                    <Image source={chip} style={s.chip} />
                    <Image source={nfc} style={s.nfc} />
                    <Image source={cardLogos[cardType]} style={s.cardLogo} />
                  </View>
                  <Text style={s.number}>{cardNumber || 'XXXX XXXX XXXX XXXX'}</Text>
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

              {/* Back */}
              <Animated.View style={[s.cardBack, { transform: [{ rotateY: backRotate }] }]}>
                <View style={s.strip} />
                <Text style={s.cvv}>{cvv || '***'}</Text>
              </Animated.View>
            </View>

            {/* Card type selector */}
            <Text style={[s.label, { color: colors.textPrimary }]}>Card Type</Text>
            <View style={s.selector}>
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
                  <Text style={[s.typeText, { color: colors.textSecondary }, cardType === type && { color: '#fff' }]}>
                    {type === 'American Express' ? 'AMEX' : type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Inputs */}
            <Text style={[s.label, { color: colors.textPrimary }]}>Card Number</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
              keyboardType="numeric"
              value={cardNumber}
              onChangeText={handleCardNumber}
              placeholderTextColor={colors.textSecondary}
              placeholder="0000 0000 0000 0000"
            />

            <Text style={[s.label, { color: colors.textPrimary }]}>Card Holder</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
              value={holder}
              onChangeText={setHolder}
              placeholderTextColor={colors.textSecondary}
              placeholder="Full name on card"
              autoCapitalize="words"
            />

            <View style={s.row}>
              <View style={s.half}>
                <Text style={[s.label, { color: colors.textPrimary }]}>Expiry</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                  value={expiry}
                  onFocus={flipFront}
                  onChangeText={(text) => {
                    // Strip non-numeric except slash
                    let cleaned = text.replace(/[^\d]/g, '');
                    // Auto-insert slash after MM
                    if (cleaned.length >= 2) {
                      cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
                    }
                    setExpiry(cleaned);
                  }}
                  placeholderTextColor={colors.textSecondary}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={s.half}>
                <Text style={[s.label, { color: colors.textPrimary }]}>CVV</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                  value={cvv}
                  keyboardType="numeric"
                  onFocus={flipBack}
                  onBlur={flipFront}
                  onChangeText={handleCVV}
                  placeholderTextColor={colors.textSecondary}
                  placeholder="***"
                  secureTextEntry
                />
              </View>
            </View>

            {/* Save card */}
            <View style={[s.saveRow, { borderTopColor: colors.divider }]}>
              <View>
                <Text style={[s.saveLabel, { color: colors.textPrimary }]}>Save Card</Text>
                <Text style={[s.saveSub, { color: colors.textSecondary }]}>For faster checkout next time</Text>
              </View>
              <Switch
                value={saveCard}
                onValueChange={setSaveCard}
                trackColor={{ false: colors.divider, true: colors.accent }}
                thumbColor="#fff"
              />
            </View>

            {/* Pay button */}
            <TouchableOpacity
              style={[s.payBtn, { backgroundColor: colors.accent }, submitting && { opacity: 0.6 }]}
              onPress={handlePay}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={s.payText}>Pay LKR {Number(amount || 0).toLocaleString()}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[s.secureNote, { color: colors.textSecondary }]}>
              Secured by PayHere. Your card details are never stored on our servers.
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  amountBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    padding: 16, marginBottom: 24, borderWidth: 1,
  },
  amountIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  amountLabel: { fontSize: 13, marginBottom: 2 },
  amountValue: { fontSize: 20, fontWeight: '800' },
  cardContainer: { height: 200, marginBottom: 28 },
  card: { position: 'absolute', width: '100%', height: 200, backfaceVisibility: 'hidden' },
  cardGradient: { flex: 1, borderRadius: 20, padding: 20, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { width: 50, height: 35 },
  nfc: { width: 30, height: 25 },
  cardLogo: { width: 60, height: 35 },
  cardBack: {
    position: 'absolute', width: '100%', height: 200,
    backgroundColor: '#1e293b', borderRadius: 20, padding: 20, backfaceVisibility: 'hidden',
  },
  strip: { height: 40, backgroundColor: '#000', marginBottom: 20 },
  cvv: { color: '#fff', alignSelf: 'flex-end', fontSize: 18, fontWeight: '700' },
  number: { color: '#fff', fontSize: 22, letterSpacing: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  labelSmall: { color: '#ddd', fontSize: 10 },
  cardValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  selector: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  selectorLogo: { width: 35, height: 20, marginBottom: 4 },
  typeBtn: {
    flex: 1, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 12, alignItems: 'center', gap: 4,
  },
  typeText: { fontWeight: '600', fontSize: 12 },
  saveRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, paddingTop: 20, borderTopWidth: 1,
  },
  saveLabel: { fontSize: 15, fontWeight: '600' },
  saveSub: { fontSize: 12, marginTop: 2 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 24,
  },
  payText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secureNote: { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
});