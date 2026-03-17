import { apiFetch } from '@/services/apiClient';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Booking {
    id: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    totalPrice: number;
    currency: string;
    paidWithSubscription: boolean;
    service: {
        name: string;
    };
    customer: {
        displayName: string;
    };
    vehicle: {
        make: string;
        model: string;
    };
}

export default function WasherBookingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<'confirmed' | 'completed'>('confirmed');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadBookings();
    }, [activeTab]);

    const loadBookings = async () => {
        try {
            setLoading(true);
            const status = activeTab === 'confirmed' ? 'confirmed,in_progress' : 'completed';
            const data = await apiFetch(`/bookings?status=${status}`, {}, 'provider');

            if (data.success) {
                setBookings(data.data.bookings);
            }
        } catch (error) {
            console.error('Load bookings error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadBookings();
    };

    const getStatusColors = (status: string) => {
        switch (status) {
            case 'confirmed':
                return { bg: isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4', text: colors.success || '#16a34a' };
            case 'in_progress':
                return { bg: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff', text: colors.accent };
            case 'completed':
                return { bg: isDark ? 'rgba(107, 114, 128, 0.15)' : '#f3f4f6', text: colors.textSecondary };
            default:
                return { bg: colors.divider, text: colors.textSecondary };
        }
    };

    const renderBookingCard = ({ item }: { item: Booking }) => {
        const statusConfig = getStatusColors(item.status);
        
        return (
            <TouchableOpacity
                style={[s.bookingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => router.push(`/washer-booking-details?id=${item.id}` as Href)}
            >
                <View style={s.bookingHeader}>
                    <View style={s.bookingInfo}>
                        <Text style={[s.serviceName, { color: colors.textPrimary }]}>{item.service.name}</Text>
                        <Text style={[s.customerName, { color: colors.textSecondary }]}>{item.customer.displayName}</Text>
                        <Text style={[s.vehicleInfo, { color: colors.accent }]}>
                            {item.vehicle.make} {item.vehicle.model}
                        </Text>
                    </View>

                    <View style={s.priceContainer}>
                        <Text style={[s.price, { color: colors.success || '#4CAF50' }]}>
                            {item.paidWithSubscription ? (
                                <Text style={{ color: colors.success || '#4CAF50' }}>PAID</Text>
                            ) : (
                                `${item.currency} ${item.totalPrice.toLocaleString()}`
                            )}
                        </Text>
                        <View style={[s.statusBadge, { backgroundColor: statusConfig.bg }]}>
                            <Text style={[s.statusBadgeText, { color: statusConfig.text }]}>
                                {item.status === 'in_progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={[s.bookingFooter, { borderTopColor: colors.divider }]}>
                    <View style={s.footerItem}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[s.footerText, { color: colors.textSecondary }]}>{item.scheduledDate}</Text>
                    </View>
                    <View style={s.footerItem}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[s.footerText, { color: colors.textSecondary }]}>{item.scheduledTime}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.divider} />
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.divider} />
            <Text style={[s.emptyStateTitle, { color: colors.textSecondary }]}>
                {activeTab === 'confirmed' ? 'No Active Bookings' : 'No Completed Bookings'}
            </Text>
            <Text style={[s.emptyStateText, { color: colors.textSecondary }]}>
                {activeTab === 'confirmed'
                    ? 'Accepted bookings will appear here'
                    : 'Your completed jobs will appear here'}
            </Text>
        </View>
    );

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>My Bookings</Text>
                <TouchableOpacity onPress={loadBookings}>
                    <Ionicons name="refresh" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[s.tabs, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <TouchableOpacity
                    style={[s.tab, activeTab === 'confirmed' && [s.activeTab, { borderBottomColor: colors.accent }]]}
                    onPress={() => setActiveTab('confirmed')}
                >
                    <Text style={[s.tabText, { color: colors.textSecondary }, activeTab === 'confirmed' && [s.activeTabText, { color: colors.accent }]]}>
                        Active
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[s.tab, activeTab === 'completed' && [s.activeTab, { borderBottomColor: colors.accent }]]}
                    onPress={() => setActiveTab('completed')}
                >
                    <Text style={[s.tabText, { color: colors.textSecondary }, activeTab === 'completed' && [s.activeTabText, { color: colors.accent }]]}>
                        Completed
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Bookings List */}
            {loading ? (
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <FlatList
                    data={bookings}
                    renderItem={renderBookingCard}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={s.listContent}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
                    }
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
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
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {},
    tabText: {
        fontSize: 16,
        fontWeight: '500',
    },
    activeTabText: {
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    bookingCard: {
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
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    bookingInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    customerName: {
        fontSize: 14,
        marginBottom: 4,
    },
    vehicleInfo: {
        fontSize: 14,
        fontWeight: '600',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    bookingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    footerText: {
        fontSize: 12,
        marginLeft: 6,
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