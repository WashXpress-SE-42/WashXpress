import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// ── Types ────────────────────────────────────────────────
type Job = {
    id: string;
    name: string;
    vehicle: string;
    service: string;
    address: string;
    date: string;
    time: string;
    amount: string;
    distance: string;
    priority: string;
};

// ── Helpers ──────────────────────────────────────────────
function formatDate(dateStr: string) {
    const today = new Date();
    const date = new Date(dateStr);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === new Date(today.getTime() + 86400000).toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PriorityBadge({ priority }: { priority: string }) {
    const map: any = {
        VIP: { bg: '#f3e8ff', text: '#7c3aed' },
        Priority: { bg: '#dbeafe', text: '#1d4ed8' },
        Standard: { bg: '#f3f4f6', text: '#6b7280' },
    };
    const s = map[priority] || map.Standard;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: s.bg }]}>
            <Text style={[badgeStyles.text, { color: s.text }]}>{priority}</Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 6 },
    text: { fontSize: 11, fontWeight: '600' },
});

// ── Main Component ───────────────────────────────────────
export default function WasherHome() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('home');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState<string | null>(null);

    // ── Fetch pending bookings from Firestore ────────────
    useEffect(() => {
        const q = query(
            collection(db, 'bookings'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched: Job[] = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.customerName ?? 'Unknown',
                    vehicle: `${data.vehicleMake ?? ''} ${data.vehicleModel ?? ''} • ${data.vehicleColor ?? ''} • ${data.licensePlate ?? ''}`,
                    service: data.serviceType ?? 'Service',
                    address: data.address ?? 'No address',
                    date: data.date ?? '',
                    time: data.time ?? '',
                    amount: `$${data.price ?? '0'}`,
                    distance: `${data.distance ?? '?'} miles`,
                    priority: data.priority ?? 'Standard',
                };
            });
            setJobs(fetched);
            setLoading(false);
        }, (error) => {
            console.error('Firestore error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ── Accept Job ───────────────────────────────────────
    const handleAcceptJob = async (jobId: string) => {
        try {
            setAccepting(jobId);
            await updateDoc(doc(db, 'bookings', jobId), {
                status: 'accepted',
                // TODO: add washerId when auth is implemented
            });
            // TODO: router.push(`/washer-booking-details?id=${jobId}`);
        } catch (error) {
            console.error('Failed to accept job:', error);
        } finally {
            setAccepting(null);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.welcomeText}>Welcome back</Text>
                            <Text style={styles.providerName}>Indrajith</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn}>
                            <Ionicons name="person-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Earnings Card */}
                    <TouchableOpacity style={styles.earningsCard} activeOpacity={0.85}>
                        <View style={styles.earningsLeft}>
                            <View style={styles.earningsLabelRow}>
                                <Ionicons name="cash-outline" size={16} color="#16a34a" />
                                <Text style={styles.earningsLabel}>  This Month's Earnings</Text>
                            </View>
                            <Text style={styles.earningsAmount}>$1,245</Text>
                            <View style={styles.trendRow}>
                                <Ionicons name="trending-up-outline" size={14} color="#16a34a" />
                                <Text style={styles.trendText}>  +12% from last month</Text>
                            </View>
                        </View>
                        <View style={styles.earningsRight}>
                            <Text style={styles.jobsDoneCount}>28</Text>
                            <Text style={styles.jobsDoneLabel}>Jobs Done</Text>
                        </View>
                        <Text style={styles.earningsTap}>Tap to view detailed statistics →</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Stats Grid ── */}
                <View style={styles.statsGrid}>
                    {[
                        { icon: 'star', color: '#f59e0b', value: '4.8', label: 'Rating' },
                        { icon: 'calendar-outline', color: '#3b82f6', value: '3', label: 'Today' },
                        { icon: 'checkmark-circle-outline', color: '#16a34a', value: '28', label: 'Completed' },
                    ].map((stat) => (
                        <View key={stat.label} style={styles.statCard}>
                            <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Available Jobs ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Available Jobs</Text>
                        {!loading && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>{jobs.length} New</Text>
                            </View>
                        )}
                    </View>

                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#16a34a" />
                            <Text style={styles.loadingText}>Fetching available jobs...</Text>
                        </View>
                    ) : jobs.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="car-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyTitle}>No Jobs Available</Text>
                            <Text style={styles.emptySubtitle}>Check back soon for new bookings</Text>
                        </View>
                    ) : (
                        jobs.map((job) => (
                            <View key={job.id} style={styles.jobCard}>
                                <View style={styles.jobCardHeader}>
                                    <View style={styles.jobCardLeft}>
                                        <View style={styles.jobNameRow}>
                                            <Text style={styles.jobName}>{job.name}</Text>
                                            <PriorityBadge priority={job.priority} />
                                        </View>
                                        <Text style={styles.jobVehicle}>{job.vehicle}</Text>
                                    </View>
                                    <View style={styles.jobCardRight}>
                                        <Text style={styles.jobAmount}>{job.amount}</Text>
                                        <Text style={styles.jobDistance}>{job.distance}</Text>
                                    </View>
                                </View>

                                <View style={styles.serviceBox}>
                                    <Ionicons name="car-sport-outline" size={14} color="#2563eb" />
                                    <Text style={styles.serviceText}>  {job.service}</Text>
                                </View>

                                <View style={styles.jobDetails}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="location-outline" size={14} color="#6b7280" />
                                        <Text style={styles.detailText}>{job.address}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                                        <Text style={styles.detailText}>{formatDate(job.date)}</Text>
                                        <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginLeft: 10 }} />
                                        <Text style={styles.detailText}>{job.time}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.acceptBtn, accepting === job.id && styles.acceptBtnDisabled]}
                                    activeOpacity={0.8}
                                    onPress={() => handleAcceptJob(job.id)}
                                    disabled={accepting === job.id}
                                >
                                    {accepting === job.id ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.acceptBtnText}>Accept Job</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    {/* Pro Tip */}
                    {!loading && jobs.length > 0 && (
                        <View style={styles.proTipCard}>
                            <View style={styles.proTipIcon}>
                                <Ionicons name="star" size={22} color="#d97706" />
                            </View>
                            <View style={styles.proTipContent}>
                                <Text style={styles.proTipTitle}>Pro Tip</Text>
                                <Text style={styles.proTipBody}>
                                    Jobs with Priority or VIP badges pay 15–30% more! Accept them quickly before they're taken.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ── Bottom Navigation ── */}
            <View style={styles.bottomNav}>
                {[
                    { key: 'home', icon: 'home-outline', label: 'Home' },
                    { key: 'jobs', icon: 'briefcase-outline', label: 'My Jobs' },
                    { key: 'earnings', icon: 'cash-outline', label: 'Earnings' },
                    { key: 'shop', icon: 'cart-outline', label: 'Shop' },
                    { key: 'profile', icon: 'person-outline', label: 'Profile' },
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.navItem}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={22}
                            color={activeTab === tab.key ? '#16a34a' : '#9ca3af'}
                        />
                        <Text style={[styles.navLabel, activeTab === tab.key && styles.navLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:              { flex: 1, backgroundColor: '#0d1629' },
    scroll:            { flex: 1 },
    scrollContent:     { paddingBottom: 90 },

    // Header
    header:            { backgroundColor: '#0d1629', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
    headerTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    welcomeText:       { color: '#93c5fd', fontSize: 14, marginBottom: 4 },
    providerName:      { color: '#fff', fontSize: 26, fontWeight: '700' },
    profileBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

    // Earnings Card
    earningsCard:      { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, flexDirection: 'row', flexWrap: 'wrap', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    earningsLeft:      { flex: 1 },
    earningsLabelRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    earningsLabel:     { fontSize: 12, color: '#93c5fd', fontWeight: '500' },
    earningsAmount:    { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
    trendRow:          { flexDirection: 'row', alignItems: 'center' },
    trendText:         { fontSize: 12, color: '#4ade80', fontWeight: '500' },
    earningsRight:     { alignItems: 'center', justifyContent: 'center', paddingLeft: 16 },
    jobsDoneCount:     { fontSize: 32, fontWeight: '800', color: '#2563eb' },
    jobsDoneLabel:     { fontSize: 12, color: '#93c5fd', fontWeight: '500' },
    earningsTap:       { width: '100%', textAlign: 'center', marginTop: 10, fontSize: 12, color: '#64748b' },

    // Stats Grid
    statsGrid:         { flexDirection: 'row', paddingHorizontal: 16, marginTop: -20, gap: 10, marginBottom: 8 },
    statCard:          { flex: 1, backgroundColor: '#1e2d4a', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    statValue:         { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 6 },
    statLabel:         { fontSize: 11, color: '#64748b', marginTop: 2 },

    // Section
    section:           { paddingHorizontal: 16, marginTop: 16 },
    sectionHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionTitle:      { fontSize: 18, fontWeight: '700', color: '#fff' },
    newBadge:          { marginLeft: 10, backgroundColor: 'rgba(37,99,235,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    newBadgeText:      { color: '#60a5fa', fontSize: 12, fontWeight: '600' },

    // Loading / Empty
    loadingBox:        { alignItems: 'center', paddingVertical: 40 },
    loadingText:       { marginTop: 12, color: '#64748b', fontSize: 14 },
    emptyBox:          { alignItems: 'center', paddingVertical: 40 },
    emptyTitle:        { fontSize: 16, fontWeight: '600', color: '#94a3b8', marginTop: 12 },
    emptySubtitle:     { fontSize: 13, color: '#64748b', marginTop: 4 },

    // Job Card
    jobCard:           { backgroundColor: '#1e2d4a', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
    jobCardHeader:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    jobCardLeft:       { flex: 1 },
    jobNameRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    jobName:           { fontSize: 16, fontWeight: '700', color: '#fff' },
    jobVehicle:        { fontSize: 13, color: '#64748b' },
    jobCardRight:      { alignItems: 'flex-end' },
    jobAmount:         { fontSize: 20, fontWeight: '800', color: '#2563eb' },
    jobDistance:       { fontSize: 12, color: '#64748b', marginTop: 2 },
    serviceBox:        { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(37,99,235,0.15)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10, alignSelf: 'flex-start' },
    serviceText:       { fontSize: 13, color: '#60a5fa', fontWeight: '600' },
    jobDetails:        { gap: 6, marginBottom: 14 },
    detailRow:         { flexDirection: 'row', alignItems: 'center' },
    detailText:        { fontSize: 13, color: '#94a3b8', marginLeft: 6 },

    // Accept Button
    acceptBtn:         { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
    acceptBtnDisabled: { backgroundColor: '#1e40af' },
    acceptBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Pro Tip Card
    proTipCard:        { flexDirection: 'row', backgroundColor: 'rgba(234,179,8,0.08)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)', borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 16, alignItems: 'flex-start' },
    proTipIcon:        { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(234,179,8,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    proTipContent:     { flex: 1 },
    proTipTitle:       { fontSize: 15, fontWeight: '700', color: '#fbbf24', marginBottom: 4 },
    proTipBody:        { fontSize: 13, color: '#d97706', lineHeight: 19 },

    // Bottom Nav
    bottomNav:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0d1629', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', paddingBottom: 20, paddingTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
    navItem:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
    navLabel:          { fontSize: 10, color: '#64748b', marginTop: 3, fontWeight: '500' },
    navLabelActive:    { color: '#2563eb', fontWeight: '600' },
});