import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebaseConfig';
import { useProfile } from '../hooks/useProfile';
import { apiFetch } from '../services/apiClient';

interface Subscription {
  id: string;
  planName: string;
  status: string;
  endDate: string;
  remainingWashes: number;
  totalWashes: number;
  plan?: { color?: string };
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, userType } = useAuth();
  const { theme, isDark, colors, setTheme } = useTheme();
  const { data: profile, isLoading, error, refetch } = useProfile();
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
      if (userType === 'customer') loadSubscription();
    }, [refetch, userType])
  );

  const loadSubscription = async () => {
    try {
      const res = await apiFetch('/subscriptions?status=active', {}, 'customer');
      if (res.success && res.data.subscriptions?.length > 0) {
        setSubscription(res.data.subscriptions[0]);
      } else {
        setSubscription(null);
      }
    } catch {
      // non-fatal — subscription card just won't show
    }
  };
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const storage = getStorage();
      const storageRef = ref(storage, `profile-photos/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firebase Auth profile
      await updateProfile(user, { photoURL: downloadURL });

      // Update backend
      await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({ photoURL: downloadURL }),
      }, userType === 'customer' ? 'customer' : 'provider');

      await refetch();
      Alert.alert('Success', 'Profile photo updated!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/login');
          } catch (err) {
            console.error('Sign out error:', err);
          }
        },
      },
    ]);
  };

  const getUserName = () => {
    if (profile?.displayName) return profile.displayName;
    const first = profile?.firstName || '';
    const last = profile?.lastName || '';
    const combined = `${first} ${last}`.trim();
    return combined || 'WashXpress User';
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
      </View>
    );
  }

  const currentUser = auth.currentUser;
  const isUidValid = profile && currentUser && profile.uid === currentUser.uid;

  if (error || (profile === null && !isLoading)) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>
          Unable to load profile data. Please refresh or check your connection.
        </Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isUidValid && profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="shield-checkmark" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>
          Security validation failed. Please log in again.
        </Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={handleSignOut}>
          <Text style={styles.retryButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const subColor = subscription?.plan?.color || '#0ca6e8';
  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="My Profile"
        theme={isDark ? 'dark' : 'light'}
        rightElement={
          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            style={[styles.editButton, { backgroundColor: colors.accentLight }]}
          >
            <Text style={[styles.editButtonText, { color: colors.accent }]}>Edit</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}>

        {/* ── Avatar Section ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePhotoUpload} disabled={uploadingPhoto} style={styles.avatarWrapper}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.accentLight, borderColor: colors.cardBackground }]}>
              {profile?.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={48} color={colors.accent} />
              )}
            </View>

            <View style={[styles.cameraBadge, { backgroundColor: colors.accent }]}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={14} color="#fff" />
              }
            </View>
          </TouchableOpacity>

  <Text style={[styles.userName, { color: colors.textPrimary }]}>{getUserName()}</Text>

          {/* ── Active Subscription Card (customer only) ── */}
          {userType === 'customer' && subscription && (
            <TouchableOpacity
              style={[styles.subCard, { borderColor: subColor }]}
              onPress={() => router.push('/my-subscription' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.subCardHeader, { backgroundColor: subColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subCardPlan}>{subscription.planName} Plan</Text>
                  <Text style={styles.subCardExpiry}>{daysLeft} days remaining</Text>
                </View>
                <View style={styles.subActiveBadge}>
                  <Text style={styles.subActiveBadgeText}>ACTIVE</Text>
                </View>
              </View>
              <View style={styles.subCardBody}>
                <View style={styles.subWashRow}>
                  <Ionicons name="water-outline" size={16} color={subColor} />
                  <Text style={[styles.subWashLabel, { color: colors.textSecondary }]}>
                    Washes remaining
                  </Text>
                  <Text style={[styles.subWashCount, { color: subColor }]}>
                    {subscription.remainingWashes} / {subscription.totalWashes}
                  </Text>
                </View>
                <View style={styles.subProgressBg}>
                  <View
                    style={[
                      styles.subProgressFill,
                      {
                        backgroundColor: subColor,
                        width: subscription.totalWashes > 0
                          ? `${(subscription.remainingWashes / subscription.totalWashes) * 100}%` as any
                          : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.subManageLink, { color: subColor }]}>Manage Plan →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* No plan prompt for customers */}
          {userType === 'customer' && !subscription && (
            <TouchableOpacity
              style={[styles.noPlanCard, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
              onPress={() => router.push('/subscriptions' as any)}
            >
              <Ionicons name="shield-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.noPlanText, { color: colors.textSecondary }]}>No active plan</Text>
              <Text style={[styles.noPlanLink, { color: colors.accent }]}>Browse Plans →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Preferences ── */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="moon" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Dark Mode</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{isDark ? 'Enabled' : 'Disabled'}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: colors.accent }}
                thumbColor="#f4f3f4"
              />
            </View>
          </View>
        </View>

        {/* ── Contact Information ── */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Contact Information</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="mail" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile?.email || 'N/A'}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="call" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile?.phoneNumber || 'Not provided'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Washer Details (provider only) ── */}
        {userType === 'provider' && (
          <View style={styles.infoSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Washer Details</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="star" size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Rating</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{(profile as any)?.rating || 'N/A'}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.infoRow}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="location" size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Area</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{(profile as any)?.area || 'N/A'}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.infoRow}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="finger-print" size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Washer ID</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile?.uid || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Personal Details ── */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Personal Details</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>First Name</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile?.firstName || 'Not provided'}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Last Name</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile?.lastName || 'Not provided'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Footer: Sign Out ── */}
      <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { marginTop: 16, fontSize: 16, textAlign: 'center' },
  retryButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  editButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  editButtonText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingVertical: 24 },

  avatarSection: { alignItems: 'center', marginBottom: 28, paddingHorizontal: 20 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  userName: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 16 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  avatarWrapper: { position: 'relative', marginBottom: 16 },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  // Subscription card
  subCard: { width: '100%', borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', marginTop: 4 },
  subCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  subCardPlan: { fontSize: 16, fontWeight: '700', color: '#fff' },
  subCardExpiry: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  subActiveBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  subActiveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  subCardBody: { padding: 14 },
  subWashRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  subWashLabel: { flex: 1, fontSize: 13 },
  subWashCount: { fontSize: 13, fontWeight: '700' },
  subProgressBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 10 },
  subProgressFill: { height: 6, borderRadius: 4 },
  subManageLink: { fontSize: 13, fontWeight: '600', textAlign: 'right' },

  // No plan card
  noPlanCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginTop: 4, width: '100%' },
  noPlanText: { flex: 1, fontSize: 14 },
  noPlanLink: { fontSize: 13, fontWeight: '700' },

  infoSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  infoCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, marginLeft: 72 },

  footer: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 108 : 88, borderTopWidth: 1 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1 },
  logoutText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});