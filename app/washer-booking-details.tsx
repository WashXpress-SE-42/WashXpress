import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Header } from '../components/Header';

interface Booking {
    id: string;
    customerId: string;
    providerId: string;
    serviceId: string;
    vehicleId: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    totalPrice: number;
    currency: string;
    notes?: string;
    paidWithSubscription: boolean;
    startedAt?: string;
    completedAt?: string;
    service: {
        name: string;
        price: number;
        duration: number;
    };
    customer: {
        displayName: string;
        phoneNumber: string;
    };
    vehicle: {
        make: string;
        model: string;
        year: number;
        color: string;
        licensePlate: string;
        nickname: string;
    };
    address: {
        label: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        country: string;
        location?: {
            latitude: number;
            longitude: number;
        };
    };
}

export default function WasherBookingDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const bookingId = params.id as string;

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!bookingId) {
            Alert.alert('Error', 'Booking not found');
            router.back();
            return;
        }
        loadBooking();
    }, []);

    const loadBooking = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('idToken');

            const response = await fetch(
                `http://192.168.1.5:5001/washxpress-19b94/us-central1/api/provider/bookings/${bookingId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();

            if (data.success) {
                setBooking(data.data.booking);
            } else {
                Alert.alert('Error', 'Booking not found');
                router.back();
            }
        } catch (error) {
            console.error('Load booking error:', error);
            Alert.alert('Error', 'Failed to load booking');
        } finally {
            setLoading(false);
        }
    };

    const handleStartService = async () => {
        Alert.alert(
            'Start Service?',
            'This will notify the customer that you have arrived and started the service.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start Service',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const token = await AsyncStorage.getItem('idToken');

                            const response = await fetch(
                                `http://192.168.1.5:5001/washxpress-19b94/us-central1/api/provider/bookings/${bookingId}/start`,
                                {
                                    method: 'PATCH',
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                }
                            );

                            const data = await response.json();

                            if (data.success) {
                                Alert.alert('Success', 'Service started!');
                                await loadBooking();
                            } else {
                                Alert.alert('Error', data.message || 'Failed to start service');
                            }
                        } catch (error) {
                            console.error('Start service error:', error);
                            Alert.alert('Error', 'Failed to start service');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCompleteService = async () => {
        Alert.alert(
            'Complete Service?',
            'Mark this service as completed. The customer will be able to rate you.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const token = await AsyncStorage.getItem('idToken');

                            const response = await fetch(
                                `http://192.168.1.5:5001/washxpress-19b94/us-central1/api/provider/bookings/${bookingId}/complete`,
                                {
                                    method: 'PATCH',
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                }
                            );

                            const data = await response.json();

                            if (data.success) {
                                Alert.alert('Success! 🎉', 'Service completed. Great job!', [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            router.replace('/washer-home' as Href);
                                        },
                                    },
                                ]);
                            } else {
                                Alert.alert('Error', data.message || 'Failed to complete service');
                            }
                        } catch (error) {
                            console.error('Complete service error:', error);
                            Alert.alert('Error', 'Failed to complete service');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCallCustomer = () => {
        if (!booking) return;

        Alert.alert(
            'Call Customer',
            `Call ${booking.customer.displayName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Call',
                    onPress: () => {
                        Linking.openURL(`tel:${booking.customer.phoneNumber}`);
                    },
                },
            ]
        );
    };

    const handleNavigate = () => {
        if (!booking?.address.location) {
            Alert.alert('Location Unavailable', 'Address coordinates not available');
            return;
        }

        const { latitude, longitude } = booking.address.location;
        const url = Platform.OS === 'ios'
            ? `maps://app?daddr=${latitude},${longitude}`
            : `google.navigation:q=${latitude},${longitude}`;

        Linking.openURL(url);
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            pending: '#FFA500',
            confirmed: '#4CAF50',
            rejected: '#F44336',
            in_progress: '#2196F3',
            completed: '#9E9E9E',
            cancelled: '#757575',
        };
        return colors[status] || '#999';
    };

    const getStatusText = (status: string) => {
        const texts: { [key: string]: string } = {
            pending: 'Pending',
            confirmed: 'Confirmed',
            rejected: 'Rejected',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
        };
        return texts[status] || status;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading booking...</Text>
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Booking not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <Header
                title="Booking Details"
                rightElement={
                    <TouchableOpacity onPress={loadBooking}>
                        <Ionicons name="refresh" size={24} color="#000" />
                    </TouchableOpacity>
                }
            />

            <ScrollView style={styles.content}>
                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: getStatusColor(booking.status) }]}>
                    <Ionicons
                        name={
                            booking.status === 'confirmed'
                                ? 'checkmark-circle'
                                : booking.status === 'in_progress'
                                    ? 'hourglass'
                                    : booking.status === 'completed'
                                        ? 'checkmark-done-circle'
                                        : 'alert-circle'
                        }
                        size={24}
                        color="#FFF"
                    />
                    <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
                </View>

                {/* Earnings Card */}
                <View style={styles.earningsCard}>
                    <Text style={styles.earningsLabel}>You'll Earn</Text>
                    <Text style={styles.earningsAmount}>
                        {booking.paidWithSubscription ? (
                            <Text style={{ color: '#4CAF50' }}>PAID (Subscription)</Text>
                        ) : (
                            `${booking.currency} ${booking.totalPrice.toLocaleString()}`
                        )}
                    </Text>
                    <Text style={styles.earningsDuration}>~{booking.duration} minutes</Text>
                </View>

                {/* Customer Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Customer</Text>
                    <View style={styles.customerCard}>
                        <View style={styles.customerAvatar}>
                            <Ionicons name="person" size={32} color="#007AFF" />
                        </View>
                        <View style={styles.customerInfo}>
                            <Text style={styles.customerName}>{booking.customer.displayName}</Text>
                            <Text style={styles.customerPhone}>{booking.customer.phoneNumber}</Text>
                        </View>
                        <TouchableOpacity style={styles.callButton} onPress={handleCallCustomer}>
                            <Ionicons name="call" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Service Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Service</Text>
                    <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Service</Text>
                            <Text style={styles.detailValue}>{booking.service.name}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Duration</Text>
                            <Text style={styles.detailValue}>~{booking.duration} min</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Price</Text>
                            <Text style={styles.detailValue}>
                                {booking.paidWithSubscription ? 'Subscription' : `${booking.currency} ${booking.totalPrice}`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Schedule */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Schedule</Text>
                    <View style={styles.scheduleCard}>
                        <View style={styles.scheduleItem}>
                            <Ionicons name="calendar" size={24} color="#007AFF" />
                            <View style={styles.scheduleText}>
                                <Text style={styles.scheduleLabel}>Date</Text>
                                <Text style={styles.scheduleValue}>{booking.scheduledDate}</Text>
                            </View>
                        </View>
                        <View style={styles.scheduleItem}>
                            <Ionicons name="time" size={24} color="#007AFF" />
                            <View style={styles.scheduleText}>
                                <Text style={styles.scheduleLabel}>Time</Text>
                                <Text style={styles.scheduleValue}>{booking.scheduledTime}</Text>
                            </View>
                        </View>
                        {booking.startedAt && (
                            <View style={styles.scheduleItem}>
                                <Ionicons name="play-circle" size={24} color="#4CAF50" />
                                <View style={styles.scheduleText}>
                                    <Text style={styles.scheduleLabel}>Started At</Text>
                                    <Text style={styles.scheduleValue}>
                                        {new Date(booking.startedAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                </View>
                            </View>
                        )}
                        {booking.completedAt && (
                            <View style={styles.scheduleItem}>
                                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                <View style={styles.scheduleText}>
                                    <Text style={styles.scheduleLabel}>Completed At</Text>
                                    <Text style={styles.scheduleValue}>
                                        {new Date(booking.completedAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Vehicle */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vehicle</Text>
                    <View style={styles.vehicleCard}>
                        <Ionicons name="car-sport" size={48} color="#007AFF" />
                        <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleName}>{booking.vehicle.nickname}</Text>
                            <Text style={styles.vehicleModel}>
                                {booking.vehicle.make} {booking.vehicle.model} {booking.vehicle.year}
                            </Text>
                            <Text style={styles.vehicleColor}>
                                {booking.vehicle.color} • {booking.vehicle.licensePlate}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Location */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.locationCard}>
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={32} color="#FF3B30" />
                            <View style={styles.locationText}>
                                <Text style={styles.locationLabel}>{booking.address.label}</Text>
                                <Text style={styles.locationAddress}>{booking.address.addressLine1}</Text>
                                {booking.address.addressLine2 && (
                                    <Text style={styles.locationAddress}>{booking.address.addressLine2}</Text>
                                )}
                                <Text style={styles.locationAddress}>
                                    {booking.address.city}, {booking.address.country}
                                </Text>
                            </View>
                        </View>

                        {booking.address.location && (
                            <TouchableOpacity style={styles.navigationButton} onPress={handleNavigate}>
                                <Ionicons name="navigate" size={20} color="#007AFF" />
                                <Text style={styles.navigationText}>Get Directions</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Customer Notes */}
                {booking.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Customer Notes</Text>
                        <View style={styles.notesCard}>
                            <Ionicons name="information-circle" size={24} color="#007AFF" />
                            <Text style={styles.notesText}>{booking.notes}</Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Action Buttons */}
            {booking.status === 'confirmed' && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.startButton, actionLoading && styles.buttonDisabled]}
                        onPress={handleStartService}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="play-circle" size={24} color="#FFF" />
                                <Text style={styles.actionButtonText}>Start Service</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {booking.status === 'in_progress' && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton, actionLoading && styles.buttonDisabled]}
                        onPress={handleCompleteService}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                <Text style={styles.actionButtonText}>Complete Service</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
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
    errorText: {
        fontSize: 16,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        flex: 1,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    statusText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 12,
    },
    earningsCard: {
        backgroundColor: '#4CAF50',
        margin: 20,
        marginBottom: 12,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
    },
    earningsLabel: {
        fontSize: 14,
        color: '#E8F5E9',
        marginBottom: 8,
    },
    earningsAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    earningsDuration: {
        fontSize: 14,
        color: '#E8F5E9',
    },
    section: {
        marginHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
    },
    customerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
    },
    customerAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F0F8FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    customerInfo: {
        flex: 1,
        marginLeft: 16,
    },
    customerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    customerPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    callButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F0F8FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    scheduleCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    scheduleText: {
        marginLeft: 16,
    },
    scheduleLabel: {
        fontSize: 12,
        color: '#999',
    },
    scheduleValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginTop: 4,
    },
    vehicleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
    },
    vehicleInfo: {
        flex: 1,
        marginLeft: 16,
    },
    vehicleName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    vehicleModel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    vehicleColor: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    locationCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    locationText: {
        flex: 1,
        marginLeft: 16,
    },
    locationLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 6,
    },
    locationAddress: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    navigationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F8FF',
        paddingVertical: 12,
        borderRadius: 8,
    },
    navigationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 8,
    },
    notesCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
    },
    notesText: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginLeft: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    startButton: {
        backgroundColor: '#2196F3',
    },
    completeButton: {
        backgroundColor: '#4CAF50',
    },
    actionButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});