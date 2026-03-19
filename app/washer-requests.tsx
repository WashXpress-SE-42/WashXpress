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
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../hooks/useProfile';


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
        type?: string;
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
    const { colors, isDark } = useTheme();
    const [requests, setRequests] = useState<JobRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [decliningId, setDecliningId] = useState<string | null>(null);
    const { data: washerProfile, isLoading: profileLoading } = useProfile();

    // ── Runtime Verification Guard ───────────────────────────────────────────
    useEffect(() => {
        if (!profileLoading && washerProfile && washerProfile.isVerified === false) {
            console.log('🛑 Washer not verified, redirecting to pending...');
            router.replace('/washer-pending');
        }
    }, [washerProfile, profileLoading]);

    useEffect(() => {
        loadRequests();

        // Auto-refresh every 15 seconds (less aggressive than 5s)
        const interval = setInterval(() => {
            loadRequests(true);
        }, 15000);

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
            style={[s.jobCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => router.push(`/washer-job-request?id=${item.id}`)}
            activeOpacity={0.7}
        >
            {/* Race Mode Indicator */}
            <View style={[s.raceIndicator, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFF3E0' }]}>
                <Ionicons name="flash" size={14} color={colors.warning || '#FF9800'} />
                <Text style={[s.raceIndicatorText, { color: colors.warning || '#FF9800' }]}>RACE MODE • First to accept wins!</Text>
            </View>

            {/* Job Header */}
            <View style={s.jobHeader}>
                <View style={s.jobInfo}>
                    <Text style={[s.serviceName, { color: colors.textPrimary }]}>{item.service.name}</Text>
                    <Text style={[s.vehicleInfo, { color: colors.textSecondary }]}>
                        {item.vehicle.make} {item.vehicle.model} • {item.vehicle.color}
                    </Text>
                    <Text style={[s.licensePlate, { color: colors.accent }]}>{item.vehicle.licensePlate}</Text>
                </View>

                <View style={s.priceContainer}>
                    <Text style={[s.price, { color: colors.success || '#4CAF50' }]}>
                        {item.paidWithSubscription ? (
                            <Text style={{ color: colors.success || '#4CAF50' }}>PAID</Text>
                        ) : (
                            `LKR ${item.totalPrice.toLocaleString()}`
                        )}
                    </Text>
                    <Text style={[s.duration, { color: colors.textSecondary }]}>~{item.duration} min</Text>
                </View>
            </View>

            {/* Job Details */}
            <View style={s.jobDetails}>
                <View style={s.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={[s.detailText, { color: colors.textSecondary }]}>
                        {item.scheduledDate} at {item.scheduledTime}
                    </Text>
                </View>

                <View style={s.detailRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={[s.detailText, { color: colors.textSecondary }]}>
                        {item.address.label} • {item.address.city}
                    </Text>
                </View>

                <View style={s.detailRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[s.detailText, { color: colors.textSecondary }]}>
                        Posted {calculateTimeAgo(item.createdAt)}
                    </Text>
                </View>
            </View>

            {/* Special Notes */}
            {item.notes && (
                <View style={[s.notesContainer, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#F0F8FF' }]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                    <Text style={[s.notesText, { color: colors.accent }]} numberOfLines={2}>
                        {item.notes}
                    </Text>
                </View>
            )}

            {/* Action Buttons */}
            <View style={[s.actionButtons, { borderTopColor: colors.divider }]}>
                <TouchableOpacity
                    style={[
                        s.acceptButton,
                        { backgroundColor: colors.success || '#4CAF50' },
                        acceptingId === item.id && s.buttonDisabled,
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
                            <Text style={s.acceptButtonText}>Accept Job</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        s.declineButton,
                        { backgroundColor: colors.background },
                        decliningId === item.id && s.buttonDisabled,
                    ]}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleDeclineJob(item.id);
                    }}
                    disabled={acceptingId === item.id || decliningId === item.id}
                >
                    {decliningId === item.id ? (
                        <ActivityIndicator color={colors.textSecondary} size="small" />
                    ) : (
                        <Text style={[s.declineButtonText, { color: colors.textSecondary }]}>Decline</Text>
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={s.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color={colors.divider} />
            <Text style={[s.emptyStateTitle, { color: colors.textSecondary }]}>No Job Requests</Text>
            <Text style={[s.emptyStateText, { color: colors.textSecondary }]}>
                New job requests will appear here when customers book your services
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading job requests...</Text>
            </View>
        );
    }

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>
                    {requests.length > 0 ? `Job Requests (${requests.length})` : 'Job Requests'}
                </Text>
                <TouchableOpacity onPress={() => loadRequests()}>
                    <Ionicons name="refresh" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Race Mode Banner */}
            {requests.length > 0 && (
                <View style={[s.raceBanner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFF3E0', borderBottomColor: isDark ? colors.border : '#FFE0B2' }]}>
                    <Ionicons name="flash" size={20} color={colors.warning || '#FF9800'} />
                    <Text style={[s.raceBannerText, { color: colors.warning || '#E65100' }]}>
                        Multiple washers compete for each job. Accept quickly to win!
                    </Text>
                </View>
            )}

            {/* Job List */}
            <FlatList
                data={requests}
                renderItem={renderJobCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.listContent}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
                }
            />
        </View>
    );
}

const s = StyleSheet.create({
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
    },
    raceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    raceBannerText: {
        flex: 1,
        fontSize: 14,
        marginLeft: 12,
        fontWeight: '500',
    },
    listContent: {
        padding: 20,
        paddingBottom: 110,
    },
    jobCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    raceIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    raceIndicatorText: {
        fontSize: 11,
        fontWeight: 'bold',
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
        fontWeight: '700',
        marginBottom: 6,
    },
    vehicleInfo: {
        fontSize: 14,
        marginBottom: 4,
    },
    licensePlate: {
        fontSize: 14,
        fontWeight: '600',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 22,
        fontWeight: '800',
    },
    duration: {
        fontSize: 12,
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
        marginLeft: 8,
    },
    notesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    notesText: {
        flex: 1,
        fontSize: 13,
        marginLeft: 8,
        lineHeight: 18,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingTop: 16,
        borderTopWidth: 1,
    },
    acceptButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
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
        borderRadius: 12,
        paddingVertical: 14,
    },
    declineButtonText: {
        fontSize: 14,
        fontWeight: '600',
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
        fontWeight: '700',
        marginTop: 16,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
        lineHeight: 22,
    },
});