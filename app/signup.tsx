import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../services/apiClient';
import { signup } from '../services/authService';

const carTypes = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Van', 'Wagon'];

const carBrands = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz',
  'Audi', 'Volkswagen', 'Nissan', 'Hyundai', 'Kia', 'Mazda',
  'Subaru', 'Tesla', 'Lexus', 'Acura', 'Other',
];

const carColors = [
  'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue',
  'Green', 'Yellow', 'Orange', 'Brown', 'Beige', 'Gold', 'Other',
];

const addressLabels = ['Home', 'Work', 'Other'];


const sriLankaCities = [
  'Colombo', 'Dehiwala-Mount Lavinia', 'Moratuwa', 'Sri Jayawardenepura Kotte',
  'Negombo', 'Kandy', 'Galle', 'Jaffna', 'Kurunegala', 'Ratnapura',
  'Batticaloa', 'Anuradhapura', 'Matara', 'Trincomalee', 'Badulla',
  'Kalmunai', 'Vavuniya', 'Gampaha', 'Kalutara', 'Puttalam', 'Other',
];

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const { colors, isDark } = useTheme();

  // Step 1 — Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 — Vehicle Information
  const [carType, setCarType] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carYear, setCarYear] = useState('');

  // Step 3 — Home Address
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Modal states
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);

  // Stored token after step 1+2 signup — used for address API call in step 3
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  const isStep1Valid =
    firstName && lastName && email &&
    (phone.length === 9 || phone.length === 10) &&
    password.length >= 6;

  const isStep2Valid = carType && carBrand && carModel && plateNumber && carColor && carYear.length === 4;

  const isStep3Valid = addressLine1.trim() && city;

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const handleStep1Next = () => {
    if (!isStep1Valid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setStep(2);
  };

  // ── Step 2 → register account + add vehicle, then proceed to step 3 ────────
  const handleStep2Next = async () => {
    if (!isStep2Valid) {
      Alert.alert('Error', 'Please fill in all vehicle details');
      return;
    }

    setLoading(true);
    try {
      const cleanedPhone = phone.startsWith('0') ? phone.substring(1) : phone;

      // 1️⃣ Register the account (no vehicle in signup payload)
      const result = await signup({
        displayName: `${firstName} ${lastName}`,
        email,
        password,
        phoneNumber: `+94${cleanedPhone}`,
      }, 'customer') as any;

      if (!result.token) throw new Error('No token received');

      // Store auth so apiFetch works for subsequent calls
      setAuthToken(result.token);
      setRegisteredUser(result.user);
    

      // 2️⃣ Add vehicle with the correct backend field names
      await apiFetch('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          make: carBrand,
          model: carModel,
          year: Number(carYear),
          type: carType,
          color: carColor,
          licensePlate: plateNumber,
          nickname: `${carBrand} ${carModel}`,
        }),
      }, 'customer');

      setStep(3);
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      let errorMessage = error.message || 'Failed to create account';
      if (error.message === 'Validation failed') {
        errorMessage =
          'Please check:\n• Email format is valid\n• Phone number is 9-10 digits\n• Password is at least 6 characters';
      }
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 → save address then navigate home ─────────────────────────────
  const handleStep3Complete = async () => {
    if (!isStep3Valid) {
      Alert.alert('Error', 'Please enter your street address and city');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/profile/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: addressLabel,
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          city,
          state: null,
          postalCode: postalCode.trim() || null,
          country: 'Sri Lanka',
          isDefault: true,
        }),
      }, 'customer');

      Alert.alert(
        'Welcome to WashXpress! 🎉',
        'Your account has been created successfully.',
        [{ text: 'Get Started', onPress: () => router.replace('/customer-home' as any) }]
      );
    } catch (error: any) {
      console.error('❌ Address save error:', error);
      // Address failed but account is created — still proceed
      Alert.alert(
        'Almost there!',
        'Account created but address could not be saved. You can add it later in your profile.',
        [{ text: 'Continue', onPress: () => router.replace('/customer-home' as any) }]
      );
    } finally {
      if (authToken && registeredUser) {
        await setAuth(authToken, 'customer', registeredUser);
      }
      setLoading(false);
    }
  };

  const handleSkipAddress = () => {
    Alert.alert(
      'Skip Address?',
      'You can add your home address later from your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => router.replace('/customer-home' as any) },
      ]
    );
  };

  // ── Reusable Select Modal ─────────────────────────────────────────────────
  const SelectModal = ({
    visible, onClose, title, options, onSelect, selectedValue,
  }: {
    visible: boolean; onClose: () => void; title: string;
    options: string[]; onSelect: (v: string) => void; selectedValue: string;
  }) => (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption, 
                  { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider },
                  selectedValue === option && [styles.modalOptionSelected, { backgroundColor: colors.background }]
                ]}
                onPress={() => { onSelect(option); onClose(); }}
              >
                <Text style={[
                  styles.modalOptionText, 
                  { color: colors.textPrimary },
                  selectedValue === option && [styles.modalOptionTextSelected, { color: colors.accent }]
                ]}>
                  {option}
                </Text>
                {selectedValue === option && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ── Step labels for progress ──────────────────────────────────────────────
  const stepLabels = ['Personal', 'Vehicle', 'Address'];

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <Header
          title={`Customer Registration (Step ${step}/3)`}
        />

        {/* Progress Bar with step dots */}
        <View style={[styles.progressContainer, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.progressTrack, { backgroundColor: colors.divider }]}>
            <View style={[styles.progressFill, { width: `${((step - 1) / 2) * 100}%`, backgroundColor: colors.accent }]} />
          </View>
          <View style={styles.stepDotsRow}>
            {stepLabels.map((label, i) => (
              <View key={label} style={styles.stepDotWrapper}>
                <View style={[
                  styles.stepDot,
                  { backgroundColor: colors.divider },
                  i + 1 <= step && [styles.stepDotActive, { backgroundColor: colors.accent }],
                  i + 1 < step && [styles.stepDotDone, { backgroundColor: colors.success || '#16a34a' }],
                ]}>
                  {i + 1 < step
                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                    : <Text style={[styles.stepDotText, { color: colors.textSecondary }, i + 1 <= step && styles.stepDotTextActive]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[styles.stepLabel, { color: colors.textSecondary }, i + 1 === step && [styles.stepLabelActive, { color: colors.accent }]]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── STEP 1: Personal Information ── */}
          {step === 1 && (
            <View style={styles.formContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal Information</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>First Name *</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { color: colors.textPrimary }]} placeholder="John" placeholderTextColor={colors.textSecondary} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Last Name *</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { color: colors.textPrimary }]} placeholder="Doe" placeholderTextColor={colors.textSecondary} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Email Address *</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { color: colors.textPrimary }]} placeholder="john@example.com" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Phone Number *</Text>
                <View style={[styles.phoneInputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <View style={[styles.phonePrefix, { backgroundColor: colors.background }]}>
                    <Text style={[styles.phonePrefixText, { color: colors.textPrimary }]}>+94</Text>
                  </View>
                  <View style={[styles.phoneDivider, { backgroundColor: colors.border }]} />
                  <TextInput
                    style={[styles.phoneInput, { color: colors.textPrimary }]}
                    placeholder="771234567 or 0771234567"
                    placeholderTextColor={colors.textSecondary}
                    value={phone}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, '');
                      if (cleaned.length <= 10) setPhone(cleaned);
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>Enter 9 or 10 digits (0 prefix optional)</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Password *</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { color: colors.textPrimary }]} placeholder="Create a secure password" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>Minimum 6 characters</Text>
              </View>

              <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }, !isStep1Valid && styles.buttonDisabled]} onPress={handleStep1Next} disabled={!isStep1Valid}>
                <Text style={styles.buttonText}>Continue to Vehicle Details</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Vehicle Information ── */}
          {step === 2 && (
            <View style={styles.formContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Vehicle Information</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Vehicle Type *</Text>
                <TouchableOpacity style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]} onPress={() => setShowTypeModal(true)}>
                  <Text style={[styles.selectButtonText, { color: colors.textPrimary }, !carType && [styles.selectButtonPlaceholder, { color: colors.textSecondary }]]}>{carType || 'Select vehicle type'}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Brand *</Text>
                <TouchableOpacity style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]} onPress={() => setShowBrandModal(true)}>
                  <Ionicons name="car-outline" size={20} color={colors.textSecondary} style={styles.selectIcon} />
                  <Text style={[styles.selectButtonText, { color: colors.textPrimary }, !carBrand && [styles.selectButtonPlaceholder, { color: colors.textSecondary }], { marginLeft: 32 }]}>{carBrand || 'Select brand'}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Model *</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <TextInput style={[styles.input, { paddingLeft: 16, color: colors.textPrimary }]} placeholder="e.g., Camry, Civic, Model 3" placeholderTextColor={colors.textSecondary} value={carModel} onChangeText={setCarModel} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>License Plate Number *</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { color: colors.textPrimary }]} placeholder="ABC1234" placeholderTextColor={colors.textSecondary} value={plateNumber} onChangeText={(t) => setPlateNumber(t.toUpperCase())} autoCapitalize="characters" />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Year *</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="e.g., 2020"
                    placeholderTextColor={colors.textSecondary}
                    value={carYear}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9]/g, '');
                      if (cleaned.length <= 4) setCarYear(cleaned);
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Vehicle Color *</Text>
                <TouchableOpacity style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]} onPress={() => setShowColorModal(true)}>
                  <Ionicons name="color-palette-outline" size={20} color={colors.textSecondary} style={styles.selectIcon} />
                  <Text style={[styles.selectButtonText, { color: colors.textPrimary }, !carColor && [styles.selectButtonPlaceholder, { color: colors.textSecondary }], { marginLeft: 32 }]}>{carColor || 'Select color'}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Vehicle Summary Card */}
              {carType && (
                <View style={[styles.summaryCard, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)', borderColor: colors.border }]}>
                  <View style={styles.summaryHeader}>
                    <Ionicons name="car" size={20} color={colors.accent} />
                    <Text style={[styles.summaryTitle, { color: colors.accent }]}>Vehicle Summary</Text>
                  </View>
                  {[
                    { label: 'Type', value: carType },
                    { label: 'Brand', value: carBrand },
                    { label: 'Model', value: carModel },
                    { label: 'Plate', value: plateNumber },
                    { label: 'Color', value: carColor },
                  ].map(({ label, value }) => (
                    <View key={label} style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}:</Text>
                      <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value || '-'}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }, (!isStep2Valid || loading) && styles.buttonDisabled]}
                onPress={handleStep2Next}
                disabled={!isStep2Valid || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Continue to Home Address</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Home Address ── */}
          {step === 3 && (
            <View style={styles.formContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Home Address</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Add your default service address. Washers will come to this location.
              </Text>

              {/* Address Label */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Address Label *</Text>
                <View style={styles.labelButtonRow}>
                  {addressLabels.map((lbl) => (
                    <TouchableOpacity
                      key={lbl}
                      style={[
                        styles.labelChip, 
                        { borderColor: colors.border, backgroundColor: colors.cardBackground },
                        addressLabel === lbl && [styles.labelChipActive, { backgroundColor: colors.accent, borderColor: colors.accent }]
                      ]}
                      onPress={() => setAddressLabel(lbl)}
                    >
                      <Ionicons
                        name={lbl === 'Home' ? 'home-outline' : lbl === 'Work' ? 'briefcase-outline' : 'location-outline'}
                        size={16}
                        color={addressLabel === lbl ? '#fff' : colors.textSecondary}
                      />
                      <Text style={[styles.labelChipText, { color: colors.textSecondary }, addressLabel === lbl && styles.labelChipTextActive]}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Street Address */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Street Address *</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="No. 12, Main Street"
                    placeholderTextColor={colors.textSecondary}
                    value={addressLine1}
                    onChangeText={setAddressLine1}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Apartment / Unit */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Apartment / Unit <Text style={[styles.optional, { color: colors.textSecondary }]}>(optional)</Text></Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="business-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Apt 4B, Floor 3, etc."
                    placeholderTextColor={colors.textSecondary}
                    value={addressLine2}
                    onChangeText={setAddressLine2}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* City */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>City *</Text>
                <TouchableOpacity style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]} onPress={() => setShowCityModal(true)}>
                  <Ionicons name="map-outline" size={20} color={colors.textSecondary} style={styles.selectIcon} />
                  <Text style={[styles.selectButtonText, { color: colors.textPrimary }, !city && [styles.selectButtonPlaceholder, { color: colors.textSecondary }], { marginLeft: 32 }]}>
                    {city || 'Select city'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Postal Code */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Postal Code <Text style={[styles.optional, { color: colors.textSecondary }]}>(optional)</Text></Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="10100"
                    placeholderTextColor={colors.textSecondary}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              {/* Country — fixed */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Country</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="flag-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.input, { color: colors.textSecondary, paddingTop: 13 }]}>Sri Lanka</Text>
                  <Ionicons name="lock-closed" size={16} color={colors.divider} />
                </View>
              </View>

              {/* Address preview card */}
              {addressLine1 && city && (
                <View style={[styles.addressPreviewCard, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)', borderColor: colors.border }]}>
                  <View style={styles.addressPreviewHeader}>
                    <Ionicons name="home" size={18} color={colors.accent} />
                    <Text style={[styles.addressPreviewLabel, { color: colors.textPrimary }]}>{addressLabel}</Text>
                    <View style={[styles.defaultBadge, { backgroundColor: colors.success || '#16a34a' }]}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  </View>
                  <Text style={[styles.addressPreviewLine, { color: colors.textPrimary }]}>{addressLine1}</Text>
                  {addressLine2 ? <Text style={[styles.addressPreviewLine, { color: colors.textPrimary }]}>{addressLine2}</Text> : null}
                  <Text style={[styles.addressPreviewLine, { color: colors.textPrimary }]}>{city}{postalCode ? `, ${postalCode}` : ''}, Sri Lanka</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }, (!isStep3Valid || loading) && styles.buttonDisabled]}
                onPress={handleStep3Complete}
                disabled={!isStep3Valid || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Complete Registration</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={handleSkipAddress}>
                <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Modals */}
        <SelectModal visible={showTypeModal} onClose={() => setShowTypeModal(false)} title="Select Vehicle Type" options={carTypes} onSelect={setCarType} selectedValue={carType} />
        <SelectModal visible={showBrandModal} onClose={() => setShowBrandModal(false)} title="Select Brand" options={carBrands} onSelect={setCarBrand} selectedValue={carBrand} />
        <SelectModal visible={showColorModal} onClose={() => setShowColorModal(false)} title="Select Color" options={carColors} onSelect={setCarColor} selectedValue={carColor} />
        <SelectModal visible={showCityModal} onClose={() => setShowCityModal(false)} title="Select City" options={sriLankaCities} onSelect={setCity} selectedValue={city} />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Progress with step dots
  progressContainer: { backgroundColor: '#fff', paddingBottom: 16, paddingHorizontal: 24 },
  progressTrack: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 2 },
  stepDotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepDotWrapper: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#2563eb' },
  stepDotDone: { backgroundColor: '#16a34a' },
  stepDotText: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  stepLabelActive: { color: '#2563eb', fontWeight: '700' },

  scrollContent: { padding: 24, paddingBottom: 40 },
  formContainer: { gap: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  optional: { fontWeight: '400', color: '#9ca3af' },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, backgroundColor: '#fff',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#111827' },
  eyeIcon: { padding: 4 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  phonePrefix: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f3f4f6' },
  phonePrefixText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  phoneDivider: { width: 1, height: 24, backgroundColor: '#d1d5db' },
  phoneInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#111827' },

  selectButton: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
  },
  selectIcon: { position: 'absolute', left: 16 },
  selectButtonText: { flex: 1, fontSize: 16, color: '#111827' },
  selectButtonPlaceholder: { color: '#9ca3af' },

  summaryCard: {
    backgroundColor: '#eff6ff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#bfdbfe', marginTop: 8, marginBottom: 16,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#3b82f6' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1e3a8a' },

  // Address label chips
  labelButtonRow: { flexDirection: 'row', gap: 10 },
  labelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  labelChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  labelChipText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  labelChipTextActive: { color: '#fff' },

  // Address preview
  addressPreviewCard: {
    backgroundColor: '#eff6ff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#bfdbfe', marginTop: 4, marginBottom: 16,
  },
  addressPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  addressPreviewLabel: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a', flex: 1 },
  defaultBadge: {
    backgroundColor: '#16a34a', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  addressPreviewLine: { fontSize: 14, color: '#374151', marginBottom: 2 },

  button: {
    backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#d1d5db' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  skipButton: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  skipButtonText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalScroll: { maxHeight: 400 },
  modalOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalOptionSelected: { backgroundColor: '#eff6ff' },
  modalOptionText: { fontSize: 16, color: '#374151' },
  modalOptionTextSelected: { color: '#2563eb', fontWeight: '600' },
});