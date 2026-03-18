import React, { useCallback, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, SafeAreaView, StatusBar, Alert,
    Linking, ActivityIndicator, RefreshControl,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

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
    const { colors, isDark } = useTheme();
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
        <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

            {/* Header */}
            <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={[s.backBtn, { backgroundColor: colors.inputBackground }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={s.headerCenter}>
                    <Text style={[s.headerTitle, { color: colors.textPrimary }]}>My Jobs</Text>
                    <Text style={[s.headerSub, { color: colors.textSecondary }]}>Accepted & completed jobs</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {loading ? (
                <View style={s.loadingBox}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading your jobs...</Text>
                </View>
            ) : (
                <ScrollView
                    style={s.scroll}
                    contentContainerStyle={[s.scrollContent, { paddingBottom: 110 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
                >
                    {/* Stats Row */}
                    <View style={s.statsRow}>
                        <View style={[s.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Ionicons name="calendar-outline" size={22} color={colors.accent} />
                            <Text style={[s.statNum, { color: colors.accent }]}>{upcoming.length}</Text>
                            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Upcoming</Text>
                        </View>
                        <View style={[s.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                            <Text style={[s.statNum, { color: colors.success }]}>{completed.length}</Text>
                            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Completed</Text>
                        </View>
                        <View style={[s.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Ionicons name="cash-outline" size={22} color={colors.accent} />
                            <Text style={[s.statNum, { color: colors.accent }]}>
                                {pendingEarnings > 0 ? `LKR ${pendingEarnings.toLocaleString()}` : '—'}
                            </Text>
                            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                        </View>
                    </View>

                    {/* Day Route CTA */}
                    <TouchableOpacity style={[s.routeBtn, { backgroundColor: colors.accent }]} activeOpacity={0.85} onPress={openDayRoute}>
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
                    <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Upcoming Jobs</Text>
                    {upcoming.length === 0 ? (
                        <View style={[s.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
                            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No upcoming jobs</Text>
                            <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>Accept jobs from the home screen to see them here</Text>
                        </View>
                    ) : (
                        upcoming.map(job => <UpcomingJobCard key={job.id} job={job} colors={colors} isDark={isDark} onMap={openMaps} onView={id => router.push({ pathname: '/washer-inprogress', params: { id } } as any)} />)
                    )}

                    {/* ── Completed ── */}
                    <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Completed Jobs</Text>
                    {completed.length === 0 ? (
                        <View style={[s.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textSecondary} />
                            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No completed jobs yet</Text>
                        </View>
                    ) : (
                        completed.map(job => <CompletedJobCard key={job.id} job={job} colors={colors} onView={id => router.push({ pathname: '/washer-booking-details', params: { id } } as any)} />)
                    )}

                    {/* Pro Tip */}
                    <View style={[s.tipCard, { backgroundColor: isDark ? 'rgba(234,179,8,0.08)' : '#fffbeb', borderColor: isDark ? 'rgba(234,179,8,0.2)' : '#fde68a' }]}>
                        <View style={[s.tipIcon, { backgroundColor: 'rgba(234,179,8,0.12)' }]}><Text style={{ fontSize: 22 }}>💡</Text></View>
                        <View style={s.tipContent}>
                            <Text style={[s.tipTitle, { color: '#f59e0b' }]}>Pro Tip</Text>
                            <Text style={[s.tipBody, { color: isDark ? '#d97706' : '#92400e' }]}>
                                Use "Directions" to navigate to job locations. Mark jobs complete as soon as you're done to update your earnings!
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ── Upcoming Job Card ────────────────────────────────────
function UpcomingJobCard({ job, colors, isDark, onMap, onView }: { job: Booking; colors: any; isDark: boolean; onMap: (a: string) => void; onView: (id: string) => void }) {
    const today = isToday(job.scheduledDate);
    const emoji = CATEGORY_EMOJI[job.service?.categoryId] || '🚿';
    const addressStr = `${job.address?.addressLine1}, ${job.address?.city}`;
    const arrivalTime = job.washerPreferredTime || job.scheduledTime;
    const timeAdjusted = job.washerPreferredTime && job.washerPreferredTime !== job.scheduledTime;
    const isInProgress = job.status === 'in_progress';

    return (
        <View style={[s.jobCard, { backgroundColor: colors.cardBackground, borderColor: today ? 'rgba(37,99,235,0.35)' : colors.border }, isInProgress && { borderColor: 'rgba(139,92,246,0.4)' }]}>
            {/* Status pill */}
            <View style={s.cardTopRow}>
                <View style={[s.statusPill, { backgroundColor: isInProgress ? 'rgba(139,92,246,0.12)' : 'rgba(37,99,235,0.12)' }]}>
                    <Ionicons name={isInProgress ? 'water-outline' : 'checkmark-circle-outline'} size={12} color={isInProgress ? '#8b5cf6' : '#0ca6e8'} />
                    <Text style={[s.statusPillText, { color: isInProgress ? '#8b5cf6' : '#0ca6e8' }]}>
                        {isInProgress ? 'In Progress' : 'Confirmed'}
                    </Text>
                </View>
                {today && (
                    <View style={[s.todayPill, { backgroundColor: 'rgba(37,99,235,0.15)' }]}>
                        <Text style={[s.todayPillText, { color: colors.accent }]}>Today</Text>
                    </View>
                )}
            </View>

            {/* Header */}
            <View style={s.cardHeader}>
                <View style={[s.serviceEmoji, { backgroundColor: isInProgress ? 'rgba(139,92,246,0.12)' : 'rgba(37,99,235,0.12)' }]}>
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.jobName, { color: colors.textPrimary }]}>{job.customerName}</Text>
                    <Text style={[s.jobService, { color: colors.textSecondary }]}>{job.service?.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    {job.paidWithSubscription ? (
                        <View style={[s.subBadge, { backgroundColor: isDark ? 'rgba(37,99,235,0.2)' : '#dbeafe' }]}>
                            <Text style={[s.subBadgeText, { color: colors.accent }]}>Sub</Text>
                        </View>
                    ) : (
                        <Text style={[s.jobAmount, { color: colors.accent }]}>LKR {job.totalPrice?.toLocaleString()}</Text>
                    )}
                    <Text style={[s.jobDuration, { color: colors.textSecondary }]}>{job.service?.duration} min</Text>
                </View>
            </View>

            {/* Vehicle */}
            <View style={[s.vehicleRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.inputBackground }]}>
                <Text style={s.vehicleEmoji}>🚗</Text>
                <Text style={[s.vehicleText, { color: colors.textSecondary }]}>
                    {job.vehicle?.make} {job.vehicle?.model}
                    {job.vehicle?.year ? ` (${job.vehicle.year})` : ''}
                    {job.vehicle?.color ? ` · ${job.vehicle.color}` : ''}
                </Text>
                <Text style={[s.plateText, { color: colors.textSecondary }]}>{job.vehicle?.licensePlate}</Text>
            </View>

            {/* Details */}
            <View style={s.details}>
                <View style={s.detailRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={[s.detailText, { color: colors.textSecondary }]} numberOfLines={1}>{addressStr}</Text>
                </View>
                <View style={s.detailRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[s.detailText, { color: today ? colors.accent : colors.textSecondary, fontWeight: today ? '600' : '400' }]}>
                        {formatDate(job.scheduledDate)}
                    </Text>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
                    <Text style={[s.detailText, { color: today ? colors.accent : colors.textSecondary, fontWeight: today ? '600' : '400' }]}>
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
                <TouchableOpacity style={[s.dirBtn, { backgroundColor: isDark ? '#1e40af' : '#3b82f6' }]} onPress={() => onMap(addressStr)}>
                    <Ionicons name="navigate-outline" size={15} color="#fff" />
                    <Text style={s.actionBtnText}> Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.detailBtn, { backgroundColor: colors.accent }]} onPress={() => onView(job.id)}>
                    <Ionicons name="eye-outline" size={15} color="#fff" />
                    <Text style={s.actionBtnText}> View Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Completed Job Card ───────────────────────────────────
function CompletedJobCard({ job, colors, onView }: { job: Booking; colors: any; onView: (id: string) => void }) {
    const emoji = CATEGORY_EMOJI[job.service?.categoryId] || '🚿';
    return (
        <TouchableOpacity style={[s.jobCard, { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: 0.9 }]} onPress={() => onView(job.id)} activeOpacity={0.85}>
            <View style={s.cardHeader}>
                <View style={[s.serviceEmoji, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.jobName, { color: colors.textPrimary }]}>{job.customerName}</Text>
                    <Text style={[s.jobService, { color: colors.textSecondary }]}>{job.service?.name}</Text>
                    <Text style={[s.completedMeta, { color: colors.textSecondary }]}>
                        {formatDate(job.scheduledDate)} · {formatTime(job.washerPreferredTime || job.scheduledTime)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    {job.paidWithSubscription ? (
                        <View style={[s.subBadge, { backgroundColor: 'rgba(37,99,235,0.15)' }]}><Text style={[s.subBadgeText, { color: colors.accent }]}>Sub</Text></View>
                    ) : (
                        <Text style={[s.jobAmount, { color: colors.accent }]}>LKR {job.totalPrice?.toLocaleString()}</Text>
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
    safe:             { flex: 1 },
    scroll:           { flex: 1 },
    scrollContent:    { paddingHorizontal: 16, paddingBottom: 100 },
    loadingBox:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText:      { fontSize: 14 },

    header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    backBtn:          { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    headerCenter:     { flex: 1, alignItems: 'center' },
    headerTitle:      { fontSize: 18, fontWeight: '700' },
    headerSub:        { fontSize: 12, marginTop: 1 },

    statsRow:         { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 4 },
    statCard:         { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },
    statNum:          { fontSize: 16, fontWeight: '800', marginTop: 4 },
    statLabel:        { fontSize: 11, marginTop: 2 },

    routeBtn:         { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 14, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    routeBtnTitle:    { color: '#fff', fontSize: 15, fontWeight: '700' },
    routeBtnSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

    sectionTitle:     { fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 10 },

    emptyCard:        { borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 10, borderWidth: 1 },
    emptyTitle:       { fontSize: 15, fontWeight: '600', marginTop: 10 },
    emptySubtitle:    { fontSize: 13, marginTop: 4, textAlign: 'center' },

    jobCard:          { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },

    cardTopRow:       { flexDirection: 'row', gap: 8, marginBottom: 10 },
    statusPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusPillText:   { fontSize: 11, fontWeight: '700' },
    todayPill:        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    todayPillText:    { fontSize: 11, fontWeight: '700' },

    cardHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    serviceEmoji:     { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    jobName:          { fontSize: 15, fontWeight: '700' },
    jobService:       { fontSize: 13, marginTop: 2 },
    jobAmount:        { fontSize: 15, fontWeight: '800' },
    jobDuration:      { fontSize: 11, marginTop: 2 },
    subBadge:         { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    subBadgeText:     { fontSize: 11, fontWeight: '700' },

    vehicleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 10 },
    vehicleEmoji:     { fontSize: 16 },
    vehicleText:      { flex: 1, fontSize: 13 },
    plateText:        { fontSize: 12 },

    details:          { gap: 6, marginBottom: 10 },
    detailRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText:       { fontSize: 13, flex: 1 },

    notesRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(234,179,8,0.08)', borderRadius: 8, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)' },
    notesText:        { fontSize: 12, color: '#fbbf24', flex: 1, lineHeight: 18 },

    actionRow:        { flexDirection: 'row', gap: 10 },
    dirBtn:           { flex: 1, flexDirection: 'row', borderRadius: 10, paddingVertical: 11, justifyContent: 'center', alignItems: 'center' },
    detailBtn:        { flex: 1, flexDirection: 'row', borderRadius: 10, paddingVertical: 11, justifyContent: 'center', alignItems: 'center' },
    actionBtnText:    { color: '#fff', fontWeight: '700', fontSize: 13 },

    completedMeta:    { fontSize: 12, marginTop: 3 },
    paidBadge:        { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
    paidText:         { color: '#10b981', fontSize: 11, fontWeight: '600' },

    tipCard:          { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 16 },
    tipIcon:          { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    tipContent:       { flex: 1 },
    tipTitle:         { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    tipBody:          { fontSize: 13, lineHeight: 19 },
});