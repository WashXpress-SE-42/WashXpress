import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { signin, getProfileFromFirebase, updateProfileInFirebase } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SubscriptionAgreementModal from '../components/SubscriptionAgreementModal';

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const { setAuth, logout } = useAuth(); // Global auth context
  const { colors, isDark } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      console.log(`🔐 Logging in as ${selectedRole}...`);
      const result = await signin(email, password, selectedRole);

      // ✅ Update global auth state directly
      if (result.token) {
        await setAuth(result.token, selectedRole, result.user);
      }
      console.log('✅ Login successful:', result);

      // Try checking if agreement was already accepted in Firestore
      if (result.user?.uid) {
         try {
             const profile = await getProfileFromFirebase(result.user.uid, selectedRole);
             if (profile?.agreement) {
                 // Already agreed. Route directly.
                 if (selectedRole === 'customer') {
                   router.replace('/customer-home' as any);
                 } else {
                   router.replace('/washer-home' as any);
                 }
                 return;
             }
         } catch (e) {
             console.warn('Could not fetch agreement status, falling back to prompt.', e);
         }
      }

      // Show agreement modal if agreement is not true
      setShowAgreement(true);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleAgreeAndContinue = async () => {
    setShowAgreement(false);

    try {
      // Save agreement to Firestore
      const userStr = await SecureStore.getItemAsync(selectedRole);
      if (userStr) {
          const u = JSON.parse(userStr);
          if (u.uid) {
              await updateProfileInFirebase(u.uid, selectedRole, { agreement: true });
          }
      }
    } catch (e) {
      console.error('Failed to save agreement status to Firestore:', e);
    }

    // Navigate based on role
    if (selectedRole === 'customer') {
      router.replace('/customer-home' as any);
    } else {
      router.replace('/washer-home' as any);
    }
  };

  const handleCancelAgreement = async () => {
    setShowAgreement(false);
    try {
      await logout(); // Sign out since they didn't agree
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Header */}
          <View style={styles.header}>
           
            <Text style={[styles.title, { color: colors.textPrimary }]}>WashXpress</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Premium Car Care On Demand</Text>
          </View>

          {/* Login Card */}
          <View style={[styles.loginCard, { backgroundColor: colors.cardBackground }]}>
            {/* Role Toggle */}
            <View style={styles.roleSection}>
              <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>Login as</Text>
              <View style={[styles.roleToggle, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === 'customer' && styles.roleButtonActive,
                  ]}
                  onPress={() => setSelectedRole('customer')}
                >
                  <Ionicons
                    name="person"
                    size={20}
                    color={selectedRole === 'customer' ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      { color: colors.textSecondary },
                      selectedRole === 'customer' && [styles.roleButtonTextActive, { color: colors.accent }],
                    ]}
                  >
                    Customer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === 'provider' && styles.roleButtonActive,
                  ]}
                  onPress={() => setSelectedRole('provider')}
                >
                  <Ionicons
                    name="briefcase"
                    size={20}
                    color={selectedRole === 'provider' ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      { color: colors.textSecondary },
                      selectedRole === 'provider' && [styles.roleButtonTextActive, { color: colors.accent }],
                    ]}
                  >
                    Provider
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Email Address</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.inputBackground || colors.background }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.inputBackground || colors.background }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
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
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.accent }, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Social Login */}
            <View style={styles.socialButtons}>
              <TouchableOpacity style={[styles.socialButton, { borderColor: colors.border }]}>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={[styles.socialButtonText, { color: colors.textPrimary }]}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, { borderColor: colors.border }]}>
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                <Text style={[styles.socialButtonText, { color: colors.textPrimary }]}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={[styles.signUpText, { color: colors.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push((selectedRole === 'provider' ? '/washer-signup' : '/signup') as any)}>
                <Text style={[styles.signUpLink, { color: colors.accent }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Role Info */}
          <View style={[styles.roleInfo, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.roleInfoText, { color: colors.textSecondary }]}>
              {selectedRole === 'customer' ? (
                <>
                  <Text style={[styles.roleInfoBold, { color: colors.textPrimary }]}>Customer: </Text>
                  Book washes, manage subscriptions, and track your service history
                </>
              ) : (
                <>
                  <Text style={[styles.roleInfoBold, { color: colors.textPrimary }]}>Service Provider: </Text>
                  Manage appointments, view customer requests, and track earnings
                </>
              )}
            </Text>
          </View>
        </ScrollView>
      </View>

      <SubscriptionAgreementModal
        visible={showAgreement}
        onAgree={handleAgreeAndContinue}
        onCancel={handleCancelAgreement}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1629',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  loginCard: {
    marginHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  roleSection: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  roleButtonTextActive: {
    color: '#2563eb',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  roleInfo: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  roleInfoText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  roleInfoBold: {
    fontWeight: 'bold',
  },
});