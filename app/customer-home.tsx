import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width * 0.72;
const SPACING = 10;
const EMPTY_ITEM_SIZE = (width - ITEM_SIZE) / 2;

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  currency: string;
  rating: number;
  provider: {
    displayName: string;
    area: string;
    rating: number;
  };
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
  service: {
    name: string;
  };
  provider: {
    displayName: string;
  };
}

interface CarouselServiceItem {
  id: string;
  name?: string;
  icon?: any; // require() returns a number in React Native
  route?: string;
}

const REAL_SERVICES: CarouselServiceItem[] = [
  { id: '1', name: 'Exterior Wash', icon: require('../assets/icons/washing.jpg'), route: '/ExteriorWashScreen' },
  { id: '2', name: 'Interior Clean', icon: require('../assets/icons/interior_cleaning.jpg'), route: '/InteriorWashScreen' },
  { id: '3', name: 'Full Detail', icon: require('../assets/icons/detailing.jpg'), route: '/FullDetailScreen' },
  { id: '4', name: 'Tire Cleaning', icon: require('../assets/icons/tire_cleaning.jpg'), route: '/TireCleaningScreen' },
  { id: '5', name: 'Headlight Repair', icon: require('../assets/icons/headlight_cleaning.jpg'), route: '/HeadlightRepairScreen' },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollX = React.useRef(new Animated.Value(0)).current;

  const DATA = React.useMemo(() => {
    const REPEAT_COUNT = 100;
    return Array(REPEAT_COUNT).fill(REAL_SERVICES).flat().map((item, index) => ({
      ...item,
      id: `${item.id}-${index}`
    }));
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load user from storage (AuthService saves under 'customer' or 'provider')
      const userData = await SecureStore.getItemAsync('customer');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Load all data in parallel
      await Promise.all([
        loadVehicles(),
        loadActiveBookings(),
      ]);
    } catch (error: any) {
      console.error('Load data error:', error);
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };



  const loadVehicles = async () => {
    try {
      const data = await apiFetch('/vehicles', {}, 'customer');

      if (data.success) {
        setVehicles(data.data.vehicles);
      }
    } catch (error) {
      console.error('Load vehicles error:', error);
    }
  };

  const loadActiveBookings = async () => {
    try {
      const data = await apiFetch('/bookings?status=confirmed&limit=3', {}, 'customer');

      if (data.success) {
        setActiveBookings(data.data.bookings);
      }
    } catch (error) {
      console.error('Load bookings error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['customToken', 'idToken', 'user']);
    router.replace('/login' as Href);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': '#FFA500',
      'confirmed': '#4CAF50',
      'in_progress': '#2196F3',
      'completed': '#9E9E9E',
    };
    return colors[status] || '#999';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile' as Href)}>
            <View style={styles.profilePic}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person" size={24} color="#666" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* My Vehicles */}
        {vehicles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Vehicles</Text>
              <TouchableOpacity onPress={() => router.push('/vehicle-list' as Href)}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={styles.vehicleCard}
                  onPress={() => router.push(`/vehicle-details?id=${vehicle.id}` as Href)}
                >
                  <Ionicons name="car-sport" size={40} color="#007AFF" />
                  <Text style={styles.vehicleName}>{vehicle.nickname}</Text>
                  <Text style={styles.vehicleModel}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.vehiclePlate}>{vehicle.licensePlate}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.vehicleCard, styles.addVehicleCard]}
                onPress={() => router.push('/add-vehicle' as Href)}
              >
                <Ionicons name="add-circle" size={40} color="#007AFF" />
                <Text style={styles.addVehicleText}>Add Vehicle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Active Bookings */}
        {activeBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Bookings</Text>
              <TouchableOpacity onPress={() => router.push('/booking-list' as Href)}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {activeBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingCard}
                onPress={() => router.push(`/booking-details?id=${booking.id}` as Href)}
              >
                <View style={styles.bookingHeader}>
                  <View>
                    <Text style={styles.bookingService}>{booking.service.name}</Text>
                    <Text style={styles.bookingProvider}>
                      {booking.provider.displayName}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                    <Text style={styles.statusText}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookingFooter}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.bookingDate}>
                    {booking.scheduledDate} at {booking.scheduledTime}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Service Carousel */}
        <View style={styles.carouselContainer}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <Animated.FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={DATA}
            keyExtractor={(item: CarouselServiceItem) => item.id}
            snapToInterval={ITEM_SIZE}
            contentContainerStyle={{
              alignItems: 'center',
              paddingHorizontal: EMPTY_ITEM_SIZE
            }}
            snapToAlignment="start"
            decelerationRate="fast"
            initialScrollIndex={Math.floor(DATA.length / 2)}
            getItemLayout={(_, index) => ({
              length: ITEM_SIZE,
              offset: ITEM_SIZE * index,
              index,
            })}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX as any } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            renderItem={({ item, index }: { item: CarouselServiceItem, index: number }) => {
              if (!item.name) {
                return <View style={{ width: EMPTY_ITEM_SIZE }} />;
              }

              const inputRange = [
                (index - 1) * ITEM_SIZE,
                index * ITEM_SIZE,
                (index + 1) * ITEM_SIZE,
              ];

              const scale = (scrollX as any).interpolate({
                inputRange,
                outputRange: [0.9, 1, 0.9],
                extrapolate: 'clamp',
              });

              const opacity = (scrollX as any).interpolate({
                inputRange,
                outputRange: [0.6, 1, 0.6],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View style={{ width: ITEM_SIZE, transform: [{ scale }], opacity }}>
                  <TouchableOpacity
                    style={styles.serviceItem}
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

      {/* Quick Actions — Fixed Bottom Bar */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/service-browse' as Href)}>
          <Ionicons name="search" size={24} color="#007AFF" />
          <Text style={styles.actionText}>Find Service</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/vehicle-list' as Href)}>
          <Ionicons name="car-sport" size={24} color="#007AFF" />
          <Text style={styles.actionText}>My Fleet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/booking-list' as Href)}>
          <Ionicons name="calendar" size={24} color="#007AFF" />
          <Text style={styles.actionText}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/my-subscription' as Href)}>
          <Ionicons name="ribbon" size={24} color="#007AFF" />
          <Text style={styles.actionText}>My Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFF',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 10,
    paddingBottom: 28,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  seeAll: {
    fontSize: 14,
    color: '#007AFF',
  },
  vehicleCard: {
    width: 140,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  vehicleModel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  vehiclePlate: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '500',
  },
  addVehicleCard: {
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addVehicleText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  bookingProvider: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  bookingDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  carouselContainer: {
    paddingVertical: 20,
  },
  serviceItem: {
    marginHorizontal: SPACING,
    height: 220,
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  carouselOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  carouselLabel: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 8,
    fontWeight: '600',
  },
});