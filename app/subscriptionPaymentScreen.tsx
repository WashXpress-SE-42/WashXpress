import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const cardLogos: any = {
  Visa: require('../assets/cards/visa.png'),
  MasterCard: require('../assets/cards/mastercard.png'),
  'American Express': require('../assets/cards/amex.png'),
};
const chip = require('../assets/cards/chip.png');
const nfc = require('../assets/cards/nfc.png');

export default function SubscriptionPaymentScreen() {
  const { colors, isDark } = useTheme();
  const { plan, vehicle, changeSubscriptionId } = useLocalSearchParams<{
    plan: string;
    vehicle: string;
    changeSubscriptionId?: string;
  }>();

  const selectedPlan = JSON.parse(plan as string);
  const selectedVehicle = JSON.parse(vehicle as string);

  const [cardType, setCardType] = useState('Visa');
  const [cardNumber, setCardNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

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

  function handleCardNumber(text: string) {
    const clean = text.replace(/\D/g, '');
    const groups = clean.match(/.{1,4}/g);
    let formatted = groups ? groups.join(' ') : '';
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
      case 'Visa':             return ['#667eea', '#764ba2', '#6B73FF'];
      case 'MasterCard':       return ['#f12711', '#f5af19', '#f7971e'];
      case 'American Express': return ['#00c6ff', '#0072ff', '#00d2ff'];
      default:                 return ['#667eea', '#764ba2', '#6B73FF'];
    }
  }

  function handleContinue() {
    if (!cardNumber || !holder || !expiry || !cvv) {
      alert('Please fill in all card details.');
      return;
    }
    // Navigate to CheckoutScreen — no payment happens here, just card UX
    router.push({
      pathname: '/checkout-page',
      params: {
        plan,
        vehicle,
        changeSubscriptionId: changeSubscriptionId ?? '',
      },
    } as any);
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
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Card Details</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

            {/* Plan banner */}
            <View style={[s.planBanner, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd', borderColor: isDark ? colors.accent : '#bae6fd' }]}>
              <View style={[s.planIconCircle, { backgroundColor: isDark ? 'rgba(12,166,232,0.2)' : '#bae6fd' }]}>
                <Ionicons name="refresh-circle" size={22} color={colors.accent} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[s.planBannerLabel, { color: colors.textSecondary }]}>{selectedPlan.name} Plan · {selectedVehicle.nickname || `${selectedVehicle.make} ${selectedVehicle.model}`}</Text>
                <Text style={[s.planBannerAmount, { color: colors.accent }]}>LKR {selectedPlan.price.toLocaleString()} / month</Text>
              </View>
            </View>

            {/* Step indicator */}
            <View style={s.stepRow}>
              <View style={[s.stepDot, { backgroundColor: colors.accent }]}>
                <Text style={s.stepNum}>1</Text>
              </View>
              <View style={[s.stepLine, { backgroundColor: colors.accent }]} />
              <View style={[s.stepDot, { backgroundColor: colors.divider }]}>
                <Text style={[s.stepNum, { color: colors.textSecondary }]}>2</Text>
              </View>
              <Text style={[s.stepLabel, { color: colors.textSecondary }]}>  Card details → Review & Pay</Text>
            </View>

            {/* Card preview */}
            <View
              style={s.cardContainer}
              onTouchMove={(e) => handleTilt(e.nativeEvent.locationX > 150 ? 1 : -1)}
              onTouchEnd={() => handleTilt(0)}
            >
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
                  style={[s.typeBtn, { borderColor: colors.divider, backgroundColor: colors.cardBackground }, cardType === type && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => setCardType(type)}
                >
                  <Image source={cardLogos[type]} style={s.selectorLogo} />
                  <Text style={[s.typeText, { color: colors.textSecondary }, cardType === type && { color: '#fff' }]}>
                    {type === 'American Express' ? 'AMEX' : type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.label, { color: colors.textPrimary }]}>Card Number</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
              keyboardType="numeric" value={cardNumber} onChangeText={handleCardNumber}
              placeholderTextColor={colors.textSecondary} placeholder="0000 0000 0000 0000"
            />

            <Text style={[s.label, { color: colors.textPrimary }]}>Card Holder</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
              value={holder} onChangeText={setHolder}
              placeholderTextColor={colors.textSecondary} placeholder="Full name on card" autoCapitalize="words"
            />

            <View style={s.row}>
              <View style={s.half}>
                <Text style={[s.label, { color: colors.textPrimary }]}>Expiry</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                  value={expiry} onFocus={flipFront}
                  onChangeText={(text) => {
                    let cleaned = text.replace(/[^\d]/g, '');
                    if (cleaned.length >= 2) cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
                    setExpiry(cleaned);
                  }}
                  placeholderTextColor={colors.textSecondary} placeholder="MM/YY"
                  keyboardType="numeric" maxLength={5}
                />
              </View>
              <View style={s.half}>
                <Text style={[s.label, { color: colors.textPrimary }]}>CVV</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                  value={cvv} keyboardType="numeric" onFocus={flipBack} onBlur={flipFront}
                  onChangeText={handleCVV} placeholderTextColor={colors.textSecondary}
                  placeholder="***" secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.continueBtn, { backgroundColor: colors.accent }]}
              onPress={handleContinue}
            >
              <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
              <Text style={s.continueBtnText}>Review & Pay</Text>
            </TouchableOpacity>

            <Text style={[s.secureNote, { color: colors.textSecondary }]}>
              Secured by PayHere. Card details never stored on our servers.
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },

  planBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  planIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  planBannerLabel: { fontSize: 13, marginBottom: 2 },
  planBannerAmount: { fontSize: 18, fontWeight: '800' },

  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepLine: { height: 2, width: 20, marginHorizontal: 4 },
  stepLabel: { fontSize: 13 },

  cardContainer: { height: 200, marginBottom: 28 },
  card: { position: 'absolute', width: '100%', height: 200, backfaceVisibility: 'hidden' },
  cardGradient: { flex: 1, borderRadius: 20, padding: 20, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { width: 50, height: 35 },
  nfc: { width: 30, height: 25 },
  cardLogo: { width: 60, height: 35 },
  cardBack: { position: 'absolute', width: '100%', height: 200, backgroundColor: '#1e293b', borderRadius: 20, padding: 20, backfaceVisibility: 'hidden' },
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
  typeBtn: { flex: 1, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', gap: 4 },
  typeText: { fontWeight: '600', fontSize: 12 },

  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 24 },
  continueBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secureNote: { fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
});