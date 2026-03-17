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
import { useTheme } from '../context/ThemeContext';

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
  const { colors, isDark } = useTheme();

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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        style={[s.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <Header
          title={`Washer Registration (Step ${step}/3)`}
          showBackButton
          onBackPress={handleBack}
        />

        {/* Progress */}
        <View style={[s.progressContainer, { backgroundColor: colors.cardBackground }]}>
          <View style={[s.progressTrack, { backgroundColor: colors.divider }]}>
            <View style={[s.progressFill, { width: `${((step - 1) / 2) * 100}%`, backgroundColor: colors.accent }]} />
          </View>
          <View style={s.stepDotsRow}>
            {stepLabels.map((label, i) => (
              <View key={label} style={s.stepDotWrapper}>
                <View style={[
                  s.stepDot,
                  { backgroundColor: colors.divider },
                  i + 1 <= step && [s.stepDotActive, { backgroundColor: colors.accent }],
                  i + 1 < step && [s.stepDotDone, { backgroundColor: colors.success || '#16a34a' }],
                ]}>
                  {i + 1 < step
                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                    : <Text style={[s.stepDotText, { color: colors.textSecondary }, i + 1 <= step && s.stepDotTextActive]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[s.stepLabel, { color: colors.textSecondary }, i + 1 === step && [s.stepLabelActive, { color: colors.accent }]]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <View style={s.formContainer}>
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Personal Information</Text>

              <View style={s.row}>
                <View style={[s.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[s.label, { color: colors.textPrimary }]}>First Name *</Text>
                  <View style={[s.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <TextInput style={[s.input, { color: colors.textPrimary }]} placeholder="John" placeholderTextColor={colors.textSecondary} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                  </View>
                </View>
                <View style={[s.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[s.label, { color: colors.textPrimary }]}>Last Name *</Text>
                  <View style={[s.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <TextInput style={[s.input, { color: colors.textPrimary }]} placeholder="Doe" placeholderTextColor={colors.textSecondary} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                  </View>
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.label, { color: colors.textPrimary }]}>Email Address *</Text>
                <View style={[s.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={s.inputIcon} />
                  <TextInput style={[s.input, { color: colors.textPrimary }]} placeholder="john@example.com" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.label, { color: colors.textPrimary }]}>Phone Number *</Text>
                <View style={[s.phoneInputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <View style={[s.phonePrefix, { backgroundColor: isDark ? colors.background : '#f3f4f6' }]}>
                    <Text style={[s.phonePrefixText, { color: colors.textPrimary }]}>+94</Text>
                  </View>
                  <View style={[s.phoneDivider, { backgroundColor: colors.border }]} />
                  <TextInput
                    style={[s.phoneInput, { color: colors.textPrimary }]}
                    placeholder="771234567"
                    placeholderTextColor={colors.textSecondary}
                    value={phone}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9]/g, '');
                      if (cleaned.length <= 10) setPhone(cleaned);
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <Text style={[s.hint, { color: colors.textSecondary }]}>Enter 9 or 10 digits (0 prefix optional)</Text>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.label, { color: colors.textPrimary }]}>Password *</Text>
                <View style={[s.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={s.inputIcon} />
                  <TextInput style={[s.input, { color: colors.textPrimary }]} placeholder="Create a secure password" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
                  <TouchableOpacity style={s.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={[s.hint, { color: colors.textSecondary }]}>Minimum 6 characters</Text>
              </View>

              <TouchableOpacity
                style={[s.button, { backgroundColor: colors.accent }, !isStep1Valid && s.buttonDisabled]}
                onPress={() => setStep(2)}
                disabled={!isStep1Valid}
              >
                <Text style={s.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Experience & Certification ── */}
          {step === 2 && (
            <View style={s.formContainer}>
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Experience & Certification</Text>
              <Text style={[s.sectionSubtitle, { color: colors.textSecondary }]}>
                Tell us about your car washing experience so we can place you on the right certification path.
              </Text>

              {/* Experience Toggle */}
              <View style={s.inputGroup}>
                <Text style={[s.label, { color: colors.textPrimary }]}>Do you have professional car washing experience? *</Text>
                <View style={s.experienceToggle}>
                  <TouchableOpacity
                    style={[
                      s.experienceOption, 
                      { borderColor: colors.border, backgroundColor: colors.cardBackground },
                      hasExperience === true && [s.experienceOptionActive, { borderColor: colors.success || '#16a34a', backgroundColor: isDark ? 'rgba(22, 163, 74, 0.1)' : '#f0fdf4' }]
                    ]}
                    onPress={() => { setHasExperience(true); setCertificationPath(null); }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color={hasExperience === true ? (colors.success || '#16a34a') : colors.textSecondary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.experienceOptionTitle, { color: colors.textPrimary }, hasExperience === true && [s.experienceOptionTitleActive, { color: colors.success || '#16a34a' }]]}>
                        Yes, I have experience
                      </Text>
                      <Text style={[s.experienceOptionDesc, { color: colors.textSecondary }]}>I've worked at a car wash or detailing center</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.experienceOption, 
                      { borderColor: colors.border, backgroundColor: colors.cardBackground },
                      hasExperience === false && [s.experienceOptionActiveRed, { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#eff6ff' }]
                    ]}
                    onPress={() => { setHasExperience(false); setCurrentWorkplace(''); setYearsOfExperience(''); }}
                  >
                    <Ionicons name="school" size={24} color={hasExperience === false ? colors.accent : colors.textSecondary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.experienceOptionTitle, { color: colors.textPrimary }, hasExperience === false && [s.experienceOptionTitleBlue, { color: colors.accent }]]}>
                        No, I'm new to this
                      </Text>
                      <Text style={[s.experienceOptionDesc, { color: colors.textSecondary }]}>I'll go through WashXpress certification</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* If experienced — show workplace fields */}
              {hasExperience === true && (
                <View style={[s.conditionalSection, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc', borderColor: colors.border }]}>
                  <View style={s.conditionalHeader}>
                    <Ionicons name="briefcase" size={18} color={colors.success || '#16a34a'} />
                    <Text style={[s.conditionalTitle, { color: colors.textPrimary }]}>Professional Experience</Text>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={[s.label, { color: colors.textPrimary }]}>Current / Most Recent Workplace *</Text>
                    <View style={[s.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Ionicons name="business-outline" size={20} color={colors.textSecondary} style={s.inputIcon} />
                      <TextInput
                        style={[s.input, { color: colors.textPrimary }]}
                        placeholder="e.g., Sparkle Car Wash, Colombo"
                        placeholderTextColor={colors.textSecondary}
                        value={currentWorkplace}
                        onChangeText={setCurrentWorkplace}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={[s.label, { color: colors.textPrimary }]}>Years of Experience *</Text>
                    <View style={[s.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Ionicons name="time-outline" size={20} color={colors.textSecondary} style={s.inputIcon} />
                      <TextInput
                        style={[s.input, { color: colors.textPrimary }]}
                        placeholder="e.g., 3"
                        placeholderTextColor={colors.textSecondary}
                        value={yearsOfExperience}
                        onChangeText={(t) => setYearsOfExperience(t.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                      <Text style={{ color: colors.textSecondary, paddingRight: 4 }}>years</Text>
                    </View>
                  </View>

                  <View style={[s.infoBox, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)', borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
                    <Text style={[s.infoBoxText, { color: colors.accent }]}>
                      Our admin team will review your experience and contact you for verification before activation.
                    </Text>
                  </View>
                </View>
              )}

              {/* If no experience — show certification path */}
              {hasExperience === false && (
                <View style={[s.conditionalSection, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc', borderColor: colors.border }]}>
                  <View style={s.conditionalHeader}>
                    <Ionicons name="school" size={18} color={colors.accent} />
                    <Text style={[s.conditionalTitle, { color: colors.textPrimary }]}>Choose Your Certification Path</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      s.certCard, 
                      { borderColor: colors.border, backgroundColor: colors.background },
                      certificationPath === 'field_certification' && [s.certCardActive, { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#eff6ff' }]
                    ]}
                    onPress={() => setCertificationPath('field_certification')}
                  >
                    <View style={s.certCardHeader}>
                      <View style={[s.certIcon, { backgroundColor: colors.divider }, certificationPath === 'field_certification' && [s.certIconActive, { backgroundColor: colors.accent }]]}>
                        <Ionicons name="people" size={24} color={certificationPath === 'field_certification' ? '#fff' : colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[s.certTitle, { color: colors.textPrimary }, certificationPath === 'field_certification' && [s.certTitleActive, { color: colors.accent }]]}>
                          Field Certification
                        </Text>
                        <Text style={[s.certSubtitle, { color: colors.textSecondary }]}>Learn on the job with mentors</Text>
                      </View>
                      {certificationPath === 'field_certification' && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      )}
                    </View>
                    <View style={s.certDetails}>
                      {['Assigned an experienced washer as your mentor', 'Complete 6 evaluated wash jobs', 'Learn real techniques in the field', 'Flexible schedule'].map((item) => (
                        <View key={item} style={s.certDetailRow}>
                          <Ionicons name="checkmark" size={14} color={colors.success || '#16a34a'} />
                          <Text style={[s.certDetailText, { color: colors.textPrimary }]}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.certCard, 
                      { borderColor: colors.border, backgroundColor: colors.background },
                      certificationPath === 'training_center' && [s.certCardActive, { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#eff6ff' }]
                    ]}
                    onPress={() => setCertificationPath('training_center')}
                  >
                    <View style={s.certCardHeader}>
                      <View style={[s.certIcon, { backgroundColor: colors.divider }, certificationPath === 'training_center' && [s.certIconActive, { backgroundColor: colors.accent }]]}>
                        <Ionicons name="school" size={24} color={certificationPath === 'training_center' ? '#fff' : colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[s.certTitle, { color: colors.textPrimary }, certificationPath === 'training_center' && [s.certTitleActive, { color: colors.accent }]]}>
                          Training Center
                        </Text>
                        <Text style={[s.certSubtitle, { color: colors.textSecondary }]}>Attend structured classroom training</Text>
                      </View>
                      {certificationPath === 'training_center' && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      )}
                    </View>
                    <View style={s.certDetails}>
                      {['Assigned to a WashXpress training center', 'Structured curriculum & practice sessions', 'Certification exam at the end', 'Best for complete beginners'].map((item) => (
                        <View key={item} style={s.certDetailRow}>
                          <Ionicons name="checkmark" size={14} color={colors.success || '#16a34a'} />
                          <Text style={[s.certDetailText, { color: colors.textPrimary }]}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[s.button, { backgroundColor: colors.accent }, !isStep2Valid && s.buttonDisabled]}
                onPress={() => setStep(3)}
                disabled={!isStep2Valid}
              >
                <Text style={s.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Service Areas ── */}
          {step === 3 && (
            <View style={s.formContainer}>
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Service Areas</Text>
              <Text style={[s.sectionSubtitle, { color: colors.textSecondary }]}>
                Select the cities and areas where you're available to work. You can update this later from your profile.
              </Text>

              <View style={s.areaGrid}>
                {SRI_LANKA_AREAS.map((area) => {
                  const selected = selectedAreas.includes(area);
                  return (
                    <TouchableOpacity
                      key={area}
                      style={[
                        s.areaChip, 
                        { borderColor: colors.border, backgroundColor: colors.cardBackground },
                        selected && [s.areaChipActive, { backgroundColor: colors.accent, borderColor: colors.accent }]
                      ]}
                      onPress={() => toggleArea(area)}
                    >
                      <Ionicons
                        name={selected ? 'location' : 'location-outline'}
                        size={14}
                        color={selected ? '#fff' : colors.textSecondary}
                      />
                      <Text style={[s.areaChipText, { color: colors.textSecondary }, selected && s.areaChipTextActive]}>
                        {area}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedAreas.length > 0 && (
                <View style={[s.selectedAreasCard, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)', borderColor: colors.border }]}>
                  <View style={s.selectedAreasHeader}>
                    <Ionicons name="map" size={18} color={colors.accent} />
                    <Text style={[s.selectedAreasTitle, { color: colors.accent }]}>
                      {selectedAreas.length} area{selectedAreas.length > 1 ? 's' : ''} selected
                    </Text>
                  </View>
                  <Text style={[s.selectedAreasText, { color: colors.textPrimary }]}>{selectedAreas.join(' · ')}</Text>
                </View>
              )}

              {/* Summary card before final submit */}
              <View style={[s.summaryCard, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc', borderColor: colors.border }]}>
                <Text style={[s.summaryTitle, { color: colors.textPrimary }]}>Registration Summary</Text>
                <View style={[s.summaryRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Name</Text>
                  <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{firstName} {lastName}</Text>
                </View>
                <View style={[s.summaryRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{email}</Text>
                </View>
                <View style={[s.summaryRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Experience</Text>
                  <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{hasExperience ? `${yearsOfExperience} year(s) @ ${currentWorkplace}` : 'New — Certification required'}</Text>
                </View>
                <View style={[s.summaryRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Path</Text>
                  <Text style={[s.summaryValue, { color: colors.textPrimary }]}>
                    {hasExperience
                      ? 'Experience Review'
                      : certificationPath === 'field_certification'
                        ? 'Field Certification'
                        : 'Training Center'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.button, { backgroundColor: colors.accent }, (!isStep3Valid || loading) && s.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!isStep3Valid || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.buttonText}>Submit Application</Text>
                )}
              </TouchableOpacity>

              <Text style={[s.disclaimer, { color: colors.textSecondary }]}>
                By submitting, you agree to WashXpress Terms of Service and Provider Agreement. Your account will be reviewed before activation.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  progressContainer: { paddingBottom: 16, paddingHorizontal: 24 },
  progressTrack: { height: 4, borderRadius: 2, marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 2 },
  stepDotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepDotWrapper: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: {},
  stepDotDone: {},
  stepDotText: { fontSize: 12, fontWeight: '700' },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { fontSize: 11, fontWeight: '500' },
  stepLabelActive: { fontWeight: '700' },

  scrollContent: { padding: 24, paddingBottom: 40 },
  formContainer: { gap: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },

  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  eyeIcon: { padding: 4 },
  hint: { fontSize: 12, marginTop: 4 },

  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    overflow: 'hidden',
  },
  phonePrefix: { paddingHorizontal: 16, paddingVertical: 12 },
  phonePrefixText: { fontSize: 16, fontWeight: '600' },
  phoneDivider: { width: 1, height: 24 },
  phoneInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },

  // Experience toggle
  experienceToggle: { gap: 12 },
  experienceOption: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 16,
    padding: 16,
  },
  experienceOptionActive: {},
  experienceOptionActiveRed: {},
  experienceOptionTitle: { fontSize: 15, fontWeight: '600' },
  experienceOptionTitleActive: {},
  experienceOptionTitleBlue: {},
  experienceOptionDesc: { fontSize: 13, marginTop: 2 },

  // Conditional sections
  conditionalSection: {
    borderRadius: 16,
    padding: 16, marginBottom: 16,
    borderWidth: 1,
  },
  conditionalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  conditionalTitle: { fontSize: 16, fontWeight: '700' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 12, padding: 12,
    borderWidth: 1, marginTop: 4,
  },
  infoBoxText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Certification cards
  certCard: {
    borderWidth: 1.5, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  certCardActive: {},
  certCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  certIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  certIconActive: {},
  certTitle: { fontSize: 16, fontWeight: '700' },
  certTitleActive: {},
  certSubtitle: { fontSize: 13, marginTop: 2 },
  certDetails: { gap: 6 },
  certDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  certDetailText: { fontSize: 13 },

  // Area grid
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  areaChipActive: {},
  areaChipText: { fontSize: 13, fontWeight: '600' },
  areaChipTextActive: { color: '#fff' },

  selectedAreasCard: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, marginBottom: 16,
  },
  selectedAreasHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  selectedAreasTitle: { fontSize: 15, fontWeight: '700' },
  selectedAreasText: { fontSize: 13, lineHeight: 20 },

  // Summary
  summaryCard: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, marginBottom: 16,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 16 },

  button: {
    paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  disclaimer: {
    fontSize: 12, textAlign: 'center',
    marginTop: 16, lineHeight: 18,
  },
});