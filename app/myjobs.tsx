import React, { useCallback, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, SafeAreaView, StatusBar, Alert,
    Linking, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiFetch } from '../services/apiClient';

// ── Types ────────────────────────────────────────────────
interface Booking {
    id: string;
    status: string;
    customerName: string;
    scheduledDate: string;
    scheduledTime: string;
    washerPreferredTime?: string;
    totalPrice: number;
    currency: string;
    paidWithSubscription: boolean;
    notes?: string | null;
    service: { name: string; categoryId: string; duration: number };
    vehicle: { make: string; model: string; year?: number; color: string; licensePlate: string; type?: string };
    address: { addressLine1: string; city: string };
}

// ── Helpers ──────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
    'exterior-wash': '🚿',
    'interior-clean': '🧹',
    'tire-cleaning': '⚙️',
    'full-detail': '✨',
};

function formatDate(dateStr: string) {
    if (!dateStr) return '—';
    const today = new Date();
    const d = new Date(dateStr);
    if (d.toDateString() === today.toDateString()) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t?: string) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function isToday(dateStr: string) {
    return new Date(dateStr).toDateString() === new Date().toDateString();
}

// ── Main Component ───────────────────────────────────────
export default function MyJobs() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('jobs');
    const [upcoming, setUpcoming] = useState<Booking[]>([]);
    const [completed, setCompleted] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadJobs = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const [confirmedRes, inProgressRes, completedRes] = await Promise.all([
                apiFetch('/bookings?status=confirmed', {}, 'provider'),
                apiFetch('/bookings?status=in_progress', {}, 'provider'),
                apiFetch('/bookings?status=completed', {}, 'provider'),
            ]);

            const upcomingJobs = [
                ...(confirmedRes.data?.bookings || []),
                ...(inProgressRes.data?.bookings || []),
            ].sort((a, b) =>
                `${a.scheduledDate}${a.washerPreferredTime || a.scheduledTime}` <
                `${b.scheduledDate}${b.washerPreferredTime || b.scheduledTime}` ? -1 : 1
            );

            const completedJobs = (completedRes.data?.bookings || [])
                .sort((a: Booking, b: Booking) => a.scheduledDate > b.scheduledDate ? -1 : 1);

            setUpcoming(upcomingJobs);
            setCompleted(completedJobs);
        } catch (e) {
            console.error('Load jobs error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadJobs(); }, [loadJobs]));

    const onRefresh = () => { setRefreshing(true); loadJobs(true); };

    const openMaps = (address: string) =>
        Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);

    const openDayRoute = () => {
        const todayAddresses = upcoming
            .filter(j => isToday(j.scheduledDate))
            .map(j => `${j.address.addressLine1}, ${j.address.city}`);
        if (todayAddresses.length === 0) {
            Alert.alert('No jobs today', 'You have no jobs scheduled for today.');
            return;
        }
        Linking.openURL(
            `https://maps.google.com/maps?waypoints=${todayAddresses.map(a => encodeURIComponent(a)).join('/')}`
        );
    };

    const todayCount = upcoming.filter(j => isToday(j.scheduledDate)).length;
    const pendingEarnings = upcoming
        .filter(j => !j.paidWithSubscription)
        .reduce((sum, j) => sum + (j.totalPrice || 0), 0);

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#0d1629" />

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={s.headerCenter}>
                    <Text style={s.headerTitle}>My Jobs</Text>
                    <Text style={s.headerSub}>Accepted & completed jobs</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {loading ? (
                <View style={s.loadingBox}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={s.loadingText}>Loading your jobs...</Text>
                </View>
            ) : (
                <ScrollView
                    style={s.scroll}
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
                >
                    {/* Stats Row */}
                    <View style={s.statsRow}>
                        <View style={s.statCard}>
                            <Ionicons name="calendar-outline" size={22} color="#2563eb" />
                            <Text style={s.statNum}>{upcoming.length}</Text>
                            <Text style={s.statLabel}>Upcoming</Text>
                        </View>
                        <View style={s.statCard}>
                            <Ionicons name="checkmark-circle-outline" size={22} color="#2563eb" />
                            <Text style={s.statNum}>{completed.length}</Text>
                            <Text style={s.statLabel}>Completed</Text>
                        </View>
                        <View style={s.statCard}>
                            <Ionicons name="cash-outline" size={22} color="#2563eb" />
                            <Text style={s.statNum}>
                                {pendingEarnings > 0 ? `LKR ${pendingEarnings.toLocaleString()}` : '—'}
                            </Text>
                            <Text style={s.statLabel}>Pending</Text>
                        </View>
                    </View>

                    {/* Day Route CTA */}
                    <TouchableOpacity style={s.routeBtn} activeOpacity={0.85} onPress={openDayRoute}>
                        <Ionicons name="navigate-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                        <View>
                            <Text style={s.routeBtnTitle}>Get Full Day Route</Text>
                            <Text style={s.routeBtnSub}>
                                {todayCount > 0
                                    ? `${todayCount} job${todayCount > 1 ? 's' : ''} today • Optimized route`
                                    : 'No jobs scheduled for today'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* ── Upcoming / In-Progress ── */}
                    <Text style={s.sectionTitle}>Upcoming Jobs</Text>
                    {upcoming.length === 0 ? (
                        <View style={s.emptyCard}>
                            <Ionicons name="briefcase-outline" size={48} color="#334155" />
                            <Text style={s.emptyTitle}>No upcoming jobs</Text>
                            <Text style={s.emptySubtitle}>Accept jobs from the home screen to see them here</Text>
                        </View>
                    ) : (
                        upcoming.map(job => <UpcomingJobCard key={job.id} job={job} onMap={openMaps} onView={id => router.push({ pathname: '/washer-booking-details', params: { id } } as any)} />)
                    )}

                    {/* ── Completed ── */}
                    <Text style={s.sectionTitle}>Completed Jobs</Text>
                    {completed.length === 0 ? (
                        <View style={s.emptyCard}>
                            <Ionicons name="checkmark-circle-outline" size={48} color="#334155" />
                            <Text style={s.emptyTitle}>No completed jobs yet</Text>
                        </View>
                    ) : (
                        completed.map(job => <CompletedJobCard key={job.id} job={job} onView={id => router.push({ pathname: '/washer-booking-details', params: { id } } as any)} />)
                    )}

                    {/* Pro Tip */}
                    <View style={s.tipCard}>
                        <View style={s.tipIcon}><Text style={{ fontSize: 22 }}>💡</Text></View>
                        <View style={s.tipContent}>
                            <Text style={s.tipTitle}>Pro Tip</Text>
                            <Text style={s.tipBody}>
                                Use "Directions" to navigate to job locations. Mark jobs complete as soon as you're done to update your earnings!
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* Bottom Nav */}
            <View style={s.bottomNav}>
                {[
                    { key: 'home',        icon: 'home-outline',      label: 'Home'     },
                    { key: 'jobs',        icon: 'briefcase-outline',  label: 'My Jobs'  },
                    { key: 'earnings',    icon: 'cash-outline',       label: 'Earnings' },
                    { key: 'marketplace', icon: 'cart-outline',        label: 'Shop'     },
                    { key: 'profile',     icon: 'person-outline',     label: 'Profile'  },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={s.navItem}
                        onPress={() => {
                            if (tab.key === 'home')        router.push('/washer-home' as any);
                            else if (tab.key === 'marketplace') router.push('/marketplace' as any);
                            else if (tab.key === 'profile') router.push('/profile' as any);
                            else setActiveTab(tab.key);
                        }}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={22}
                            color={activeTab === tab.key ? '#2563eb' : '#9ca3af'}
                        />
                        <Text style={[s.navLabel, activeTab === tab.key && s.navLabelActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
}

// ── Upcoming Job Card ────────────────────────────────────
function UpcomingJobCard({ job, onMap, onView }: { job: Booking; onMap: (a: string) => void; onView: (id: string) => void }) {
    const today = isToday(job.scheduledDate);
    const emoji = CATEGORY_EMOJI[job.service?.categoryId] || '🚿';
    const addressStr = `${job.address?.addressLine1}, ${job.address?.city}`;
    const arrivalTime = job.washerPreferredTime || job.scheduledTime;
    const timeAdjusted = job.washerPreferredTime && job.washerPreferredTime !== job.scheduledTime;
    const isInProgress = job.status === 'in_progress';

    return (
        <View style={[s.jobCard, today && s.jobCardToday, isInProgress && s.jobCardInProgress]}>
            {/* Status pill */}
            <View style={s.cardTopRow}>
                <View style={[s.statusPill, isInProgress ? s.statusPillInProgress : s.statusPillConfirmed]}>
                    <Ionicons name={isInProgress ? 'water-outline' : 'checkmark-circle-outline'} size={12} color={isInProgress ? '#8b5cf6' : '#0ca6e8'} />
                    <Text style={[s.statusPillText, { color: isInProgress ? '#8b5cf6' : '#0ca6e8' }]}>
                        {isInProgress ? 'In Progress' : 'Confirmed'}
                    </Text>
                </View>
                {today && (
                    <View style={s.todayPill}>
                        <Text style={s.todayPillText}>Today</Text>
                    </View>
                )}
            </View>

            {/* Header */}
            <View style={s.cardHeader}>
                <View style={[s.serviceEmoji, { backgroundColor: isInProgress ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.15)' }]}>
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.jobName}>{job.customerName}</Text>
                    <Text style={s.jobService}>{job.service?.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    {job.paidWithSubscription ? (
                        <View style={s.subBadge}>
                            <Text style={s.subBadgeText}>Sub</Text>
                        </View>
                    ) : (
                        <Text style={s.jobAmount}>LKR {job.totalPrice?.toLocaleString()}</Text>
                    )}
                    <Text style={s.jobDuration}>{job.service?.duration} min</Text>
                </View>
            </View>

            {/* Vehicle */}
            <View style={s.vehicleRow}>
                <Text style={s.vehicleEmoji}>🚗</Text>
                <Text style={s.vehicleText}>
                    {job.vehicle?.make} {job.vehicle?.model}
                    {job.vehicle?.year ? ` (${job.vehicle.year})` : ''}
                    {job.vehicle?.color ? ` · ${job.vehicle.color}` : ''}
                </Text>
                <Text style={s.plateText}>{job.vehicle?.licensePlate}</Text>
            </View>

            {/* Details */}
            <View style={s.details}>
                <View style={s.detailRow}>
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={s.detailText} numberOfLines={1}>{addressStr}</Text>
                </View>
                <View style={s.detailRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                    <Text style={[s.detailText, today && { color: '#2563eb', fontWeight: '600' }]}>
                        {formatDate(job.scheduledDate)}
                    </Text>
                    <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginLeft: 12 }} />
                    <Text style={[s.detailText, today && { color: '#2563eb', fontWeight: '600' }]}>
                        {formatTime(arrivalTime)}
                        {timeAdjusted && <Text style={{ color: '#f59e0b' }}> (adjusted)</Text>}
                    </Text>
                </View>
            </View>

            {/* Notes warning */}
            {!!job.notes && (
                <View style={s.notesRow}>
                    <Ionicons name="warning-outline" size={13} color="#fbbf24" />
                    <Text style={s.notesText} numberOfLines={2}>{job.notes}</Text>
                </View>
            )}

            {/* Actions */}
            <View style={s.actionRow}>
                <TouchableOpacity style={s.dirBtn} onPress={() => onMap(addressStr)}>
                    <Ionicons name="navigate-outline" size={15} color="#fff" />
                    <Text style={s.actionBtnText}> Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.detailBtn} onPress={() => onView(job.id)}>
                    <Ionicons name="eye-outline" size={15} color="#fff" />
                    <Text style={s.actionBtnText}> View Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Completed Job Card ───────────────────────────────────
function CompletedJobCard({ job, onView }: { job: Booking; onView: (id: string) => void }) {
    const emoji = CATEGORY_EMOJI[job.service?.categoryId] || '🚿';
    return (
        <TouchableOpacity style={[s.jobCard, { opacity: 0.9 }]} onPress={() => onView(job.id)} activeOpacity={0.85}>
            <View style={s.cardHeader}>
                <View style={[s.serviceEmoji, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.jobName}>{job.customerName}</Text>
                    <Text style={s.jobService}>{job.service?.name}</Text>
                    <Text style={s.completedMeta}>
                        {formatDate(job.scheduledDate)} · {formatTime(job.washerPreferredTime || job.scheduledTime)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    {job.paidWithSubscription ? (
                        <View style={s.subBadge}><Text style={s.subBadgeText}>Sub</Text></View>
                    ) : (
                        <Text style={s.jobAmount}>LKR {job.totalPrice?.toLocaleString()}</Text>
                    )}
                    <View style={s.paidBadge}>
                        <Ionicons name="checkmark-circle" size={11} color="#10b981" />
                        <Text style={s.paidText}> Done</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ── Styles ───────────────────────────────────────────────
const s = StyleSheet.create({
    safe:             { flex: 1, backgroundColor: '#0d1629' },
    scroll:           { flex: 1 },
    scrollContent:    { paddingHorizontal: 16, paddingBottom: 100 },
    loadingBox:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText:      { color: '#64748b', fontSize: 14 },

    header:           { backgroundColor: '#0d1629', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerCenter:     { flex: 1, alignItems: 'center' },
    headerTitle:      { color: '#fff', fontSize: 18, fontWeight: '700' },
    headerSub:        { color: '#93c5fd', fontSize: 12, marginTop: 1 },

    statsRow:         { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 4 },
    statCard:         { flex: 1, backgroundColor: '#1e2d4a', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    statNum:          { fontSize: 16, fontWeight: '800', marginTop: 4, color: '#2563eb' },
    statLabel:        { fontSize: 11, color: '#64748b', marginTop: 2 },

    routeBtn:         { backgroundColor: '#2563eb', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 14, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    routeBtnTitle:    { color: '#fff', fontSize: 15, fontWeight: '700' },
    routeBtnSub:      { color: '#bfdbfe', fontSize: 12, marginTop: 2 },

    sectionTitle:     { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 20, marginBottom: 10 },

    emptyCard:        { backgroundColor: '#1e2d4a', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    emptyTitle:       { fontSize: 15, fontWeight: '600', color: '#94a3b8', marginTop: 10 },
    emptySubtitle:    { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },

    jobCard:          { backgroundColor: '#1e2d4a', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    jobCardToday:     { borderColor: 'rgba(37,99,235,0.4)' },
    jobCardInProgress:{ borderColor: 'rgba(139,92,246,0.4)' },

    cardTopRow:       { flexDirection: 'row', gap: 8, marginBottom: 10 },
    statusPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusPillConfirmed: { backgroundColor: 'rgba(37,99,235,0.15)' },
    statusPillInProgress: { backgroundColor: 'rgba(139,92,246,0.15)' },
    statusPillText:   { fontSize: 11, fontWeight: '700' },
    todayPill:        { backgroundColor: 'rgba(37,99,235,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    todayPillText:    { fontSize: 11, fontWeight: '700', color: '#60a5fa' },

    cardHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    serviceEmoji:     { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    jobName:          { fontSize: 15, fontWeight: '700', color: '#fff' },
    jobService:       { fontSize: 13, color: '#64748b', marginTop: 2 },
    jobAmount:        { fontSize: 15, fontWeight: '800', color: '#2563eb' },
    jobDuration:      { fontSize: 11, color: '#64748b', marginTop: 2 },
    subBadge:         { backgroundColor: 'rgba(37,99,235,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    subBadgeText:     { fontSize: 11, fontWeight: '700', color: '#60a5fa' },

    vehicleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, marginBottom: 10 },
    vehicleEmoji:     { fontSize: 16 },
    vehicleText:      { flex: 1, fontSize: 13, color: '#94a3b8' },
    plateText:        { fontSize: 12, color: '#64748b' },

    details:          { gap: 6, marginBottom: 10 },
    detailRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText:       { fontSize: 13, color: '#94a3b8', flex: 1 },

    notesRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(234,179,8,0.08)', borderRadius: 8, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)' },
    notesText:        { fontSize: 12, color: '#fbbf24', flex: 1, lineHeight: 18 },

    actionRow:        { flexDirection: 'row', gap: 10 },
    dirBtn:           { flex: 1, flexDirection: 'row', backgroundColor: '#1e40af', borderRadius: 10, paddingVertical: 11, justifyContent: 'center', alignItems: 'center' },
    detailBtn:        { flex: 1, flexDirection: 'row', backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 11, justifyContent: 'center', alignItems: 'center' },
    actionBtnText:    { color: '#fff', fontWeight: '700', fontSize: 13 },

    completedMeta:    { fontSize: 12, color: '#64748b', marginTop: 3 },
    paidBadge:        { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
    paidText:         { color: '#10b981', fontSize: 11, fontWeight: '600' },

    tipCard:          { flexDirection: 'row', backgroundColor: 'rgba(234,179,8,0.08)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)', borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 16 },
    tipIcon:          { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(234,179,8,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    tipContent:       { flex: 1 },
    tipTitle:         { fontSize: 15, fontWeight: '700', color: '#fbbf24', marginBottom: 4 },
    tipBody:          { fontSize: 13, color: '#d97706', lineHeight: 19 },

    bottomNav:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0d1629', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', paddingBottom: 20, paddingTop: 10, elevation: 10 },
    navItem:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
    navLabel:         { fontSize: 10, color: '#64748b', marginTop: 3, fontWeight: '500' },
    navLabelActive:   { color: '#2563eb', fontWeight: '600' },
});