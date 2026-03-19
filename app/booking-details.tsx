import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';

interface Booking {
    id: string;
    customerId: string;
    providerId: string;
    serviceId: string;
    vehicleId: string;
    subscriptionId?: string;
    paidWithSubscription: boolean;
    status: 'pending' | 'confirmed' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    totalPrice: number;
    currency: string;
    notes?: string;
    cancellationReason?: string;
    startedAt?: string;
    completedAt?: string;
    vehicle: {
        make: string;
        model: string;
        year: number;
        color: string;
        licensePlate: string;
        nickname: string;
    };
    service: {
        name: string;
        categoryId: string;
        price: number;
        duration: number;
        currency: string;
    };
    provider: {
        displayName: string;
        photoURL?: string;
        rating: number;
        area: string;
    };
    address: {
        id: string;
        label: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state?: string;
        country: string;
    };
    createdAt: any;
}

export default function BookingDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const bookingId = params.id as string;
    const { colors, isDark } = useTheme();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // Animation for finding provider
    const pulseAnim = useState(new Animated.Value(1))[0];
    const rotateAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (!bookingId) {
            Alert.alert('Error', 'Booking not found');
            router.back();
            return;
        }
        loadBookingDetails();

        // Poll for updates every 5 seconds if pending
        const interval = setInterval(() => {
            if (booking?.status === 'pending') {
                loadBookingDetails(true);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [booking?.status]);

    useEffect(() => {
        // Start animations for pending state
        if (booking?.status === 'pending') {
            startPulseAnimation();
            startRotateAnimation();
        }
    }, [booking?.status]);

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const startRotateAnimation = () => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();
    };

    const loadBookingDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await apiFetch(`/bookings/${bookingId}`, {}, 'customer');

            if (data.success) {
                setBooking(data.data.booking);
            } else {
                Alert.alert('Error', 'Booking not found');
                router.back();
            }
        } catch (error) {
            console.error('Load booking error:', error);
            if (!silent) {
                Alert.alert('Error', 'Failed to load booking details');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadBookingDetails();
    };

    const handleCancelBooking = async () => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this booking?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancelling(true);
                            const data = await apiFetch(`/bookings/${bookingId}/cancel`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                    reason: 'Cancelled by customer',
                                }),
                            }, 'customer');

                            if (data.success) {
                                Alert.alert('Cancelled', 'Your booking has been cancelled successfully.');
                                await loadBookingDetails();
                            } else {
                                Alert.alert('Error', data.message || 'Failed to cancel booking');
                            }
                        } catch (error) {
                            console.error('Cancel booking error:', error);
                            Alert.alert('Error', 'Failed to cancel booking');
                        } finally {
                            setCancelling(false);
                        }
                    },
                },
            ]
        );
    };

    const handleContactProvider = () => {
        if (!booking || booking.status === 'pending') return;

        Alert.alert(
            'Contact Provider',
            `Call ${booking.provider.displayName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Call',
                    onPress: () => {
                        // In production, use actual phone number from provider
                        Linking.openURL('tel:+94771234567');
                    },
                },
            ]
        );
    };

    const getStatusColor = (status: string) => {
        const statusColors: { [key: string]: string } = {
            pending: colors.warning || '#FFA500',
            confirmed: colors.success || '#4CAF50',
            rejected: colors.error || '#F44336',
            in_progress: colors.accent || '#2196F3',
            completed: colors.textSecondary || '#9E9E9E',
            cancelled: colors.textSecondary || '#757575',
        };
        return statusColors[status] || colors.textSecondary;
    };

    const getStatusText = (status: string) => {
        const texts: { [key: string]: string } = {
            pending: 'Finding Washer',
            confirmed: 'Confirmed',
            rejected: 'Declined',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
        };
        return texts[status] || status;
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading booking...</Text>
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>Booking not found</Text>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.accent }]} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // PENDING STATE - Finding a Provider
    if (booking.status === 'pending') {
        return (
            <View style={styles.container}>
                {/* Header */}
                <Header title="Finding Washer" />

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.pendingContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#007AFF']}
                        />
                    }
                >
                    {/* Searching Animation */}
                    <View style={styles.searchingContainer}>
                        <Animated.View
                            style={[
                                styles.searchingCircle,
                                {
                                    transform: [{ scale: pulseAnim }, { rotate: spin }],
                                    backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)',
                                    borderColor: colors.accent,
                                },
                            ]}
                        >
                            <Ionicons name="car-sport" size={60} color={colors.accent} />
                        </Animated.View>

                        <Text style={styles.searchingTitle}>Finding available washers near you</Text>
                        <Text style={styles.searchingSubtitle}>
                            Multiple washers are being notified. This usually takes less than a minute.
                        </Text>

                        {/* Dots Animation */}
                        <View style={styles.dotsContainer}>
                            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                            <View style={[styles.dot, { backgroundColor: colors.accent, opacity: 0.6 }]} />
                            <View style={[styles.dot, { backgroundColor: colors.accent, opacity: 0.3 }]} />
                        </View>
                    </View>

                    {/* Booking Summary */}
                    <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Booking Summary</Text>

                        <View style={[styles.summaryRow, { borderBottomColor: colors.divider }]}>
                            <Ionicons name="construct-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Service</Text>
                            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{booking.service.name}</Text>
                        </View>

                        <View style={[styles.summaryRow, { borderBottomColor: colors.divider }]}>
                            <Ionicons name="car-sport-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Vehicle</Text>
                            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{booking.vehicle.nickname}</Text>
                        </View>

                        <View style={[styles.summaryRow, { borderBottomColor: colors.divider }]}>
                            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Date & Time</Text>
                            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                                {booking.scheduledDate} at {booking.scheduledTime}
                            </Text>
                        </View>

                        <View style={[styles.summaryRow, { borderBottomColor: colors.divider }]}>
                            <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Location</Text>
                            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{booking.address.label}</Text>
                        </View>

                        <View style={[styles.summaryRow, { borderBottomColor: colors.divider }]}>
                            <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Price</Text>
                            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                                {booking.paidWithSubscription
                                    ? 'FREE (Subscription)'
                                    : `${booking.currency} ${booking.totalPrice.toLocaleString()}`}
                            </Text>
                        </View>
                    </View>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        style={[styles.cancelButtonOutline, { borderColor: colors.error }]}
                        onPress={handleCancelBooking}
                        disabled={cancelling}
                    >
                        {cancelling ? (
                            <ActivityIndicator color={colors.error} />
                        ) : (
                            <Text style={[styles.cancelButtonText, { color: colors.error }]}>Cancel Booking</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // CONFIRMED/ASSIGNED STATE - Provider Accepted
    return (
        <View style={styles.container}>
            {/* Header */}
            <Header
                title="Booking Details"
                rightElement={
                    <TouchableOpacity onPress={handleRefresh}>
                        <Ionicons name="refresh" size={24} color={colors.accent} />
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
                    <Text style={[styles.statusText, { color: '#FFF' }]}>{getStatusText(booking.status)}</Text>
                </View>

                {/* Provider Card */}
                {booking.status !== 'cancelled' && booking.status !== 'rejected' && (
                    <View style={[styles.providerCard, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Washer</Text>

                        <View style={styles.providerInfo}>
                            <View style={[styles.providerAvatar, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}>
                                {booking.provider.photoURL ? (
                                    <Image
                                        source={{ uri: booking.provider.photoURL }}
                                        style={styles.providerImage}
                                    />
                                ) : (
                                    <Ionicons name="person" size={40} color={colors.accent} />
                                )}
                            </View>

                            <View style={styles.providerDetails}>
                                <Text style={[styles.providerName, { color: colors.textPrimary }]}>{booking.provider.displayName}</Text>
                                <View style={styles.providerRating}>
                                    <Ionicons name="star" size={16} color="#FFD700" />
                                    <Text style={[styles.providerRatingText, { color: colors.textSecondary }]}>
                                        {booking.provider.rating} • {booking.provider.area}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.callButton, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}
                                onPress={handleContactProvider}
                            >
                                <Ionicons name="call" size={24} color={colors.accent} />
                            </TouchableOpacity>
                        </View>

                        {/* Provider Actions */}
                        {booking.status === 'confirmed' && (
                            <View style={[styles.providerActions, { borderTopColor: colors.divider }]}>
                                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}>
                                    <Ionicons name="chatbubble-outline" size={20} color={colors.accent} />
                                    <Text style={[styles.actionButtonText, { color: colors.accent }]}>Message</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}>
                                    <Ionicons name="location-outline" size={20} color={colors.accent} />
                                    <Text style={[styles.actionButtonText, { color: colors.accent }]}>Track</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Service Details */}
                <View style={[styles.detailsCard, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Service Details</Text>

                    <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Service</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{booking.service.name}</Text>
                    </View>

                    <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duration</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>~{booking.duration} minutes</Text>
                    </View>

                    <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Price</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                            {booking.paidWithSubscription ? (
                                <Text style={{ color: colors.success }}>FREE (Subscription)</Text>
                            ) : (
                                `${booking.currency} ${booking.totalPrice.toLocaleString()}`
                            )}
                        </Text>
                    </View>
                </View>

                {/* Vehicle Details */}
                <View style={[styles.detailsCard, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Vehicle</Text>

                    <View style={styles.vehicleInfo}>
                        <Ionicons name="car-sport" size={40} color={colors.accent} />
                        <View style={styles.vehicleDetails}>
                            <Text style={[styles.vehicleName, { color: colors.textPrimary }]}>{booking.vehicle.nickname}</Text>
                            <Text style={[styles.vehicleModel, { color: colors.textSecondary }]}>
                                {booking.vehicle.make} {booking.vehicle.model} {booking.vehicle.year}
                            </Text>
                            <Text style={[styles.vehiclePlate, { color: colors.accent }]}>{booking.vehicle.licensePlate}</Text>
                        </View>
                    </View>
                </View>

                {/* Schedule */}
                <View style={[styles.detailsCard, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Schedule</Text>

                    <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{booking.scheduledDate}</Text>
                    </View>

                    <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Time</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{booking.scheduledTime}</Text>
                    </View>

                    {booking.startedAt && (
                        <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                            <Ionicons name="play-circle-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Started At</Text>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                {new Date(booking.startedAt).toLocaleTimeString()}
                            </Text>
                        </View>
                    )}

                    {booking.completedAt && (
                        <View style={[styles.detailRow, { borderBottomColor: colors.divider }]}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Completed At</Text>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                {new Date(booking.completedAt).toLocaleTimeString()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Location */}
                <View style={[styles.detailsCard, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Service Location</Text>

                    <View style={styles.addressContainer}>
                        <Ionicons name="location" size={24} color={colors.accent} />
                        <View style={styles.addressText}>
                            <Text style={[styles.addressLabel, { color: colors.textPrimary }]}>{booking.address.label}</Text>
                            <Text style={[styles.addressLine, { color: colors.textSecondary }]}>{booking.address.addressLine1}</Text>
                            {booking.address.addressLine2 && (
                                <Text style={[styles.addressLine, { color: colors.textSecondary }]}>{booking.address.addressLine2}</Text>
                            )}
                            <Text style={[styles.addressLine, { color: colors.textSecondary }]}>
                                {booking.address.city}, {booking.address.country}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Special Instructions */}
                {booking.notes && (
                    <View style={[styles.detailsCard, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Special Instructions</Text>
                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>{booking.notes}</Text>
                    </View>
                )}

                {/* Cancellation Reason */}
                {(booking.status === 'cancelled' || booking.status === 'rejected') &&
                    booking.cancellationReason && (
                        <View style={[styles.detailsCard, { backgroundColor: colors.cardBackground }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                {booking.status === 'rejected' ? 'Rejection Reason' : 'Cancellation Reason'}
                            </Text>
                            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{booking.cancellationReason}</Text>
                        </View>
                    )}

                {/* Booking ID */}
                <View style={[styles.bookingIdCard, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.bookingIdLabel, { color: colors.textSecondary }]}>Booking ID</Text>
                    <Text style={[styles.bookingId, { color: colors.textSecondary }]}>{booking.id}</Text>
                </View>

                {/* Action Buttons */}
                {booking.status === 'confirmed' && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.rescheduleButton, { borderColor: colors.accent, backgroundColor: colors.cardBackground }]}
                            onPress={() =>
                                router.push(`/reschedule-booking?id=${booking.id}` as any)
                            }
                        >
                            <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                            <Text style={[styles.rescheduleButtonText, { color: colors.accent }]}>Reschedule</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: colors.error }]}
                            onPress={handleCancelBooking}
                            disabled={cancelling}
                        >
                            {cancelling ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                                    <Text style={[styles.cancelButtonTextWhite, { color: '#FFF' }]}>Cancel</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )
                }

                {/* Rate Button */}
                {
                    booking.status === 'completed' && (
                        <TouchableOpacity
                            style={[styles.rateButton, { backgroundColor: colors.warning || '#FFD700' }]}
                            onPress={() => router.push(`/rate-booking?id=${booking.id}` as any)}
                        >
                            <Ionicons name="star-outline" size={20} color="#FFF" />
                            <Text style={[styles.rateButtonText, { color: '#FFF' }]}>Rate This Service</Text>
                        </TouchableOpacity>
                    )
                }

                {/* Complaint Button */}
                {(booking.status === 'completed' || booking.status === 'cancelled') && (
                    <TouchableOpacity
                        style={[styles.rateButton, { backgroundColor: colors.error || '#F44336', marginTop: 12 }]}
                        onPress={() => router.push(`/complaint-new?bookingId=${booking.id}&serviceName=${booking.service.name}&vehicleName=${booking.vehicle.nickname}&providerName=${booking.provider.displayName}&totalPrice=${booking.totalPrice}&currency=${booking.currency}` as any)}
                    >
                        <Ionicons name="alert-circle-outline" size={20} color="#FFF" />
                        <Text style={[styles.rateButtonText, { color: '#FFF' }]}>File a Complaint</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 110 }} />
            </ScrollView >
        </View >
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
        color: '#666',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        flex: 1,
    },

    // PENDING STATE
    pendingContent: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 110,
    },
    searchingContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    searchingCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 3,
        borderStyle: 'dashed',
    },
    searchingTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginBottom: 12,
    },
    searchingSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 24,
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: 24,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
        marginHorizontal: 6,
    },
    dotAnimated: {
        // Animation would be added with Animated API in production
    },
    summaryCard: {
        borderRadius: 12,
        padding: 20,
        marginTop: 24,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
        marginLeft: 12,
        flex: 1,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
        textAlign: 'right',
    },
    cancelButtonOutline: {
        borderWidth: 2,
        borderColor: '#FF3B30',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF3B30',
    },

    // CONFIRMED STATE
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
    providerCard: {
        margin: 20,
        marginBottom: 0,
        borderRadius: 12,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    providerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    providerAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    providerImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    providerDetails: {
        flex: 1,
        marginLeft: 16,
    },
    providerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    providerRating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    providerRatingText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 6,
    },
    callButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    providerActions: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 8,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 8,
    },
    detailsCard: {
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 12,
        padding: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginLeft: 12,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
        textAlign: 'right',
    },
    vehicleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vehicleDetails: {
        flex: 1,
        marginLeft: 16,
    },
    vehicleName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    vehicleModel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    vehiclePlate: {
        fontSize: 14,
        marginTop: 4,
        fontWeight: '500',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    addressText: {
        flex: 1,
        marginLeft: 12,
    },
    addressLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    addressLine: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    notesText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    bookingIdCard: {
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    bookingIdLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    bookingId: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        fontFamily: 'monospace',
    },
    actionButtons: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 20,
    },
    rescheduleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginRight: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#007AFF',
        backgroundColor: '#FFF',
    },
    rescheduleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 8,
    },
    cancelButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginLeft: 8,
        borderRadius: 12,
        backgroundColor: '#FF3B30',
    },
    cancelButtonTextWhite: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginLeft: 8,
    },
    rateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 20,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#FFD700',
    },
    rateButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },
    backButton: {
        padding: 12,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});