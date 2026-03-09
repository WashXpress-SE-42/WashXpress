import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

const PROVIDER_API_URL = process.env.EXPO_PUBLIC_PROVIDER_API_URL || 'http://localhost:3001/api/provider';

const SRI_LANKA_AREAS = [
  'Colombo', 'Dehiwala-Mount Lavinia', 'Moratuwa', 'Negombo', 'Kandy',
  'Galle', 'Jaffna', 'Kurunegala', 'Ratnapura', 'Batticaloa',
  'Anuradhapura', 'Matara', 'Trincomalee', 'Badulla', 'Gampaha',
  'Kalutara', 'Puttalam', 'Kalmunai', 'Vavuniya', 'Hambantota',
];

type CertificationPath = 'field_certification' | 'training_center';

export default function WasherSignupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();

  // Step 1 — Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 — Experience & Certification
  const [hasExperience, setHasExperience] = useState<boolean | null>(null);
  const [currentWorkplace, setCurrentWorkplace] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [certificationPath, setCertificationPath] = useState<CertificationPath | null>(null);

  // Step 3 — Service Areas
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  // ── Validation ──────────────────────────────────────────────────────────
  const isStep1Valid =
    firstName && lastName && email &&
    (phone.length === 9 || phone.length === 10) &&
    password.length >= 6;

  const isStep2Valid = (() => {
    if (hasExperience === null) return false;
    if (hasExperience === true) return currentWorkplace.trim().length > 0 && yearsOfExperience.length > 0;
    return certificationPath !== null;
  })();

  const isStep3Valid = selectedAreas.length > 0;

  // ── Navigation ──────────────────────────────────────────────────────────
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  // ── Final Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isStep3Valid) {
      Alert.alert('Error', 'Please select at least one service area');
      return;
    }

    setLoading(true);
    try {
      const cleanedPhone = phone.startsWith('0') ? phone.substring(1) : phone;

      const payload: any = {
        displayName: `${firstName} ${lastName}`,
        email,
        password,
        phoneNumber: `+94${cleanedPhone}`,
        serviceAreas: selectedAreas,
        hasExperience,
      };

      if (hasExperience === true) {
        payload.professionalExperience = {
          currentWorkplace: currentWorkplace.trim(),
          yearsOfExperience: Number(yearsOfExperience),
          references: [],
          documents: [],
        };
      } else {
        payload.certificationPath = certificationPath;
      }

      const res = await fetch(`${PROVIDER_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Registration succeeded — no auto-login for washers since they need
      // admin approval before accessing the app
      Alert.alert(
        'Application Submitted! 🎉',
        hasExperience
          ? 'Your professional experience is under review by our admin team. You will be notified once approved.'
          : certificationPath === 'field_certification'
            ? 'You will be assigned mentors for field certification. Complete 6 evaluations to get certified.'
            : 'You will be assigned to a training center. Our team will contact you shortly.',
        [{ text: 'Back to Login', onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      console.error('❌ Washer signup error:', error);
      Alert.alert('Registration Failed', error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step labels ─────────────────────────────────────────────────────────
  const stepLabels = ['Personal', 'Experience', 'Areas'];

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <Header
          title={`Washer Registration (Step ${step}/3)`}
        />

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step - 1) / 2) * 100}%` }]} />
          </View>
          <View style={styles.stepDotsRow}>
            {stepLabels.map((label, i) => (
              <View key={label} style={styles.stepDotWrapper}>
                <View style={[
                  styles.stepDot,
                  i + 1 <= step && styles.stepDotActive,
                  i + 1 < step && styles.stepDotDone,
                ]}>
                  {i + 1 < step
                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                    : <Text style={[styles.stepDotText, i + 1 <= step && styles.stepDotTextActive]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[styles.stepLabel, i + 1 === step && styles.stepLabelActive]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>First Name *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="John" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Last Name *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="Doe" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="john@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+94</Text>
                  </View>
                  <View style={styles.phoneDivider} />
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="771234567"
                    value={phone}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9]/g, '');
                      if (cleaned.length <= 10) setPhone(cleaned);
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <Text style={styles.hint}>Enter 9 or 10 digits (0 prefix optional)</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Create a secure password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Minimum 6 characters</Text>
              </View>

              <TouchableOpacity
                style={[styles.button, !isStep1Valid && styles.buttonDisabled]}
                onPress={() => setStep(2)}
                disabled={!isStep1Valid}
              >
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Experience & Certification ── */}
          {step === 2 && (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Experience & Certification</Text>
              <Text style={styles.sectionSubtitle}>
                Tell us about your car washing experience so we can place you on the right certification path.
              </Text>

              {/* Experience Toggle */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Do you have professional car washing experience? *</Text>
                <View style={styles.experienceToggle}>
                  <TouchableOpacity
                    style={[styles.experienceOption, hasExperience === true && styles.experienceOptionActive]}
                    onPress={() => { setHasExperience(true); setCertificationPath(null); }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color={hasExperience === true ? '#16a34a' : '#9ca3af'} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.experienceOptionTitle, hasExperience === true && styles.experienceOptionTitleActive]}>
                        Yes, I have experience
                      </Text>
                      <Text style={styles.experienceOptionDesc}>I've worked at a car wash or detailing center</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.experienceOption, hasExperience === false && styles.experienceOptionActiveRed]}
                    onPress={() => { setHasExperience(false); setCurrentWorkplace(''); setYearsOfExperience(''); }}
                  >
                    <Ionicons name="school" size={24} color={hasExperience === false ? '#2563eb' : '#9ca3af'} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.experienceOptionTitle, hasExperience === false && styles.experienceOptionTitleBlue]}>
                        No, I'm new to this
                      </Text>
                      <Text style={styles.experienceOptionDesc}>I'll go through WashXpress certification</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* If experienced — show workplace fields */}
              {hasExperience === true && (
                <View style={styles.conditionalSection}>
                  <View style={styles.conditionalHeader}>
                    <Ionicons name="briefcase" size={18} color="#16a34a" />
                    <Text style={styles.conditionalTitle}>Professional Experience</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current / Most Recent Workplace *</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="business-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Sparkle Car Wash, Colombo"
                        value={currentWorkplace}
                        onChangeText={setCurrentWorkplace}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Years of Experience *</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="time-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., 3"
                        value={yearsOfExperience}
                        onChangeText={(t) => setYearsOfExperience(t.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                      <Text style={{ color: '#6b7280', paddingRight: 4 }}>years</Text>
                    </View>
                  </View>

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
                    <Text style={styles.infoBoxText}>
                      Our admin team will review your experience and contact you for verification before activation.
                    </Text>
                  </View>
                </View>
              )}

              {/* If no experience — show certification path */}
              {hasExperience === false && (
                <View style={styles.conditionalSection}>
                  <View style={styles.conditionalHeader}>
                    <Ionicons name="school" size={18} color="#2563eb" />
                    <Text style={styles.conditionalTitle}>Choose Your Certification Path</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.certCard, certificationPath === 'field_certification' && styles.certCardActive]}
                    onPress={() => setCertificationPath('field_certification')}
                  >
                    <View style={styles.certCardHeader}>
                      <View style={[styles.certIcon, certificationPath === 'field_certification' && styles.certIconActive]}>
                        <Ionicons name="people" size={24} color={certificationPath === 'field_certification' ? '#fff' : '#6b7280'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.certTitle, certificationPath === 'field_certification' && styles.certTitleActive]}>
                          Field Certification
                        </Text>
                        <Text style={styles.certSubtitle}>Learn on the job with mentors</Text>
                      </View>
                      {certificationPath === 'field_certification' && (
                        <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                      )}
                    </View>
                    <View style={styles.certDetails}>
                      {['Assigned an experienced washer as your mentor', 'Complete 6 evaluated wash jobs', 'Learn real techniques in the field', 'Flexible schedule'].map((item) => (
                        <View key={item} style={styles.certDetailRow}>
                          <Ionicons name="checkmark" size={14} color="#16a34a" />
                          <Text style={styles.certDetailText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.certCard, certificationPath === 'training_center' && styles.certCardActive]}
                    onPress={() => setCertificationPath('training_center')}
                  >
                    <View style={styles.certCardHeader}>
                      <View style={[styles.certIcon, certificationPath === 'training_center' && styles.certIconActive]}>
                        <Ionicons name="school" size={24} color={certificationPath === 'training_center' ? '#fff' : '#6b7280'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.certTitle, certificationPath === 'training_center' && styles.certTitleActive]}>
                          Training Center
                        </Text>
                        <Text style={styles.certSubtitle}>Attend structured classroom training</Text>
                      </View>
                      {certificationPath === 'training_center' && (
                        <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                      )}
                    </View>
                    <View style={styles.certDetails}>
                      {['Assigned to a WashXpress training center', 'Structured curriculum & practice sessions', 'Certification exam at the end', 'Best for complete beginners'].map((item) => (
                        <View key={item} style={styles.certDetailRow}>
                          <Ionicons name="checkmark" size={14} color="#16a34a" />
                          <Text style={styles.certDetailText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, !isStep2Valid && styles.buttonDisabled]}
                onPress={() => setStep(3)}
                disabled={!isStep2Valid}
              >
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Service Areas ── */}
          {step === 3 && (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Service Areas</Text>
              <Text style={styles.sectionSubtitle}>
                Select the cities and areas where you're available to work. You can update this later from your profile.
              </Text>

              <View style={styles.areaGrid}>
                {SRI_LANKA_AREAS.map((area) => {
                  const selected = selectedAreas.includes(area);
                  return (
                    <TouchableOpacity
                      key={area}
                      style={[styles.areaChip, selected && styles.areaChipActive]}
                      onPress={() => toggleArea(area)}
                    >
                      <Ionicons
                        name={selected ? 'location' : 'location-outline'}
                        size={14}
                        color={selected ? '#fff' : '#6b7280'}
                      />
                      <Text style={[styles.areaChipText, selected && styles.areaChipTextActive]}>
                        {area}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedAreas.length > 0 && (
                <View style={styles.selectedAreasCard}>
                  <View style={styles.selectedAreasHeader}>
                    <Ionicons name="map" size={18} color="#1e40af" />
                    <Text style={styles.selectedAreasTitle}>
                      {selectedAreas.length} area{selectedAreas.length > 1 ? 's' : ''} selected
                    </Text>
                  </View>
                  <Text style={styles.selectedAreasText}>{selectedAreas.join(' · ')}</Text>
                </View>
              )}

              {/* Summary card before final submit */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Registration Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Name</Text>
                  <Text style={styles.summaryValue}>{firstName} {lastName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Email</Text>
                  <Text style={styles.summaryValue}>{email}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Experience</Text>
                  <Text style={styles.summaryValue}>{hasExperience ? `${yearsOfExperience} year(s) @ ${currentWorkplace}` : 'New — Certification required'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Path</Text>
                  <Text style={styles.summaryValue}>
                    {hasExperience
                      ? 'Experience Review'
                      : certificationPath === 'field_certification'
                        ? 'Field Certification'
                        : 'Training Center'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, (!isStep3Valid || loading) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!isStep3Valid || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Submit Application</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                By submitting, you agree to WashXpress Terms of Service and Provider Agreement. Your account will be reviewed before activation.
              </Text>
            </View>
          )}
        </ScrollView>
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

  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },

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

  // Experience toggle
  experienceToggle: { gap: 12 },
  experienceOption: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 16,
    padding: 16, backgroundColor: '#fff',
  },
  experienceOptionActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  experienceOptionActiveRed: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  experienceOptionTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  experienceOptionTitleActive: { color: '#16a34a' },
  experienceOptionTitleBlue: { color: '#2563eb' },
  experienceOptionDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  // Conditional sections
  conditionalSection: {
    backgroundColor: '#f8fafc', borderRadius: 16,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  conditionalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  conditionalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bfdbfe', marginTop: 4,
  },
  infoBoxText: { flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 18 },

  // Certification cards
  certCard: {
    borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 16,
    padding: 16, backgroundColor: '#fff', marginBottom: 12,
  },
  certCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  certCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  certIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  certIconActive: { backgroundColor: '#2563eb' },
  certTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  certTitleActive: { color: '#1d4ed8' },
  certSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  certDetails: { gap: 6 },
  certDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  certDetailText: { fontSize: 13, color: '#374151' },

  // Area grid
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  areaChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  areaChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  areaChipTextActive: { color: '#fff' },

  selectedAreasCard: {
    backgroundColor: '#eff6ff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 16,
  },
  selectedAreasHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  selectedAreasTitle: { fontSize: 15, fontWeight: '700', color: '#1e40af' },
  selectedAreasText: { fontSize: 13, color: '#374151', lineHeight: 20 },

  // Summary
  summaryCard: {
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#1e293b', flex: 1, textAlign: 'right', marginLeft: 16 },

  button: {
    backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#d1d5db' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  disclaimer: {
    fontSize: 12, color: '#9ca3af', textAlign: 'center',
    marginTop: 16, lineHeight: 18,
  },
});