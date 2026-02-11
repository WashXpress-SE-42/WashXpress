import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getProfile, signOut } from '../services/authService';

export default function ProviderHomeScreen() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await getProfile();
            setProfile(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/');
        } catch (err) {
            console.error("❌ Sign out error:", err);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <>
            <StatusBar barStyle="light-content" />
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <LinearGradient colors={['#1e3a8a', '#1d4ed8']} style={styles.header}>
                        <View style={styles.headerTop}>
                            <View>
                                <Text style={styles.welcomeText}>Provider Portal</Text>
                                <Text style={styles.headerTitle}>Welcome, {profile?.firstName || 'Provider'}</Text>
                            </View>
                            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                                <Ionicons name="log-out-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                        <View style={styles.emptyCard}>
                            <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                            <Text style={styles.emptyText}>No appointments scheduled today</Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 20 },
    header: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeText: { fontSize: 14, color: '#bfdbfe' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    signOutButton: { padding: 8 },
    section: { paddingHorizontal: 24, marginTop: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
    emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
    emptyText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
});
