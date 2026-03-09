import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Header } from '../components/Header';

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
        country: string;
    };
    createdAt: any;
}

export default function WasherRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<JobRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [decliningId, setDecliningId] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();

        // Auto-refresh every 5 seconds
        const interval = setInterval(() => {
            loadRequests(true);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const loadRequests = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const data = await apiFetch('/bookings?status=pending', {}, 'provider');

            if (data.success) {
                setRequests(data.data.bookings);
            }
        } catch (error) {
            console.error('Load requests error:', error);
            if (!silent) {
                Alert.alert('Error', 'Failed to load job requests');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
    };

    const handleAcceptJob = async (requestId: string) => {
        try {
            setAcceptingId(requestId);
            const data = await apiFetch(`/bookings/${requestId}/accept`, { method: 'PATCH' }, 'provider');

            if (data.success) {
                Alert.alert(
                    'Job Accepted! 🎉',
                    'You won the race! The customer will be notified.',
                    [
                        {
                            text: 'View Job',
                            onPress: () => {
                                router.replace(`/washer-booking-details?id=${requestId}` as any);
                            },
                        },
                    ]
                );
                await loadRequests();
            } else {
                Alert.alert(
                    'Too Late!',
                    data.message || 'Another washer already accepted this job.'
                );
                await loadRequests();
            }
        } catch (error) {
            console.error('Accept job error:', error);
            Alert.alert('Error', 'Failed to accept job. Please try again.');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleDeclineJob = async (requestId: string) => {
        Alert.alert(
            'Decline Job',
            'Are you sure you want to decline this request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDecliningId(requestId);
                            const data = await apiFetch(`/bookings/${requestId}/reject`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                    reason: 'Not available at this time',
                                }),
                            }, 'provider');

                            if (data.success) {
                                Alert.alert('Declined', 'Job request declined successfully.');
                                await loadRequests();
                            } else {
                                Alert.alert('Error', data.message || 'Failed to decline job');
                            }
                        } catch (error) {
                            console.error('Decline job error:', error);
                            Alert.alert('Error', 'Failed to decline job');
                        } finally {
                            setDecliningId(null);
                        }
                    },
                },
            ]
        );
    };

    const calculateTimeAgo = (createdAt: any) => {
        const now = new Date();
        const created = createdAt._seconds
            ? new Date(createdAt._seconds * 1000)
            : new Date(createdAt);
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    const renderJobCard = ({ item }: { item: JobRequest }) => (
        <TouchableOpacity
            style={styles.jobCard}
            onPress={() => router.push(`/washer-job-request?id=${item.id}`)}
            activeOpacity={0.7}
        >
            {/* Race Mode Indicator */}
            <View style={styles.raceIndicator}>
                <Ionicons name="flash" size={14} color="#FF9800" />
                <Text style={styles.raceText}>RACE MODE • First to accept wins!</Text>
            </View>

            {/* Job Header */}
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    <Text style={styles.serviceName}>{item.service.name}</Text>
                    <Text style={styles.vehicleInfo}>
                        {item.vehicle.make} {item.vehicle.model} • {item.vehicle.color}
                    </Text>
                    <Text style={styles.licensePlate}>{item.vehicle.licensePlate}</Text>
                </View>

                <View style={styles.priceContainer}>
                    <Text style={styles.price}>
                        {item.paidWithSubscription ? (
                            <Text style={{ color: '#4CAF50' }}>PAID</Text>
                        ) : (
                            `LKR ${item.totalPrice.toLocaleString()}`
                        )}
                    </Text>
                    <Text style={styles.duration}>~{item.duration} min</Text>
                </View>
            </View>

            {/* Job Details */}
            <View style={styles.jobDetails}>
                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                        {item.scheduledDate} at {item.scheduledTime}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                        {item.address.label} • {item.address.city}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                        Posted {calculateTimeAgo(item.createdAt)}
                    </Text>
                </View>
            </View>

            {/* Special Notes */}
            {item.notes && (
                <View style={styles.notesContainer}>
                    <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
                    <Text style={styles.notesText} numberOfLines={2}>
                        {item.notes}
                    </Text>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[
                        styles.acceptButton,
                        acceptingId === item.id && styles.buttonDisabled,
                    ]}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleAcceptJob(item.id);
                    }}
                    disabled={acceptingId === item.id || decliningId === item.id}
                >
                    {acceptingId === item.id ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                            <Text style={styles.acceptButtonText}>Accept Job</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.declineButton,
                        decliningId === item.id && styles.buttonDisabled,
                    ]}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleDeclineJob(item.id);
                    }}
                    disabled={acceptingId === item.id || decliningId === item.id}
                >
                    {decliningId === item.id ? (
                        <ActivityIndicator color="#666" size="small" />
                    ) : (
                        <Text style={styles.declineButtonText}>Decline</Text>
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateTitle}>No Job Requests</Text>
            <Text style={styles.emptyStateText}>
                New job requests will appear here when customers book your services
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading job requests...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <Header
                title={requests.length > 0 ? `Job Requests (${requests.length})` : 'Job Requests'}
                rightElement={
                    <TouchableOpacity onPress={() => loadRequests()}>
                        <Ionicons name="refresh" size={24} color="#000" />
                    </TouchableOpacity>
                }
            />

            {/* Race Mode Banner */}
            {requests.length > 0 && (
                <View style={styles.raceBanner}>
                    <Ionicons name="flash" size={20} color="#FF9800" />
                    <Text style={styles.raceBannerText}>
                        Multiple washers compete for each job. Accept quickly to win!
                    </Text>
                </View>
            )}

            {/* Job List */}
            <FlatList
                data={requests}
                renderItem={renderJobCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />
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
    raceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE0B2',
    },
    raceBannerText: {
        flex: 1,
        fontSize: 14,
        color: '#E65100',
        marginLeft: 12,
        fontWeight: '500',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    jobCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    raceIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    raceText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FF9800',
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    jobInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 6,
    },
    vehicleInfo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    licensePlate: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    duration: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    jobDetails: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    notesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0F8FF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    notesText: {
        flex: 1,
        fontSize: 13,
        color: '#007AFF',
        marginLeft: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    acceptButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        paddingVertical: 14,
        marginRight: 8,
    },
    acceptButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },
    declineButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingVertical: 14,
    },
    declineButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
        lineHeight: 20,
    },
});