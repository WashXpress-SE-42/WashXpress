import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, StyleSheet, TextInput, ScrollView, TouchableOpacity, Modal } from 'react-native';
// Adjust these imports based on your folder structure!
import { db, auth } from '../firebaseConfig';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { apiFetch } from '../services/apiClient';
import { getProfile, CustomerProfile } from '../services/authService';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Replace with your actual backend URL or dynamic IP setup
// No longer using hardcoded API_URL; apiFetch uses .env

export default function CustomerOrderScreen() {
  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'SEARCHING' | 'CONFIRMED'>('IDLE');
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [washerName, setWasherName] = useState<string>('');

  // Mandatory Booking Fields
  const [serviceId, setServiceId] = useState('basic_wash_01');
  const [vehicleId, setVehicleId] = useState('');
  const [addressId, setAddressId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [scheduledTime, setScheduledTime] = useState('14:30'); // HH:MM

  // Profile Data
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [services, setServices] = useState<{ id: string, name: string }[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // 1. Fetch Basic Profile (Name, Email etc)
      const data = await getProfile();
      setProfile(data);
      setCustomerName(data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Anonymous');

      // 2. Fetch Available Services (Top-level collection)
      console.log('🔍 Fetching top-level Service collection...');
      const servicesRef = collection(db, 'services');
      const servicesSnap = await getDocs(servicesRef).catch(err => {
        console.error('❌ Error fetching Service collection:', err.message);
        throw err;
      });
      const servicesList = servicesSnap.docs.map(docSnap => ({
        id: docSnap.id,
        name: docSnap.data().name || docSnap.id
      }));
      setServices(servicesList);

      // 3. Fetch Vehicles Subcollection
      console.log(`🔍 Fetching vehicles for user: ${user.uid}`);
      const vehiclesRef = collection(db, 'customers', user.uid, 'vehicles');
      const vehiclesSnap = await getDocs(vehiclesRef).catch(err => {
        console.error('❌ Error fetching vehicles subcollection:', err.message);
        throw err;
      });
      const vehiclesList = vehiclesSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as any[];

      // 4. Fetch Addresses Subcollection
      console.log(`🔍 Fetching addresses for user: ${user.uid}`);
      const addressesRef = collection(db, 'customers', user.uid, 'addresses');
      const addressesSnap = await getDocs(addressesRef).catch(err => {
        console.error('❌ Error fetching addresses subcollection:', err.message);
        throw err;
      });
      const addressesList = addressesSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as any[];

      // Update Profile state with subcollection data
      setProfile(prev => prev ? {
        ...prev,
        vehicles: vehiclesList,
        addresses: addressesList
      } : null);

      // Auto-select if only one vehicle
      if (vehiclesList.length === 1 && !vehicleId) {
        setVehicleId(vehiclesList[0].plateNumber || vehiclesList[0].id);
      }

      // Auto-select if only one address
      if (addressesList.length === 1 && !addressId) {
        setAddressId(addressesList[0].id);
      }
    } catch (error) {
      console.error('Error loading profile or subcollections:', error);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const formattedAddress = `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim().replace(/^ ,/, '').replace(/, ,/g, ',');

        // Temporarily set addressId to the formatted address string
        // In a real app, you might want to save this to the user's addresses
        setAddressId(formattedAddress);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Could not fetch current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  // 1. Function to create the order via your Node.js API
  const handleOrderWash = async () => {
    if (!serviceId || !vehicleId || !addressId || !scheduledDate || !scheduledTime) {
      Alert.alert('Missing Fields', 'Please select a vehicle and address.');
      return;
    }

    try {
      setOrderStatus('SEARCHING');

      const response = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId,
          vehicleId,
          addressId,
          scheduledDate,
          scheduledTime,
          customerName: customerName || 'Anonymous' // Ensure never undefined
        }),
      }, 'customer');

      // Save the ID so our useEffect can start listening to it
      setCurrentBookingId(response.data.booking.id);

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not create booking');
      setOrderStatus('IDLE');
    }
  };

  // 2. The Real-Time Listener
  useEffect(() => {
    if (!currentBookingId) return; // Don't listen if there's no order

    const bookingRef = doc(db, 'bookings', currentBookingId);

    // Listen to this specific document
    const unsubscribe = onSnapshot(bookingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // If the backend transaction changed the status to CONFIRMED!
        if (data.status === 'CONFIRMED' && data.assignedStaffName) {
          setWasherName(data.assignedStaffName);
          setOrderStatus('CONFIRMED');
        }
      }
    });

    // Cleanup listener if user leaves the screen
    return () => unsubscribe();
  }, [currentBookingId]);

  return (
    <View style={styles.container}>
      {orderStatus === 'IDLE' && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.title}>Ready for a wash?</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Service</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowServiceModal(true)}
            >
              <Text style={[styles.dropdownText, !serviceId && styles.placeholderText]}>
                {services.find(s => s.id === serviceId)?.name || serviceId || 'Select a service'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowVehicleModal(true)}
            >
              <Text style={[styles.dropdownText, !vehicleId && styles.placeholderText]}>
                {vehicleId || 'Select a vehicle'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Address</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowAddressModal(true)}
            >
              <Text style={[styles.dropdownText, !addressId && styles.placeholderText]}>
                {addressId ? (profile?.addresses?.find(a => a.id === addressId)?.label || addressId) : 'Select an address'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <>
                  <Ionicons name="location" size={16} color="#2563eb" />
                  <Text style={styles.locationButtonText}>Use Current Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Scheduled Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={scheduledDate} onChangeText={setScheduledDate} placeholder="2026-03-01" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Scheduled Time (HH:MM)</Text>
            <TextInput style={styles.input} value={scheduledTime} onChangeText={setScheduledTime} placeholder="14:30" />
          </View>

          <TouchableOpacity style={styles.orderButton} onPress={handleOrderWash}>
            <Text style={styles.orderButtonText}>Order Wash Now</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Service Selection Modal */}
      <SelectModal
        visible={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title="Select Service"
        options={services.map(s => ({ id: s.id, label: s.name }))}
        onSelect={(id) => setServiceId(id)}
        selectedValue={serviceId}
      />

      {/* Vehicle Selection Modal */}
      <SelectModal
        visible={showVehicleModal}
        onClose={() => setShowVehicleModal(false)}
        title="Select Vehicle"
        options={profile?.vehicles?.map(v => ({
          id: v.plateNumber || v.id,
          label: `${v.brand || ''} ${v.model || ''} (${v.plateNumber || v.id})`.trim()
        })) || []}
        onSelect={(id) => setVehicleId(id)}
        selectedValue={vehicleId}
      />

      {/* Address Selection Modal */}
      <SelectModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        title="Select Address"
        options={profile?.addresses?.map(a => ({
          id: a.id,
          label: a.label || a.description || 'Unnamed Address'
        })) || []}
        onSelect={(id) => setAddressId(id)}
        selectedValue={addressId}
      />

      {orderStatus === 'SEARCHING' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.text}>Broadcasting to nearby washers...</Text>
        </View>
      )}

      {orderStatus === 'CONFIRMED' && (
        <View style={styles.center}>
          <Text style={styles.title}>✅ Washer Found!</Text>
          <Text style={styles.text}>{washerName} has accepted your job.</Text>
          <Button title="Order Another" onPress={() => {
            setOrderStatus('IDLE');
            setCurrentBookingId(null);
          }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 40 },
  formContainer: { padding: 20, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#111827' },
  text: { fontSize: 16, marginTop: 10, marginBottom: 20 },
  inputGroup: { width: '100%', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  orderButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 4,
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
  options: { id: string, label: string }[];
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
          {options.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#6b7280' }}>No options available</Text>
            </View>
          ) : (
            options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  selectedValue === option.id && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedValue === option.id && styles.modalOptionTextSelected,
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.id && (
                  <Ionicons name="checkmark" size={20} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
);
