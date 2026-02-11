import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getProfile, signOut, CustomerProfile } from '../services/authService';

export default function CustomerHomeScreen() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      console.log("🔍 Fetching profile...");
      const data = await getProfile();
      console.log("✅ Profile received:", JSON.stringify(data, null, 2));
      setProfile(data);
      setError(null);
    } catch (err: any) {
      console.error("❌ Profile error:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
      console.log("✅ Signed out");
    } catch (err) {
      console.error("❌ Sign out error:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient
            colors={['#2563eb', '#1d4ed8']}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.welcomeText}>Welcome back</Text>
                <Text style={styles.headerTitle}>
                  {profile?.firstName}'s WashXpress
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push('/profile')}
              >
                <Ionicons name="person" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Status Card - No Subscription */}
            <View style={styles.statusCard}>
              <View style={styles.noSubscriptionContent}>
                <Ionicons name="water" size={48} color="#fff" style={styles.dropletIcon} />
                <Text style={styles.statusTitle}>No Active Subscription</Text>
                <Text style={styles.statusSubtext}>
                  Get unlimited washes and save up to 40%
                </Text>
                <TouchableOpacity 
                  style={styles.viewPlansButton}
                  onPress={() => {
                    // Navigate to subscription/plans page
                    console.log("Navigate to plans");
                  }}
                >
                  <Text style={styles.viewPlansButtonText}>View Plans</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => console.log("Book a wash")}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="calendar" size={24} color="#2563eb" />
                </View>
                <Text style={styles.actionTitle}>Book a Wash</Text>
                <Text style={styles.actionSubtitle}>Schedule now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => console.log("Subscribe")}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="cube" size={24} color="#9333ea" />
                </View>
                <Text style={styles.actionTitle}>Subscribe</Text>
                <Text style={styles.actionSubtitle}>Save up to 40%</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => console.log("Add services")}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#fed7aa' }]}>
                  <Ionicons name="add-circle" size={24} color="#ea580c" />
                </View>
                <Text style={styles.actionTitle}>Add Services</Text>
                <Text style={styles.actionSubtitle}>Extra detailing</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => console.log("My bookings")}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="sparkles" size={24} color="#059669" />
                </View>
                <Text style={styles.actionTitle}>My Bookings</Text>
                <Text style={styles.actionSubtitle}>View history</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional Services Preview */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Additional Services</Text>
              <TouchableOpacity onPress={() => console.log("See all services")}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>✨</Text>
              <View style={styles.serviceContent}>
                <View style={styles.popularBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.popularText}>Popular</Text>
                </View>
                <Text style={styles.serviceName}>Ceramic Coating</Text>
                <Text style={styles.serviceDescription}>
                  Premium paint protection lasting 6 months
                </Text>
              </View>
              <Text style={styles.servicePrice}>$150</Text>
            </View>

            <View style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>🧼</Text>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceName}>Deep Interior Clean</Text>
                <Text style={styles.serviceDescription}>
                  Complete interior detailing with steam cleaning
                </Text>
              </View>
              <Text style={styles.servicePrice}>$35</Text>
            </View>

            <View style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>💡</Text>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceName}>Headlight Restoration</Text>
                <Text style={styles.serviceDescription}>
                  Restore cloudy headlights to like-new clarity
                </Text>
              </View>
              <Text style={styles.servicePrice}>$45</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>This Month</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#2563eb' }]}>0</Text>
                  <Text style={styles.statLabel}>Washes Used</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#059669' }]}>$0</Text>
                  <Text style={styles.statLabel}>Saved</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#9333ea' }]}>0</Text>
                  <Text style={styles.statLabel}>Upcoming</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="home" size={24} color="#2563eb" />
            <Text style={[styles.navLabel, { color: '#2563eb' }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="calendar-outline" size={24} color="#6b7280" />
            <Text style={styles.navLabel}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="add-circle-outline" size={24} color="#6b7280" />
            <Text style={styles.navLabel}>Services</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-outline" size={24} color="#6b7280" />
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  noSubscriptionContent: {
    alignItems: 'center',
  },
  dropletIcon: {
    opacity: 0.8,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 12,
  },
  viewPlansButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewPlansButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceIcon: {
    fontSize: 36,
  },
  serviceContent: {
    flex: 1,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  servicePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 20,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
});