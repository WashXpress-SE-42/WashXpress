import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface WasherProfile {
    uid: string;
    displayName: string;
    email: string;
    phoneNumber: string;
    photoURL?: string;
    area: string;
    rating: number;
    totalReviews: number;
    totalBookings: number;
    isActive: boolean;
    isVerified: boolean;
    memberSince: string;
}

interface Booking {
    id: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    startedAt?: string;
    service: {
        name: string;
        price: number;
        duration: number;
    };
    customer: {
        displayName: string;
    };
    vehicle: {
        make: string;
        model: string;
        nickname: string;
    };
    address: {
        label: string;
        city: string;
    };
}

interface Stats {
    todayEarnings: number;
    weekEarnings: number;
    monthEarnings: number;
    pendingRequests: number;
    todayBookings: number;
    completedToday: number;
}

export default function WasherHomeScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<WasherProfile | null>(null);
    const [currentJob, setCurrentJob] = useState<Booking | null>(null);
    const [nextBooking, setNextBooking] = useState<Booking | null>(null);
    const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
    const setRequests = setPendingRequests;
    const [stats, setStats] = useState<Stats>({
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
        pendingRequests: 0,
        todayBookings: 0,
        completedToday: 0,
    });

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDashboardData();
        // Poll for new requests every 10 seconds
        const interval = setInterval(() => {
            loadPendingRequests(true);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadProfile(),
                loadCurrentJob(),
                loadNextBooking(),
                loadPendingRequests(),
                loadStats(),
            ]);
        } catch (error: any) {
            console.error('Load dashboard error:', error);
            Alert.alert('Connection Error', 'Failed to load dashboard data. Please check if the server is running and the IP address in .env is correct.');
        } finally {
            setLoading(false);
        }
    };

    const loadProfile = async () => {
        try {
            const data = await apiFetch('/profile', {}, 'provider');

            if (data.success) {
                setProfile(data.data.provider);
            }
        } catch (error) {
            console.error('Load profile error:', error);
        }
    };

    const loadCurrentJob = async () => {
        try {
            const data = await apiFetch('/bookings?status=in_progress&limit=1', {}, 'provider');

            if (data.success && data.data.bookings.length > 0) {
                setCurrentJob(data.data.bookings[0]);
            } else {
                setCurrentJob(null);
            }
        } catch (error) {
            console.error('Load current job error:', error);
        }
    };

    const loadNextBooking = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await apiFetch(`/bookings?status=confirmed&startDate=${today}&limit=1`, {}, 'provider');

            if (data.success && data.data.bookings.length > 0) {
                setNextBooking(data.data.bookings[0]);
            } else {
                setNextBooking(null);
            }
        } catch (error) {
            console.error('Load next booking error:', error);
        }
    };

    const loadPendingRequests = async (silent = false) => {
        try {
            const data = await apiFetch('/bookings?status=pending&limit=10', {}, 'provider');

            if (data.success) {
                setRequests(data.data.bookings);
                setStats(prev => ({ ...prev, pendingRequests: data.data.bookings.length }));

                // Show notification if new requests (only if silent update)
                if (silent && data.data.bookings.length > 0) {
                    // You can show a badge or notification here
                }
            }
        } catch (error) {
            console.error('Load pending requests error:', error);
        }
    };

    const loadStats = async () => {
        try {
            const token = await AsyncStorage.getItem('idToken');
            const today = new Date().toISOString().split('T')[0];

            // Get today's completed bookings
            const todayData = await apiFetch(`/bookings?status=completed&startDate=${today}&endDate=${today}`, {}, 'provider');

            if (todayData.success) {
                const completedToday = todayData.data.bookings.length;
                const todayEarnings = todayData.data.bookings.reduce(
                    (sum: number, b: Booking) => sum + b.service.price,
                    0
                );

                setStats(prev => ({
                    ...prev,
                    completedToday,
                    todayEarnings,
                    todayBookings: completedToday,
                }));
            }

            // Calculate week/month earnings would require more API calls
            // For now, using mock data - implement proper calculations in production
            setStats(prev => ({
                ...prev,
                weekEarnings: prev.todayEarnings * 5, // Mock
                monthEarnings: prev.todayEarnings * 20, // Mock
            }));
        } catch (error) {
            console.error('Load stats error:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDashboardData();
        setRefreshing(false);
    };

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['customToken', 'idToken', 'user']);
        router.replace('/login');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.profilePic}>
                        {profile?.photoURL ? (
                            <Image source={{ uri: profile.photoURL }} style={styles.profileImage} />
                        ) : (
                            <Ionicons name="person" size={24} color="#666" />
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.name}>{profile?.displayName || 'Washer'}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => router.push('/washer-notifications' as any)}
                >
                    {pendingRequests.length > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingRequests.length}</Text>
                        </View>
                    )}
                    <Ionicons name="notifications-outline" size={28} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Current Job Banner */}
                {currentJob ? (
                    <TouchableOpacity
                        style={styles.currentJobBanner}
                        onPress={() => router.push(`/washer-booking-details?id=${currentJob.id}` as any)}
                    >
                        <View style={styles.currentJobHeader}>
                            <View style={styles.pulseIndicator} />
                            <Text style={styles.currentJobTitle}>CURRENT JOB IN PROGRESS</Text>
                        </View>

                        <View style={styles.currentJobContent}>
                            <View style={styles.currentJobInfo}>
                                <Text style={styles.currentJobService}>{currentJob.service.name}</Text>
                                <Text style={styles.currentJobCustomer}>{currentJob.customer.displayName}</Text>
                                <Text style={styles.currentJobVehicle}>
                                    {currentJob.vehicle.make} {currentJob.vehicle.model}
                                </Text>
                            </View>

                            <View style={styles.currentJobActions}>
                                <View style={styles.currentJobTime}>
                                    <Ionicons name="time-outline" size={16} color="#FFF" />
                                    <Text style={styles.currentJobTimeText}>
                                        {currentJob.startedAt
                                            ? `Started ${new Date(currentJob.startedAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}`
                                            : 'In Progress'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="#FFF" />
                            </View>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.noJobBanner}>
                        <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
                        <Text style={styles.noJobText}>No active job</Text>
                        <Text style={styles.noJobSubtext}>New requests will appear here</Text>
                    </View>
                )}

                {/* Stats Overview */}
                <View style={styles.statsContainer}>
                    <Text style={styles.sectionTitle}>Today's Performance</Text>

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Ionicons name="cash-outline" size={32} color="#4CAF50" />
                            <Text style={styles.statValue}>LKR {stats.todayEarnings.toLocaleString()}</Text>
                            <Text style={styles.statLabel}>Earned Today</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="checkmark-circle-outline" size={32} color="#2196F3" />
                            <Text style={styles.statValue}>{stats.completedToday}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="star-outline" size={32} color="#FFD700" />
                            <Text style={styles.statValue}>{profile?.rating || 0}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Ionicons name="time-outline" size={32} color="#FF9800" />
                            <Text style={styles.statValue}>{pendingRequests.length}</Text>
                            <Text style={styles.statLabel}>New Requests</Text>
                        </View>
                    </View>
                </View>

                {/* Earnings Summary */}
                <View style={styles.earningsCard}>
                    <View style={styles.earningsHeader}>
                        <Text style={styles.sectionTitle}>Earnings</Text>
                        <TouchableOpacity onPress={() => router.push('/washer-earnings' as any)}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.earningsRow}>
                        <View style={styles.earningItem}>
                            <Text style={styles.earningLabel}>This Week</Text>
                            <Text style={styles.earningValue}>
                                LKR {stats.weekEarnings.toLocaleString()}
                            </Text>
                        </View>

                        <View style={styles.earningDivider} />

                        <View style={styles.earningItem}>
                            <Text style={styles.earningLabel}>This Month</Text>
                            <Text style={styles.earningValue}>
                                LKR {stats.monthEarnings.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>New Job Requests</Text>
                            <TouchableOpacity onPress={() => router.push('/washer-requests')}>
                                <Text style={styles.viewAllText}>View All ({pendingRequests.length})</Text>
                            </TouchableOpacity>
                        </View>

                        {pendingRequests.slice(0, 3).map((request) => (
                            <TouchableOpacity
                                key={request.id}
                                style={styles.requestCard}
                                onPress={() => router.push(`/washer-job-request?id=${request.id}`)}
                            >
                                <View style={styles.requestHeader}>
                                    <View>
                                        <Text style={styles.requestService}>{request.service.name}</Text>
                                        <Text style={styles.requestCustomer}>{request.customer.displayName}</Text>
                                    </View>
                                    <View style={styles.requestPriceContainer}>
                                        <Text style={styles.requestPrice}>
                                            LKR {request.service.price.toLocaleString()}
                                        </Text>
                                        <Text style={styles.requestDuration}>~{request.service.duration} min</Text>
                                    </View>
                                </View>

                                <View style={styles.requestFooter}>
                                    <View style={styles.requestInfo}>
                                        <Ionicons name="calendar-outline" size={14} color="#666" />
                                        <Text style={styles.requestInfoText}>
                                            {request.scheduledDate} at {request.scheduledTime}
                                        </Text>
                                    </View>
                                    <View style={styles.requestInfo}>
                                        <Ionicons name="location-outline" size={14} color="#666" />
                                        <Text style={styles.requestInfoText}>{request.address.city}</Text>
                                    </View>
                                </View>

                                <View style={styles.requestActions}>
                                    <TouchableOpacity
                                        style={styles.acceptButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            router.push(`/washer-job-request?id=${request.id}&action=accept`);
                                        }}
                                    >
                                        <Text style={styles.acceptButtonText}>Accept</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.declineButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            router.push(`/washer-job-request?id=${request.id}&action=decline`);
                                        }}
                                    >
                                        <Text style={styles.declineButtonText}>Decline</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Next Booking */}
                {nextBooking && !currentJob && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Next Scheduled Job</Text>

                        <TouchableOpacity
                            style={styles.nextBookingCard}
                            onPress={() => router.push(`/washer-booking-details?id=${nextBooking.id}` as any)}
                        >
                            <View style={styles.nextBookingHeader}>
                                <View>
                                    <Text style={styles.nextBookingService}>{nextBooking.service.name}</Text>
                                    <Text style={styles.nextBookingCustomer}>
                                        {nextBooking.customer.displayName}
                                    </Text>
                                </View>
                                <View style={styles.nextBookingPrice}>
                                    <Text style={styles.nextBookingPriceText}>
                                        LKR {nextBooking.service.price.toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.nextBookingDetails}>
                                <View style={styles.nextBookingDetail}>
                                    <Ionicons name="calendar" size={18} color="#007AFF" />
                                    <Text style={styles.nextBookingDetailText}>
                                        {nextBooking.scheduledDate}
                                    </Text>
                                </View>

                                <View style={styles.nextBookingDetail}>
                                    <Ionicons name="time" size={18} color="#007AFF" />
                                    <Text style={styles.nextBookingDetailText}>
                                        {nextBooking.scheduledTime}
                                    </Text>
                                </View>

                                <View style={styles.nextBookingDetail}>
                                    <Ionicons name="location" size={18} color="#007AFF" />
                                    <Text style={styles.nextBookingDetailText}>
                                        {nextBooking.address.label}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/washer-bookings' as any)}
                        >
                            <Ionicons name="calendar-outline" size={32} color="#007AFF" />
                            <Text style={styles.quickActionText}>My Bookings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/washer-earnings' as any)}
                        >
                            <Ionicons name="stats-chart-outline" size={32} color="#007AFF" />
                            <Text style={styles.quickActionText}>Earnings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/washer-reviews' as any)}
                        >
                            <Ionicons name="star-outline" size={32} color="#007AFF" />
                            <Text style={styles.quickActionText}>Reviews</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push('/profile' as any)}
                        >
                            <Ionicons name="person-outline" size={32} color="#007AFF" />
                            <Text style={styles.quickActionText}>Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePic: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    headerText: {},
    greeting: {
        fontSize: 14,
        color: '#666',
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 2,
    },
    notificationButton: {
        position: 'relative',
        padding: 8,
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },

    // Current Job Banner
    currentJobBanner: {
        backgroundColor: '#007AFF',
        margin: 20,
        marginBottom: 12,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    currentJobHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    pulseIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        marginRight: 8,
    },
    currentJobTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 1,
    },
    currentJobContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currentJobInfo: {
        flex: 1,
    },
    currentJobService: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    currentJobCustomer: {
        fontSize: 16,
        color: '#E3F2FD',
        marginBottom: 4,
    },
    currentJobVehicle: {
        fontSize: 14,
        color: '#E3F2FD',
    },
    currentJobActions: {
        alignItems: 'flex-end',
    },
    currentJobTime: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    currentJobTimeText: {
        fontSize: 12,
        color: '#FFF',
        marginLeft: 4,
    },

    // No Job Banner
    noJobBanner: {
        backgroundColor: '#FFF',
        margin: 20,
        marginBottom: 12,
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
    },
    noJobText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginTop: 12,
    },
    noJobSubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },

    // Stats
    statsContainer: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 12,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },

    // Earnings
    earningsCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 12,
        padding: 20,
    },
    earningsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewAllText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
    earningsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    earningItem: {
        flex: 1,
        alignItems: 'center',
    },
    earningLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    earningValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    earningDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E0E0E0',
    },

    // Section
    section: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },

    // Request Cards
    requestCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    requestService: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    requestCustomer: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    requestPriceContainer: {
        alignItems: 'flex-end',
    },
    requestPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    requestDuration: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    requestFooter: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    requestInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    requestInfoText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    requestActions: {
        flexDirection: 'row',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    acceptButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 8,
    },
    acceptButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    declineButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    declineButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },

    // Next Booking
    nextBookingCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    nextBookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    nextBookingService: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    nextBookingCustomer: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    nextBookingPrice: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    nextBookingPriceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    nextBookingDetails: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 16,
    },
    nextBookingDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    nextBookingDetailText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 12,
    },

    // Quick Actions
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    quickActionCard: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    quickActionText: {
        fontSize: 14,
        color: '#000',
        marginTop: 12,
        fontWeight: '500',
    },

    // Logout
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 12,
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

