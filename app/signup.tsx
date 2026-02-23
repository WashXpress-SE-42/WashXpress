import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signup } from '../services/authService';

const carTypes = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Van', 'Wagon'];

const carBrands = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz',
  'Audi', 'Volkswagen', 'Nissan', 'Hyundai', 'Kia', 'Mazda',
  'Subaru', 'Tesla', 'Lexus', 'Acura', 'Other'
];

const carColors = [
  'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue',
  'Green', 'Yellow', 'Orange', 'Brown', 'Beige', 'Gold', 'Other'
];

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 - Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 - Vehicle Information
  const [carType, setCarType] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [carColor, setCarColor] = useState('');

  // Modal states
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

  const isStep1Valid = firstName && lastName && email && (phone.length === 9 || phone.length === 10) && password.length >= 6;
  const isStep2Valid = carType && carBrand && carModel && plateNumber && carColor;

  const handleNext = () => {
    if (!isStep1Valid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      router.back();
    }
  };

  const handleSignup = async () => {
    if (!isStep2Valid) {
      Alert.alert('Error', 'Please fill in all vehicle details');
      return;
    }

    // Validate phone number (9 or 10 digits)
    if (phone.length !== 9 && phone.length !== 10) {
      Alert.alert('Error', 'Phone number must be 9 or 10 digits');
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Creating account...');

      // ✅ Remove leading 0 if present
      const cleanedPhone = phone.startsWith('0') ? phone.substring(1) : phone;

      const payload = {
        displayName: `${firstName} ${lastName}`,
        email,
        password,
        phoneNumber: `+94${cleanedPhone}`,  // ✅ Always 9 digits after +94
      };

      console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

      await signup(payload, 'customer');
      console.log('✅ Account created successfully');

      Alert.alert(
        'Success!',
        'Your account has been created successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/customerOrderScreen' as any),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Signup error:', error);

      let errorMessage = error.message || 'Failed to create account';
      if (error.message === 'Validation failed') {
        errorMessage = 'Please check:\n• Email format is valid\n• Phone number is 9-10 digits\n• Password is at least 6 characters';
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const SelectModal = ({
    visible,
    onClose,
    title,
    options,
    onSelect,
    selectedValue
  }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: string[];
    onSelect: (value: string) => void;
    selectedValue: string;
  }) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  selectedValue === option && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedValue === option && styles.modalOptionTextSelected,
                ]}>
                  {option}
                </Text>
                {selectedValue === option && (
                  <Ionicons name="checkmark" size={20} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Customer Registration</Text>
            <Text style={styles.headerSubtitle}>Step {step} of 2</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 2) * 100}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            // Step 1: Personal Information
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              {/* First Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="John"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Last Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Doe"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="john@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+94</Text>
                  </View>
                  <View style={styles.phoneDivider} />
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="771234567 or 0771234567"
                    value={phone}
                    onChangeText={(text) => {
                      // Only allow numbers and limit to 10 digits
                      const cleaned = text.replace(/[^0-9]/g, '');
                      if (cleaned.length <= 10) {
                        setPhone(cleaned);
                      }
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <Text style={styles.hint}>Enter 9 or 10 digits (0 prefix optional)</Text>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Create a secure password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Minimum 6 characters</Text>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                style={[styles.button, !isStep1Valid && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={!isStep1Valid}
              >
                <Text style={styles.buttonText}>Continue to Vehicle Details</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Step 2: Vehicle Information
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>

              {/* Vehicle Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Type *</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowTypeModal(true)}
                >
                  <Text style={[styles.selectButtonText, !carType && styles.selectButtonPlaceholder]}>
                    {carType || 'Select vehicle type'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Brand */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Brand *</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowBrandModal(true)}
                >
                  <Ionicons name="car-outline" size={20} color="#9ca3af" style={styles.selectIcon} />
                  <Text style={[styles.selectButtonText, !carBrand && styles.selectButtonPlaceholder, { marginLeft: 32 }]}>
                    {carBrand || 'Select brand'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Model */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Model *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 16 }]}
                    placeholder="e.g., Camry, Civic, Model 3"
                    value={carModel}
                    onChangeText={setCarModel}
                  />
                </View>
              </View>

              {/* License Plate */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>License Plate Number *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="pricetag-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="ABC1234"
                    value={plateNumber}
                    onChangeText={(text) => setPlateNumber(text.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Color */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Color *</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowColorModal(true)}
                >
                  <Ionicons name="color-palette-outline" size={20} color="#9ca3af" style={styles.selectIcon} />
                  <Text style={[styles.selectButtonText, !carColor && styles.selectButtonPlaceholder, { marginLeft: 32 }]}>
                    {carColor || 'Select color'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Vehicle Summary Card */}
              {carType && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <Ionicons name="car" size={20} color="#1e40af" />
                    <Text style={styles.summaryTitle}>Vehicle Summary</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Type:</Text>
                    <Text style={styles.summaryValue}>{carType || '-'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Brand:</Text>
                    <Text style={styles.summaryValue}>{carBrand || '-'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Model:</Text>
                    <Text style={styles.summaryValue}>{carModel || '-'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Plate:</Text>
                    <Text style={styles.summaryValue}>{plateNumber || '-'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Color:</Text>
                    <Text style={styles.summaryValue}>{carColor || '-'}</Text>
                  </View>
                </View>
              )}

              {/* Complete Registration Button */}
              <TouchableOpacity
                style={[styles.button, (!isStep2Valid || loading) && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={!isStep2Valid || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Complete Registration</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Modals */}
        <SelectModal
          visible={showTypeModal}
          onClose={() => setShowTypeModal(false)}
          title="Select Vehicle Type"
          options={carTypes}
          onSelect={setCarType}
          selectedValue={carType}
        />

        <SelectModal
          visible={showBrandModal}
          onClose={() => setShowBrandModal(false)}
          title="Select Brand"
          options={carBrands}
          onSelect={setCarBrand}
          selectedValue={carBrand}
        />

        <SelectModal
          visible={showColorModal}
          onClose={() => setShowColorModal(false)}
          title="Select Color"
          options={carColors}
          onSelect={setCarColor}
          selectedValue={carColor}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  formContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectIcon: {
    position: 'absolute',
    left: 16,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  selectButtonPlaceholder: {
    color: '#9ca3af',
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#d1d5db',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#3b82f6',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  modalOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
});