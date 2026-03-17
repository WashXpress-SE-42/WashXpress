import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
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
  Switch
} from 'react-native';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebaseConfig';
import { useProfile } from '../hooks/useProfile';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, userType } = useAuth();
  const { theme, isDark, colors, setTheme } = useTheme();
  const { data: profile, isLoading, error, refetch } = useProfile();

  // Refetch profile data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[ProfileScreen] Screen focused - refetching profile');
      refetch();
    }, [refetch])
  );

  const handleSignOut = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
              console.log("✅ Signed out");
            } catch (err) {
              console.error("❌ Sign out error:", err);
            }
          }
        }
      ]
    );
  };

  const getUserName = () => {
    if (profile?.displayName) return profile.displayName;
    const first = profile?.firstName || '';
    const last = profile?.lastName || '';
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    return 'WashXpress User';
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
      </View>
    );
  }

  // UID Validation safeguard
  const currentUser = auth.currentUser;
  const isUidValid = profile && currentUser && profile.uid === currentUser.uid;

  if (error || (profile === null && !isLoading)) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>Unable to load profile data. Please refresh or check your connection.</Text>
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
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>Security validation failed. Please log in again.</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={handleSignOut}>
          <Text style={styles.retryButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.accentLight, borderColor: colors.cardBackground }]}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={48} color={colors.accent} />
            )}
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{getUserName()}</Text>
          
          <View style={[styles.badge, { backgroundColor: colors.accentLight }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              {userType === 'customer' ? (profile?.subscription?.tier || 'Free Member') : 'Verified Washer'}
            </Text>
          </View>
        </View>

        {/* Preferences Section */}
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
                thumbColor={isDark ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Info Cards */}
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

      </ScrollView>

      {/* Footer / Logout */}
      <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.errorLight, borderColor: colors.error }]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingVertical: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});