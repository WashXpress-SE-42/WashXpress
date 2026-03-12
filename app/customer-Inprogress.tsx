import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Header } from '../components/Header';
import { apiFetch } from '@/services/apiClient';

interface Booking {
    id: string;
    status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    arrivedAt?: string;
    startedAt?: string;
    completedAt?: string;
    scheduledDate: string;
    scheduledTime: string;
    service: { name: string };
    provider: { displayName: string; phone?: string; rating: number };
    vehicle: { make: string; model: string; nickname: string; licensePlate: string };
}

export default function CustomerInProgressScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const bookingId = params.id as string;

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bookingId) {
            Alert.alert('Error', 'Booking not found');
            router.back();
            return;
        }

        loadBookingDetails();
        // Poll for updates every 5 seconds
        const interval = setInterval(() => {
            loadBookingDetails(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [bookingId]);

    const loadBookingDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await apiFetch(`/bookings/${bookingId}`, {}, 'customer');

            if (data.success) {
                setBooking(data.data.booking);
                
                // If it's completed, redirect to rating screen
                if (data.data.booking.status === 'completed') {
                    router.replace(`/rate-booking?id=${bookingId}` as any);
                }
            } else {
                if (!silent) Alert.alert('Error', 'Booking not found');
            }
        } catch (error) {
            console.error('Load booking error:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Fetching status...</Text>
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Unable to load job details</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Determine current step
    let currentStepIndex = 0;
    if (booking.arrivedAt || booking.status === 'in_progress') {
        currentStepIndex = 1; // Arrived
    }
    if (booking.startedAt && booking.status === 'in_progress') {
        currentStepIndex = 2; // Wash in progress
    }
    if (booking.status === 'completed') {
        currentStepIndex = 3; // Done
    }

    const steps = [
        { title: 'Washer En Route', description: 'Your washer is on the way', icon: 'car-sport' },
        { title: 'Washer Arrived', description: 'Washer is at your location', icon: 'location' },
        { title: 'Wash in Progress', description: 'Your vehicle is being serviced', icon: 'water' },
        { title: 'Completed', description: 'Service is finished! Please review.', icon: 'checkmark-circle' },
    ];

    return (
        <View style={styles.container}>
            <Header title="Live Status" />

            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Status Timeline */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Live Tracking</Text>
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isActive = index === currentStepIndex;
                        const isPending = index > currentStepIndex;

                        let color = '#d1d5db'; // gray
                        if (isActive) color = '#0ca6e8'; // blue
                        if (isCompleted) color = '#16a34a'; // green

                        return (
                            <View key={index} style={styles.stepRow}>
                                {/* Timeline Line Indicator */}
                                <View style={styles.stepIndicator}>
                                    <View style={[styles.stepCircle, { backgroundColor: color }]}>
                                        <Ionicons 
                                            name={isCompleted ? 'checkmark' : step.icon as any} 
                                            size={16} 
                                            color="#fff" 
                                        />
                                    </View>
                                    {index < steps.length - 1 && (
                                        <View style={[styles.stepLine, { backgroundColor: isCompleted ? '#16a34a' : '#e5e7eb' }]} />
                                    )}
                                </View>

                                {/* Step Info */}
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: isActive ? '#0d1629' : (isCompleted ? '#16a34a' : '#6b7280') }]}>
                                        {step.title}
                                    </Text>
                                    <Text style={styles.stepDesc}>{step.description}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

               {/* Provider Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Your Washer</Text>
                    <View style={styles.providerRow}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={24} color="#0ca6e8" />
                        </View>
                        <View style={styles.providerInfo}>
                            <Text style={styles.providerName}>{booking.provider.displayName}</Text>
                            <Text style={styles.providerRating}>⭐ {booking.provider.rating}</Text>
                        </View>
                        <TouchableOpacity style={styles.actionIconButton}>
                             <Ionicons name="call" size={20} color="#0ca6e8" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIconButton}>
                             <Ionicons name="chatbubble" size={20} color="#0ca6e8" />
                        </TouchableOpacity>
                    </View>
                </View>

                 {/* Booking Ref */}
                 <View style={styles.card}>
                    <Text style={styles.cardTitle}>Service Overview</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Service:</Text>
                        <Text style={styles.infoValue}>{booking.service.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Vehicle:</Text>
                        <Text style={styles.infoValue}>{booking.vehicle.nickname || booking.vehicle.make}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Schedule:</Text>
                        <Text style={styles.infoValue}>{booking.scheduledTime}</Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#6b7280' },
    errorText: { color: '#ef4444', fontSize: 16, marginBottom: 16 },
    backButton: { backgroundColor: '#0ca6e8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    backButtonText: { color: '#fff', fontWeight: 'bold' },
    scroll: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d1629', marginBottom: 16 },
    
    // Timeline Settings
    stepRow: { flexDirection: 'row', gap: 16, marginBottom: 4, minHeight: 60 },
    stepIndicator: { alignItems: 'center', width: 30 },
    stepCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    stepLine: { width: 2, flex: 1, marginVertical: 4 },
    stepContent: { flex: 1, paddingTop: 4 },
    stepTitle: { fontSize: 16, fontWeight: 'bold' },
    stepDesc: { fontSize: 14, color: '#6b7280', marginTop: 2 },

    // Provider Config
    providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
    providerInfo: { flex: 1 },
    providerName: { fontSize: 16, fontWeight: 'bold', color: '#0d1629' },
    providerRating: { fontSize: 14, color: '#f59e0b', marginTop: 2 },
    actionIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center' },

    // Detail rows
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    infoLabel: { fontSize: 14, color: '#64748b' },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#0d1629' }
});
