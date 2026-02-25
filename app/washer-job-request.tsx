import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

interface JobRequest {
    id: string;
    customerId: string;
    serviceId: string;
    vehicleId: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    totalPrice: number;
    currency: string;
    notes?: string;
    paidWithSubscription: boolean;
    service: {
        name: string;
        price: number;
        duration: number;
        currency: string;
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
        state?: string;
        postalCode?: string;
        country: string;
        location?: {
            latitude: number;
            longitude: number;
        };
    };
    createdAt: any;
}

export default function WasherJobRequestScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const requestId = params.id as string;
    const action = params.action as string | undefined;

    const [request, setRequest] = useState<JobRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [declining, setDeclining] = useState(false);

    useEffect(() => {
        if (!requestId) {
            Alert.alert('Error', 'Job request not found');
            router.back();
            return;
        }
        loadRequestDetails();

        // Auto-execute action if provided
        if (action === 'accept') {
            handleAccept();
        } else if (action === 'decline') {
            handleDecline();
        }
    }, []);

    const loadRequestDetails = async () => {
        try {
            setLoading(true);
            const data = await apiFetch(`/bookings/${requestId}`, {}, 'provider');

            if (data.success) {
                setRequest(data.data.booking);

                // Check if already accepted/rejected
                if (data.data.booking.status !== 'pending') {
                    Alert.alert(
                        'Job Unavailable',
                        `This job has already been ${data.data.booking.status}.`,
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                }
            } else {
                Alert.alert('Error', 'Job request not found');
                router.back();
            }
        } catch (error) {
            console.error('Load request error:', error);
            Alert.alert('Error', 'Failed to load job details');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!request) return;

        Alert.alert(
            'Accept Job? 🏁',
            `You'll earn LKR ${request.totalPrice.toLocaleString()} for this ${request.service.name
            }. Race mode is active - accept quickly!`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept Job',
                    onPress: async () => {
                        try {
                            setAccepting(true);
                            const data = await apiFetch(`/bookings/${requestId}/accept`, { method: 'PATCH' }, 'provider');

                            if (data.success) {
                                Alert.alert(
                                    'Congratulations! 🎉',
                                    'You won the race! The customer has been notified. Check your confirmed bookings.',
                                    [
                                        {
                                            text: 'View Job',
                                            onPress: () => {
                                                router.replace(`/washer-booking-details?id=${requestId}` as any);
                                            },
                                        },
                                    ]
                                );
                            } else {
                                Alert.alert(
                                    'Job Taken',
                                    data.message || 'Another washer already accepted this job. Better luck next time!'
                                );
                                router.back();
                            }
                        } catch (error) {
                            console.error('Accept error:', error);
                            Alert.alert('Error', 'Failed to accept job');
                        } finally {
                            setAccepting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleDecline = async () => {
        if (!request) return;

        Alert.alert('Decline Job', 'Are you sure you want to decline this request?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Decline',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setDeclining(true);
                        const data = await apiFetch(`/bookings/${requestId}/reject`, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                reason: 'Not available at this time',
                            }),
                        }, 'provider');

                        if (data.success) {
                            Alert.alert('Declined', 'Job request declined successfully.');
                            router.back();
                        } else {
                            Alert.alert('Error', data.message || 'Failed to decline job');
                        }
                    } catch (error) {
                        console.error('Decline error:', error);
                        Alert.alert('Error', 'Failed to decline job');
                    } finally {
                        setDeclining(false);
                    }
                },
            },
        ]);
    };

    const openNavigation = () => {
        if (!request?.address.location) {
            Alert.alert('Location Unavailable', 'Address coordinates not available');
            return;
        }

        const { latitude, longitude } = request.address.location;
        const url = Platform.OS === 'ios'
            ? `maps://app?daddr=${latitude},${longitude}`
            : `google.navigation:q=${latitude},${longitude}`;

        Linking.openURL(url);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading job details...</Text>
            </View>
        );
    }

    if (!request) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Job request not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Job Request</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Race Mode Banner */}
                <View style={styles.raceBanner}>
                    <Ionicons name="flash" size={24} color="#FF9800" />
                    <View style={styles.raceBannerContent}>
                        <Text style={styles.raceBannerTitle}>RACE MODE ACTIVE 🏁</Text>
                        <Text style={styles.raceBannerText}>
                            Multiple washers are competing. First to accept wins!
                        </Text>
                    </View>
                </View>

                {/* Earnings Card */}
                <View style={styles.earningsCard}>
                    <Text style={styles.earningsLabel}>You'll Earn</Text>
                    <Text style={styles.earningsAmount}>
                        {request.paidWithSubscription ? (
                            <Text style={{ color: '#4CAF50' }}>ALREADY PAID</Text>
                        ) : (
                            `LKR ${request.totalPrice.toLocaleString()}`
                        )}
                    </Text>
                    <Text style={styles.earningsDuration}>~{request.duration} minutes work</Text>
                </View>

                {/* Service Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Service Details</Text>
                    <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Service</Text>
                            <Text style={styles.detailValue}>{request.service.name}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Duration</Text>
                            <Text style={styles.detailValue}>~{request.duration} minutes</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Payment</Text>
                            <Text style={styles.detailValue}>
                                {request.paidWithSubscription ? 'Subscription' : 'Cash/Card'}
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
                                <Text style={styles.scheduleValue}>{request.scheduledDate}</Text>
                            </View>
                        </View>
                        <View style={styles.scheduleItem}>
                            <Ionicons name="time" size={24} color="#007AFF" />
                            <View style={styles.scheduleText}>
                                <Text style={styles.scheduleLabel}>Time</Text>
                                <Text style={styles.scheduleValue}>{request.scheduledTime}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Vehicle */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vehicle</Text>
                    <View style={styles.vehicleCard}>
                        <Ionicons name="car-sport" size={48} color="#007AFF" />
                        <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleName}>{request.vehicle.nickname}</Text>
                            <Text style={styles.vehicleModel}>
                                {request.vehicle.make} {request.vehicle.model} {request.vehicle.year}
                            </Text>
                            <Text style={styles.vehicleColor}>
                                {request.vehicle.color} • {request.vehicle.licensePlate}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Location */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Service Location</Text>
                    <View style={styles.locationCard}>
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={32} color="#FF3B30" />
                            <View style={styles.locationText}>
                                <Text style={styles.locationLabel}>{request.address.label}</Text>
                                <Text style={styles.locationAddress}>{request.address.addressLine1}</Text>
                                {request.address.addressLine2 && (
                                    <Text style={styles.locationAddress}>{request.address.addressLine2}</Text>
                                )}
                                <Text style={styles.locationAddress}>
                                    {request.address.city}, {request.address.country}
                                </Text>
                            </View>
                        </View>

                        {request.address.location && (
                            <TouchableOpacity style={styles.navigationButton} onPress={openNavigation}>
                                <Ionicons name="navigate" size={20} color="#007AFF" />
                                <Text style={styles.navigationText}>Get Directions</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Special Notes */}
                {request.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Customer Notes</Text>
                        <View style={styles.notesCard}>
                            <Ionicons name="information-circle" size={24} color="#007AFF" />
                            <Text style={styles.notesText}>{request.notes}</Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Action Buttons */}
            {request.status === 'pending' && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.declineFooterButton, declining && styles.buttonDisabled]}
                        onPress={handleDecline}
                        disabled={accepting || declining}
                    >
                        {declining ? (
                            <ActivityIndicator color="#666" />
                        ) : (
                            <Text style={styles.declineFooterText}>Decline</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.acceptFooterButton, accepting && styles.buttonDisabled]}
                        onPress={handleAccept}
                        disabled={accepting || declining}
                    >
                        {accepting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                <Text style={styles.acceptFooterText}>Accept Job</Text>
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
    raceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 20,
        margin: 20,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFE0B2',
    },
    raceBannerContent: {
        flex: 1,
        marginLeft: 12,
    },
    raceBannerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E65100',
        marginBottom: 4,
    },
    raceBannerText: {
        fontSize: 14,
        color: '#F57C00',
    },
    earningsCard: {
        backgroundColor: '#4CAF50',
        marginHorizontal: 20,
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
        fontSize: 36,
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
        flexDirection: 'row',
        padding: 20,
        paddingBottom: 40,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    declineFooterButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginRight: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
    },
    declineFooterText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    acceptFooterButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginLeft: 8,
        borderRadius: 12,
        backgroundColor: '#4CAF50',
    },
    acceptFooterText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});