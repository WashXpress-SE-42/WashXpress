import { apiFetch } from '@/services/apiClient';
import { getProfileFromFirebase } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { sendEmailVerification } from 'firebase/auth';

import { Href, useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState, useCallback } from 'react';
import SkeletonLoader from '@/components/SkeletonLoader';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width * 0.72;
const SPACING = 10;
const EMPTY_ITEM_SIZE = (width - ITEM_SIZE) / 2;

interface User {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  nickname: string;
  licensePlate: string;
}

interface Booking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  service: { name: string };
  provider?: { displayName: string } | null;
}

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: string;
  remainingWashes: number;
  remainingInteriorCleans: number;
  remainingTireCleans: number;
  remainingFullDetails: number;
}

interface CarouselServiceItem {
  id: string;
  name?: string;
  icon?: any;
  route?: string;
}

// ── Carousel items now route to service-browse with category filter ──────────
const REAL_SERVICES: CarouselServiceItem[] = [
  { id: '1', name: 'Exterior Wash',  icon: require('../assets/icons/washing.jpg'),           route: '/service-browse?category=exterior-wash'  },
  { id: '2', name: 'Interior Clean', icon: require('../assets/icons/interior_cleaning.jpg'), route: '/service-browse?category=interior-clean' },
  { id: '3', name: 'Full Detail',    icon: require('../assets/icons/detailing.jpg'),         route: '/service-browse?category=full-detail'    },
  { id: '4', name: 'Tire Cleaning',  icon: require('../assets/icons/tire_cleaning.jpg'),     route: '/service-browse?category=tire-cleaning'  },
  { id: '5', name: 'Headlight Repair', icon: require('../assets/icons/headlight_cleaning.jpg'), route: '/service-browse' },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isEmailVerified, refreshEmailVerification } = useAuth();
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!loading) {
      const hasActiveAllowances = activeSubscription && (
        activeSubscription.remainingWashes > 0 ||
        activeSubscription.remainingInteriorCleans > 0 ||
        activeSubscription.remainingTireCleans > 0 ||
        activeSubscription.remainingFullDetails > 0
      );

      if (!hasActiveAllowances) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [loading, activeSubscription]);

  const DATA = React.useMemo(() => {
    const REPEAT_COUNT = 100;
    return Array(REPEAT_COUNT).fill(REAL_SERVICES).flat().map((item, index) => ({
      ...item,
      id: `${item.id}-${index}`,
    }));
  }, []);

  useEffect(() => { loadData(); }, []);

  // Prefetch critical navigation data silently on screen focus
  useFocusEffect(
    useCallback(() => {
      apiFetch('/subscriptions/plans', { useCache: true }, 'customer').catch(() => {});
      apiFetch('/subscriptions', { useCache: true }, 'customer').catch(() => {});
      apiFetch('/bookings', { useCache: true }, 'customer').catch(() => {});
    }, [])
  );

  // Prevent back button from navigating away from home
  useEffect(() => {
    const backAction = () => {
      Alert.alert('Exit App', 'Are you sure you want to exit?', [
        { text: 'Cancel', onPress: () => null, style: 'cancel' },
        { text: 'Exit', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  
  // No longer need local useEffect for email verification status

  const loadData = async () => {
    try {
      setLoading(true);

      const userData = await SecureStore.getItemAsync('customer');
      let parsedUser: User | null = null;
      if (userData) {
        parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }

      if (parsedUser?.uid) {
        try {
          const profile = await getProfileFromFirebase(parsedUser.uid, 'customer');
          if (profile) {
            const profileFirstName =
              profile.firstName ||
              (profile.displayName ? profile.displayName.split(' ')[0] : '') ||
              (parsedUser.displayName ? parsedUser.displayName.split(' ')[0] : '');

            setUser({
              ...parsedUser,
              firstName: profileFirstName,
              lastName: profile.lastName,
              displayName: profile.displayName || parsedUser.displayName,
              photoURL: profile.photoURL || parsedUser.photoURL,
            } as User);
          }
        } catch (err) {
          console.warn('Could not fetch profile from Firestore:', err);
        }
      }

      await Promise.all([loadVehicles(), loadActiveBookings(), loadActiveSubscription()]);
    } catch (error: any) {
      console.error('Load data error:', error);
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      // The original instruction seems to be for AuthContext, not customer-home.tsx.
      // In customer-home.tsx, we only need to set the local loading state.
      // The `isEmailVerified` status is managed by AuthContext and accessed via `useAuth()`.
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const data = await apiFetch('/vehicles', {}, 'customer');
      if (data.success) setVehicles(data.data.vehicles);
    } catch (error) {
      console.error('Load vehicles error:', error);
    }
  };

  const loadActiveBookings = async () => {
    try {
      const data = await apiFetch('/bookings?status=confirmed&limit=3', {}, 'customer');
      if (data.success) setActiveBookings(data.data.bookings);
    } catch (error) {
      console.error('Load bookings error:', error);
    }
  };

  const loadActiveSubscription = async () => {
    try {
      const data = await apiFetch('/subscriptions?status=active', {}, 'customer');
      if (data.success && data.data.subscriptions?.length > 0) {
        setActiveSubscription(data.data.subscriptions[0]);
      }
    } catch (error) {
      console.error('Load subscription error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending:     colors.warning     || '#FFA500',
      confirmed:   colors.success     || '#4CAF50',
      in_progress: colors.accent      || '#2196F3',
      completed:   colors.textSecondary || '#9E9E9E',
    };
    return statusColors[status] || colors.textSecondary;
  };

  if (loading) {
    return (
      <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.cardBackground, paddingBottom: 24 }]}>
          <View>
            <SkeletonLoader width={80} height={18} borderRadius={4} style={{ marginBottom: 8 }} />
            <SkeletonLoader width={140} height={28} borderRadius={6} />
          </View>
          <SkeletonLoader width={50} height={50} borderRadius={25} />
        </View>
        <View style={styles.section}>
          <SkeletonLoader width={120} height={24} borderRadius={6} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row' }}>
            <SkeletonLoader width={140} height={130} borderRadius={16} style={{ marginRight: 12 }} />
            <SkeletonLoader width={140} height={130} borderRadius={16} />
          </View>
        </View>
        <View style={styles.section}>
          <SkeletonLoader width={160} height={24} borderRadius={6} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
          <SkeletonLoader width="100%" height={120} borderRadius={16} />
        </View>
      </View>
    );
  }

  const greetingName =
    user?.firstName ||
    (user?.displayName ? user.displayName.split(' ')[0] : '') ||
    'User';

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hello,</Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{greetingName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile' as Href)}>
            <View style={[styles.profilePic, { backgroundColor: colors.background }]}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person" size={24} color={colors.textSecondary} />
              )}
            </View>
          </TouchableOpacity>
        </View>
        
        {!isEmailVerified && (
          <TouchableOpacity
            style={[styles.verifyBanner, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb' }]}
            onPress={async () => {
              const user = getAuth().currentUser;
              if (user) {
                try {
                  await sendEmailVerification(user);
                  Alert.alert('Email Sent', 'Verification email resent. Check your inbox.', [
                    { text: 'OK', onPress: () => refreshEmailVerification() }
                  ]);
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to send verification email.');
                }
              }
            }}
          >
            <Ionicons name="mail-outline" size={18} color="#f59e0b" />
            <Text style={[styles.verifyBannerTxt, { color: isDark ? '#fbbf24' : '#92400e' }]}>Tap to verify your email address</Text>
            <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
          </TouchableOpacity>
        )}

        {/* ── My Vehicles ── */}
        {vehicles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Vehicles</Text>
              <TouchableOpacity onPress={() => router.push('/vehicle-list' as Href)}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[styles.vehicleCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push(`/add-vehicle?vehicleId=${vehicle.id}&edit=true` as Href)}
                >
                  <Ionicons name="car-sport" size={28} color={colors.accent} />
                  <Text style={[styles.vehicleName, { color: colors.textPrimary }]}>{vehicle.nickname}</Text>
                  <Text style={[styles.vehicleModel, { color: colors.textSecondary }]}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={[styles.vehiclePlate, { color: colors.accent }]}>{vehicle.licensePlate}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.vehicleCard, styles.addVehicleCard, { borderColor: colors.accent }]}
                onPress={() => router.push('/add-vehicle' as Href)}
              >
                <Ionicons name="add-circle" size={28} color={colors.accent} />
                <Text style={[styles.addVehicleText, { color: colors.accent }]}>Add Vehicle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ── Active Subscription Allowances or CTA ── */}
        {activeSubscription &&
          (activeSubscription.remainingWashes > 0 ||
            activeSubscription.remainingInteriorCleans > 0 ||
            activeSubscription.remainingTireCleans > 0 ||
            activeSubscription.remainingFullDetails > 0) ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Available in Plan</Text>
                <TouchableOpacity onPress={() => router.push('/my-subscription' as Href)}>
                  <Text style={[styles.seeAll, { color: colors.accent }]}>Manage Plan</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.subscriptionCard, { backgroundColor: colors.cardBackground }]}>
                {activeSubscription.remainingWashes > 0 && (
                  <View style={[styles.allowanceRow, { borderBottomColor: colors.divider }]}>
                    <View style={styles.allowanceInfo}>
                      <View style={[styles.allowanceIconWrapper, { backgroundColor: colors.background }]}>
                        <Ionicons name="water-outline" size={20} color="#0ca6e8" />
                      </View>
                      <View style={styles.allowanceTextContainer}>
                        <Text style={[styles.allowanceName, { color: colors.textPrimary }]}>Exterior Wash</Text>
                        <Text style={[styles.allowanceCount, { color: colors.textSecondary }]}>{activeSubscription.remainingWashes} remaining</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.allowanceOrderBtn, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}
                      onPress={() => router.push('/service-browse?category=exterior-wash' as Href)}
                    >
                      <Text style={[styles.allowanceOrderBtnText, { color: colors.accent }]}>Order</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeSubscription.remainingInteriorCleans > 0 && (
                  <View style={[styles.allowanceRow, { borderBottomColor: colors.divider }]}>
                    <View style={styles.allowanceInfo}>
                      <View style={[styles.allowanceIconWrapper, { backgroundColor: colors.background }]}>
                        <Ionicons name="sparkles-outline" size={20} color="#7c3aed" />
                      </View>
                      <View style={styles.allowanceTextContainer}>
                        <Text style={[styles.allowanceName, { color: colors.textPrimary }]}>Interior Clean</Text>
                        <Text style={[styles.allowanceCount, { color: colors.textSecondary }]}>{activeSubscription.remainingInteriorCleans} remaining</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.allowanceOrderBtn, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}
                      onPress={() => router.push('/service-browse?category=interior-clean' as Href)}
                    >
                      <Text style={[styles.allowanceOrderBtnText, { color: colors.accent }]}>Order</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeSubscription.remainingTireCleans > 0 && (
                  <View style={[styles.allowanceRow, { borderBottomColor: colors.divider }]}>
                    <View style={styles.allowanceInfo}>
                      <View style={[styles.allowanceIconWrapper, { backgroundColor: colors.background }]}>
                        <Ionicons name="disc-outline" size={20} color="#d97706" />
                      </View>
                      <View style={styles.allowanceTextContainer}>
                        <Text style={[styles.allowanceName, { color: colors.textPrimary }]}>Tire Cleaning</Text>
                        <Text style={[styles.allowanceCount, { color: colors.textSecondary }]}>{activeSubscription.remainingTireCleans} remaining</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.allowanceOrderBtn, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}
                      onPress={() => router.push('/service-browse?category=tire-cleaning' as Href)}
                    >
                      <Text style={[styles.allowanceOrderBtnText, { color: colors.accent }]}>Order</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeSubscription.remainingFullDetails > 0 && (
                  <View style={[styles.allowanceRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <View style={styles.allowanceInfo}>
                      <View style={[styles.allowanceIconWrapper, { backgroundColor: colors.background }]}>
                        <Ionicons name="star-outline" size={20} color="#059669" />
                      </View>
                      <View style={styles.allowanceTextContainer}>
                        <Text style={[styles.allowanceName, { color: colors.textPrimary }]}>Full Detail</Text>
                        <Text style={[styles.allowanceCount, { color: colors.textSecondary }]}>{activeSubscription.remainingFullDetails} remaining</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.allowanceOrderBtn, { backgroundColor: '#059669' }]}
                      onPress={() => router.push('/service-browse?category=full-detail' as Href)}
                    >
                      <Text style={[styles.allowanceOrderBtnText, { color: '#FFF' }]}>Order</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>WashXpress Plans</Text>
              </View>
              <View style={[styles.ctaCard, { backgroundColor: colors.cardBackground, shadowColor: isDark ? '#000' : '#888' }]}>
                <View style={styles.ctaCardContent}>
                  <View style={[styles.ctaIconContainer, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}>
                    <Ionicons name="star" size={28} color={colors.accent || '#2563EB'} />
                  </View>
                  <View style={styles.ctaTextContainer}>
                    <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Subscribe to WashXpress</Text>
                    <Text style={[styles.ctaDescription, { color: colors.textSecondary }]}>Enjoy exclusive benefits, priority service, and up to 30% savings on every wash.</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[styles.ctaButton, { backgroundColor: colors.accent || '#2563EB' }]}
                  onPress={() => router.push('/subscriptions' as Href)}
                >
                  <Text style={styles.ctaButtonText}>View Plans</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={styles.ctaButtonIcon} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

        {/* ── Active Bookings ── */}
        {activeBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Active Bookings</Text>
              <TouchableOpacity onPress={() => router.push('/booking-list' as Href)}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={[styles.bookingCard, { backgroundColor: colors.cardBackground }]}
                onPress={() =>
                  router.push({ pathname: '/booking-details', params: { id: booking.id } } as any)
                }
              >
                <View style={styles.bookingHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bookingService, { color: colors.textPrimary }]}>{booking.service.name}</Text>
                    <Text style={[styles.bookingProvider, { color: colors.textSecondary }]}>
                      {booking.provider?.displayName ?? 'WashXpress Provider'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                    <Text style={styles.statusText}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookingFooter}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.bookingDate, { color: colors.textSecondary }]}>
                    {booking.scheduledDate} at {booking.scheduledTime}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Service Carousel ── */}
        <View style={styles.carouselContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, paddingHorizontal: 20 }]}>Our Services</Text>
          <Animated.FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={DATA}
            keyExtractor={(item: CarouselServiceItem) => item.id}
            snapToInterval={ITEM_SIZE}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: EMPTY_ITEM_SIZE }}
            snapToAlignment="start"
            decelerationRate="fast"
            initialScrollIndex={Math.floor(DATA.length / 2)}
            getItemLayout={(_, index) => ({ length: ITEM_SIZE, offset: ITEM_SIZE * index, index })}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX as any } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            renderItem={({ item, index }: { item: CarouselServiceItem; index: number }) => {
              if (!item.name) return <View style={{ width: EMPTY_ITEM_SIZE }} />;

              const inputRange = [(index - 1) * ITEM_SIZE, index * ITEM_SIZE, (index + 1) * ITEM_SIZE];
              const scale = (scrollX as any).interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
              const opacity = (scrollX as any).interpolate({ inputRange, outputRange: [0.7, 1, 0.7], extrapolate: 'clamp' });

              return (
                <Animated.View style={{ width: ITEM_SIZE, transform: [{ scale }], opacity }}>
                  <TouchableOpacity
                    style={[styles.serviceItem, { backgroundColor: colors.cardBackground }]}
                    onPress={() => router.push(item.route as Href)}
                    activeOpacity={0.9}
                  >
                    <Image source={item.icon} style={styles.carouselImage} />
                    <View style={styles.carouselOverlay}>
                      <Text style={styles.carouselLabel}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
          />
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  verifyBannerTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: '#f59e0b' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFF' },
  greeting: { fontSize: 16, color: '#666' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#000', marginTop: 4 },
  profilePic: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 50, height: 50, borderRadius: 25 },

  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 10, paddingBottom: 28, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E0E0E0', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 8 },
  actionButton: { alignItems: 'center' },
  actionText: { fontSize: 12, color: '#666', marginTop: 8 },

  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#000', paddingHorizontal: 20, marginBottom: 5 },
  seeAll: { fontSize: 14, color: '#007AFF' },

  vehicleCard: { width: 140, borderRadius: 16, padding: 16, marginRight: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  vehicleName: { fontSize: 16, fontWeight: '600', color: '#000', marginTop: 12 },
  vehicleModel: { fontSize: 12, color: '#666', marginTop: 4 },
  vehiclePlate: { fontSize: 12, color: '#007AFF', marginTop: 4, fontWeight: '500' },
  addVehicleCard: { justifyContent: 'center', borderWidth: 2, borderColor: '#007AFF', borderStyle: 'dashed', backgroundColor: 'transparent' },
  addVehicleText: { fontSize: 14, color: '#007AFF', marginTop: 8 },

  bookingCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingService: { fontSize: 16, fontWeight: '600', color: '#000' },
  bookingProvider: { fontSize: 14, color: '#666', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  bookingFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  bookingDate: { fontSize: 14, color: '#666', marginLeft: 8 },

  carouselContainer: { paddingVertical: 20 },
  serviceItem: { marginHorizontal: SPACING, height: 220, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 },
  carouselImage: { width: '100%', height: '100%', position: 'absolute' },
  carouselOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', padding: 20 },
  carouselLabel: { fontSize: 20, color: '#FFF', fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },

  subscriptionCard: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  allowanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  allowanceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  allowanceIconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  allowanceTextContainer: { flex: 1 },
  allowanceName: { fontSize: 15, fontWeight: '600', color: '#0d1629', marginBottom: 2 },
  allowanceCount: { fontSize: 13, color: '#64748b' },
  allowanceOrderBtn: { backgroundColor: '#e0f2fe', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: 12 },
  allowanceOrderBtnText: { fontSize: 13, fontWeight: '700', color: '#0ca6e8' },

  ctaCard: { borderRadius: 16, padding: 18, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  ctaCardContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  ctaIconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  ctaTextContainer: { flex: 1, justifyContent: 'center' },
  ctaTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  ctaDescription: { fontSize: 13, lineHeight: 18 },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  ctaButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  ctaButtonIcon: { marginLeft: 6, marginTop: 1 },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, marginHorizontal: 20, padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#FF3B30' },
  logoutText: { fontSize: 16, color: '#FF3B30', marginLeft: 8, fontWeight: '600' },
});