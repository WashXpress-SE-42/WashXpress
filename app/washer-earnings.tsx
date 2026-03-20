import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, RefreshControl,
    ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '../firebaseConfig';

// ── Types ─────────────────────────────────────────────────────────────────────
interface EarningsSummary {
    totalEarnings: number;
    totalJobs: number;
    todayEarnings: number;
    todayJobs: number;
    weekEarnings: number;
    weekJobs: number;
    monthEarnings: number;
    monthJobs: number;
}

interface Booking {
    id: string;
    scheduledDate: string;
    scheduledTime?: string;
    totalPrice: number;
    paidWithSubscription: boolean;
    service?: { name: string };
    vehicle?: { make: string; model: string; type: string };
    status: string;
}

interface DayData {
    date: string;
    earnings: number;
    jobs: number;
}

type Period = 'today' | 'week' | 'month' | 'all';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
    return `LKR ${n.toLocaleString()}`;
}

function fmtDate(d: string) {
    const date = new Date(d + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d === today.toISOString().split('T')[0]) return 'Today';
    if (d === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTime(t?: string) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function toDateStr(d: Date) {
    return d.toISOString().split('T')[0];
}

const API_BASE = process.env.EXPO_PUBLIC_PROVIDER_API_URL || '';

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data }: { data: DayData[] }) {
    const max = Math.max(...data.map(d => d.earnings), 1);
    const last7 = data.slice(-7);

    return (
        <View style={chart.wrap}>
            {last7.map((d, i) => {
                const pct = d.earnings / max;
                const day = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                return (
                    <View key={i} style={chart.col}>
                        <Text style={chart.val}>{d.earnings > 0 ? `${Math.round(d.earnings / 1000)}k` : ''}</Text>
                        <View style={chart.barBg}>
                            <View style={[chart.barFill, { height: `${Math.max(pct * 100, 4)}%` as any }]} />
                        </View>
                        <Text style={chart.day}>{day}</Text>
                    </View>
                );
            })}
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WasherEarningsScreen() {
    const [summary, setSummary] = useState<EarningsSummary | null>(null);
    const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
    const [chartData, setChartData] = useState<DayData[]>([]);
    const [period, setPeriod] = useState<Period>('week');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chartLoading, setChartLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const getToken = async () => {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        return user.getIdToken(true);
    };

    const loadSummary = useCallback(async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/earnings`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setSummary(data.data.summary);
                setRecentBookings(data.data.recentBookings || []);
            }
        } catch (e) {
            console.error('Load earnings error:', e);
        }
    }, []);

    const loadChartData = useCallback(async () => {
        setChartLoading(true);
        try {
            const token = await getToken();
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 27); // last 4 weeks

            const res = await fetch(
                `${API_BASE}/earnings/range?startDate=${toDateStr(start)}&endDate=${toDateStr(end)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) setChartData(data.data.dateRangeData || []);
        } catch (e) {
            console.error('Load chart data error:', e);
        } finally {
            setChartLoading(false);
        }
    }, []);

    const loadAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        await Promise.all([loadSummary(), loadChartData()]);
        setLoading(false);
        setRefreshing(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, [loadSummary, loadChartData]);

    useEffect(() => { loadAll(); }, []);

    const onRefresh = () => { setRefreshing(true); loadAll(true); };

    // Period-filtered bookings
    const filteredBookings = React.useMemo(() => {
        if (period === 'all') return recentBookings;
        const today = toDateStr(new Date());
        const weekAgo = toDateStr(new Date(Date.now() - 7 * 864e5));
        const monthStart = toDateStr(new Date(new Date().setDate(1)));
        return recentBookings.filter(b => {
            if (period === 'today') return b.scheduledDate === today;
            if (period === 'week') return b.scheduledDate >= weekAgo;
            if (period === 'month') return b.scheduledDate >= monthStart;
            return true;
        });
    }, [recentBookings, period]);

    const periodEarnings = summary
        ? period === 'today' ? summary.todayEarnings
        : period === 'week' ? summary.weekEarnings
        : period === 'month' ? summary.monthEarnings
        : summary.totalEarnings
        : 0;

    const periodJobs = summary
        ? period === 'today' ? summary.todayJobs
        : period === 'week' ? summary.weekJobs
        : period === 'month' ? summary.monthJobs
        : summary.totalJobs
        : 0;

    if (loading) return (
        <View style={s.safe}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Earnings</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={s.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        </View>
    );

    return (
        <View style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Earnings</Text>
                <View style={{ width: 40 }} />
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
                }
            >
                {/* ── Hero earnings card ── */}
                <View style={s.heroCard}>
                    <View style={s.heroTop}>
                        <View>
                            <Text style={s.heroLabel}>
                                {period === 'today' ? "Today's Earnings"
                                    : period === 'week' ? 'This Week'
                                    : period === 'month' ? 'This Month'
                                    : 'All Time'}
                            </Text>
                            <Text style={s.heroAmount}>{fmt(periodEarnings)}</Text>
                        </View>
                        <View style={s.heroRight}>
                            <View style={s.heroJobsBadge}>
                                <Ionicons name="checkmark-done-circle" size={18} color="#4ade80" />
                                <Text style={s.heroJobsTxt}>{periodJobs} job{periodJobs !== 1 ? 's' : ''}</Text>
                            </View>
                            {periodJobs > 0 && (
                                <Text style={s.heroAvg}>
                                    avg {fmt(Math.round(periodEarnings / periodJobs))} / job
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Period tabs */}
                    <View style={s.periodTabs}>
                        {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
                            <TouchableOpacity
                                key={p}
                                style={[s.periodTab, period === p && s.periodTabActive]}
                                onPress={() => setPeriod(p)}
                            >
                                <Text style={[s.periodTabTxt, period === p && s.periodTabTxtActive]}>
                                    {p === 'today' ? 'Today'
                                        : p === 'week' ? 'Week'
                                        : p === 'month' ? 'Month'
                                        : 'All Time'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Stats grid ── */}
                <View style={s.statsGrid}>
                    {[
                        { label: "Today's", amount: summary?.todayEarnings || 0, jobs: summary?.todayJobs || 0, icon: 'sunny-outline', color: '#f59e0b' },
                        { label: 'This Week', amount: summary?.weekEarnings || 0, jobs: summary?.weekJobs || 0, icon: 'calendar-outline', color: '#2563eb' },
                        { label: 'This Month', amount: summary?.monthEarnings || 0, jobs: summary?.monthJobs || 0, icon: 'stats-chart-outline', color: '#7c3aed' },
                        { label: 'All Time', amount: summary?.totalEarnings || 0, jobs: summary?.totalJobs || 0, icon: 'trophy-outline', color: '#059669' },
                    ].map((stat, i) => (
                        <View key={i} style={s.statCard}>
                            <View style={[s.statIconCircle, { backgroundColor: stat.color + '20' }]}>
                                <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                            </View>
                            <Text style={s.statLabel}>{stat.label}</Text>
                            <Text style={[s.statAmount, { color: stat.color }]}>
                                {fmt(stat.amount)}
                            </Text>
                            <Text style={s.statJobs}>{stat.jobs} job{stat.jobs !== 1 ? 's' : ''}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Weekly chart ── */}
                <View style={s.card}>
                    <View style={s.cardTitleRow}>
                        <Ionicons name="bar-chart-outline" size={18} color="#2563eb" />
                        <Text style={s.cardTitle}>Last 7 Days</Text>
                    </View>
                    {chartLoading ? (
                        <ActivityIndicator color="#2563eb" style={{ paddingVertical: 24 }} />
                    ) : chartData.length > 0 ? (
                        <BarChart data={chartData} />
                    ) : (
                        <View style={s.emptyChart}>
                            <Text style={s.emptyChartTxt}>No data yet</Text>
                        </View>
                    )}
                </View>

                {/* ── Subscription jobs note ── */}
                <View style={s.subNote}>
                    <Ionicons name="information-circle-outline" size={16} color="#60a5fa" />
                    <Text style={s.subNoteTxt}>
                        Subscription jobs are not counted in earnings — they are shown separately below.
                    </Text>
                </View>

                {/* ── Recent jobs ── */}
                <View style={s.card}>
                    <View style={s.cardTitleRow}>
                        <Ionicons name="receipt-outline" size={18} color="#2563eb" />
                        <Text style={s.cardTitle}>
                            {period === 'today' ? "Today's Jobs"
                                : period === 'week' ? 'This Week\'s Jobs'
                                : period === 'month' ? 'This Month\'s Jobs'
                                : 'Recent Jobs'}
                        </Text>
                        <Text style={s.cardCount}>{filteredBookings.length}</Text>
                    </View>

                    {filteredBookings.length === 0 ? (
                        <View style={s.emptyJobs}>
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>💼</Text>
                            <Text style={s.emptyJobsTxt}>No jobs in this period</Text>
                        </View>
                    ) : (
                        filteredBookings.map((b, i) => (
                            <View key={b.id} style={[s.jobRow, i < filteredBookings.length - 1 && s.jobRowBorder]}>
                                {/* Left */}
                                <View style={[s.jobIconCircle, b.paidWithSubscription ? s.jobIconSub : s.jobIconPaid]}>
                                    <Ionicons
                                        name={b.paidWithSubscription ? 'refresh-circle-outline' : 'card-outline'}
                                        size={18}
                                        color={b.paidWithSubscription ? '#60a5fa' : '#4ade80'}
                                    />
                                </View>

                                {/* Info */}
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={s.jobService} numberOfLines={1}>
                                        {b.service?.name || 'Car Wash Service'}
                                    </Text>
                                    <Text style={s.jobMeta}>
                                        {fmtDate(b.scheduledDate)}
                                        {b.scheduledTime ? ` · ${fmtTime(b.scheduledTime)}` : ''}
                                        {b.vehicle ? ` · ${b.vehicle.make} ${b.vehicle.model}` : ''}
                                    </Text>
                                    {b.paidWithSubscription && (
                                        <View style={s.subBadge}>
                                            <Text style={s.subBadgeTxt}>Subscription Job</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Amount */}
                                <Text style={[s.jobAmount, b.paidWithSubscription && s.jobAmountSub]}>
                                    {b.paidWithSubscription ? 'Sub' : fmt(b.totalPrice)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                {/* ── Tips card ── */}
                <View style={[s.card, { borderColor: 'rgba(37,99,235,0.3)' }]}>
                    <View style={s.cardTitleRow}>
                        <Ionicons name="bulb-outline" size={18} color="#f59e0b" />
                        <Text style={s.cardTitle}>Boost Your Earnings</Text>
                    </View>
                    {[
                        { icon: '⚡', tip: 'Accept jobs quickly in race mode — first to accept wins' },
                        { icon: '⭐', tip: 'Maintain a 4.5+ rating to get priority job matching' },
                        { icon: '📅', tip: 'Stay available on weekends — highest demand days' },
                        { icon: '🎓', tip: 'Become a certified mentor for extra recognition' },
                    ].map((t, i) => (
                        <View key={i} style={s.tipRow}>
                            <Text style={{ fontSize: 18, width: 28 }}>{t.icon}</Text>
                            <Text style={s.tipTxt}>{t.tip}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 48 }} />
            </Animated.ScrollView>
        </View>
    );
}

// ── Bar Chart Styles ──────────────────────────────────────────────────────────
const chart = StyleSheet.create({
    wrap:   { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6, paddingTop: 16 },
    col:    { flex: 1, alignItems: 'center', gap: 4 },
    barBg:  { width: '100%', height: 80, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill:{ width: '100%', backgroundColor: '#2563eb', borderRadius: 6 },
    val:    { fontSize: 9, color: '#64748b', height: 12 },
    day:    { fontSize: 10, color: '#64748b', fontWeight: '600' },
});

// ── Main Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe:           { flex: 1, backgroundColor: '#0d1629' },
    center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#1e2d4a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    backBtn:        { width: 40, height: 40, justifyContent: 'center' },
    headerTitle:    { fontSize: 18, fontWeight: '700', color: '#fff' },
    scroll:         { padding: 16, paddingBottom: 48 },

    heroCard:       { backgroundColor: '#1e2d4a', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(37,99,235,0.3)' },
    heroTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    heroLabel:      { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 6 },
    heroAmount:     { fontSize: 32, fontWeight: '800', color: '#fff' },
    heroRight:      { alignItems: 'flex-end', gap: 6 },
    heroJobsBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    heroJobsTxt:    { fontSize: 13, fontWeight: '700', color: '#4ade80' },
    heroAvg:        { fontSize: 11, color: '#64748b' },

    periodTabs:     { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 3, gap: 2 },
    periodTab:      { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    periodTabActive:{ backgroundColor: '#2563eb' },
    periodTabTxt:   { fontSize: 12, fontWeight: '600', color: '#64748b' },
    periodTabTxtActive:{ color: '#fff' },

    statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    statCard:       { width: '47.5%', backgroundColor: '#1e2d4a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    statIconCircle: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statLabel:      { fontSize: 12, color: '#64748b', marginBottom: 4 },
    statAmount:     { fontSize: 16, fontWeight: '800', marginBottom: 2 },
    statJobs:       { fontSize: 11, color: '#64748b' },

    card:           { backgroundColor: '#1e2d4a', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    cardTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardTitle:      { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
    cardCount:      { fontSize: 13, fontWeight: '700', color: '#64748b' },

    emptyChart:     { paddingVertical: 24, alignItems: 'center' },
    emptyChartTxt:  { color: '#64748b', fontSize: 13 },

    subNote:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(37,99,235,0.08)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)' },
    subNoteTxt:     { flex: 1, fontSize: 12, color: '#94a3b8', lineHeight: 17 },

    jobRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    jobRowBorder:   { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    jobIconCircle:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    jobIconPaid:    { backgroundColor: 'rgba(74,222,128,0.1)' },
    jobIconSub:     { backgroundColor: 'rgba(96,165,250,0.1)' },
    jobService:     { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 3 },
    jobMeta:        { fontSize: 12, color: '#64748b' },
    jobAmount:      { fontSize: 15, fontWeight: '800', color: '#4ade80' },
    jobAmountSub:   { color: '#60a5fa', fontSize: 13 },

    subBadge:       { backgroundColor: 'rgba(96,165,250,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3 },
    subBadgeTxt:    { fontSize: 10, fontWeight: '700', color: '#60a5fa' },

    emptyJobs:      { paddingVertical: 24, alignItems: 'center' },
    emptyJobsTxt:   { fontSize: 13, color: '#64748b' },

    tipRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    tipTxt:         { flex: 1, fontSize: 13, color: '#94a3b8', lineHeight: 19 },
});