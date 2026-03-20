import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, RefreshControl, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../services/apiClient';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    type: string;
    color: string;
    licensePlate: string;
    nickname?: string;
    isActive: boolean;
}

const TYPE_ICONS: Record<string, string> = {
    SUV: '🚙', Van: '🚐', Truck: '🛻',
    Sedan: '🚗', Hatchback: '🚗', Coupe: '🚗',
    Convertible: '🚗', Wagon: '🚗',
};

// Tinted backgrounds for vehicle types, will be adjusted in-line for dark mode
const TYPE_COLORS: Record<string, string> = {
    SUV: '#f0fdf4', Van: '#eff6ff', Truck: '#fff7ed',
    Sedan: '#f5f3ff', Hatchback: '#fdf4ff', Coupe: '#fef2f2',
    Convertible: '#fffbeb', Wagon: '#f0fdfa',
};

export default function VehicleListScreen() {
    const { colors, isDark } = useTheme();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const loadVehicles = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await apiFetch('/vehicles', {}, 'customer');
            if (res.success) setVehicles(res.data.vehicles || []);
        } catch {
            Alert.alert('Error', 'Failed to load vehicles');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadVehicles(); }, []);

    const onRefresh = () => { setRefreshing(true); loadVehicles(true); };

    const handleDelete = (vehicle: Vehicle) => {
        Alert.alert(
            'Remove Vehicle',
            `Remove ${vehicle.nickname || `${vehicle.make} ${vehicle.model}`}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleting(vehicle.id);
                            await apiFetch(`/vehicles/${vehicle.id}`, { method: 'DELETE' }, 'customer');
                            setVehicles(v => v.filter(x => x.id !== vehicle.id));
                        } catch {
                            Alert.alert('Error', 'Failed to remove vehicle');
                        } finally {
                            setDeleting(null);
                        }
                    },
                },
            ]
        );
    };

    if (loading) return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            <Header colors={colors} />
            <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>
        </View>
    );

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            <Header colors={colors} />
            <ScrollView
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />}
            >
                {vehicles.length === 0 ? (
                    <View style={s.emptyState}>
                        <View style={[s.emptyIconCircle, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                            <Text style={s.emptyEmoji}>🚗</Text>
                        </View>
                        <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No vehicles yet</Text>
                        <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>Add your first vehicle to start booking car wash services.</Text>
                        <TouchableOpacity style={[s.emptyAddBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/add-vehicle' as any)}>
                            <Ionicons name="add" size={18} color="#fff" />
                            <Text style={s.emptyAddBtnTxt}>Add Vehicle</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {vehicles.map(v => (
                            <TouchableOpacity
                                key={v.id}
                                style={[s.vehicleCard, { backgroundColor: colors.cardBackground }]}
                                onPress={() => router.push(`/add-vehicle?vehicleId=${v.id}&edit=true` as any)}
                                activeOpacity={0.85}
                            >
                                <View style={[s.vehicleIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : (TYPE_COLORS[v.type] || '#f8fafc') }]}>
                                    <Text style={s.vehicleEmoji}>{TYPE_ICONS[v.type] || '🚗'}</Text>
                                </View>

                                <View style={s.vehicleInfo}>
                                    <View style={s.vehicleTopRow}>
                                        <Text style={[s.vehicleName, { color: colors.textPrimary }]}>{v.nickname || `${v.make} ${v.model}`}</Text>
                                        <View style={[s.typePill, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                                            <Text style={[s.typePillTxt, { color: colors.accent }]}>{v.type}</Text>
                                        </View>
                                    </View>
                                    <Text style={[s.vehicleDetails, { color: colors.textSecondary }]}>{v.make} {v.model} · {v.year}</Text>
                                    <View style={s.vehicleBottomRow}>
                                        <View style={[s.platePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                                            <Ionicons name="card-outline" size={12} color={colors.textSecondary} />
                                            <Text style={[s.plateText, { color: colors.textPrimary }]}>{v.licensePlate}</Text>
                                        </View>
                                        <View style={[s.colorDot, { backgroundColor: v.color?.toLowerCase() || (isDark ? '#333' : '#e5e7eb') }]} />
                                        <Text style={[s.colorText, { color: colors.textSecondary }]}>{v.color}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={s.deleteBtn}
                                    onPress={() => handleDelete(v)}
                                    disabled={deleting === v.id}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    {deleting === v.id
                                        ? <ActivityIndicator size="small" color={colors.error} />
                                        : <Ionicons name="trash-outline" size={18} color={colors.error} />
                                    }
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={[s.addCard, { backgroundColor: colors.cardBackground, borderColor: isDark ? colors.accent : '#e0f4fd' }]} onPress={() => router.push('/add-vehicle' as any)}>
                            <View style={[s.addCardIcon, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                                <Ionicons name="add-circle" size={26} color={colors.accent} />
                            </View>
                            <Text style={[s.addCardTxt, { color: colors.accent }]}>Add Another Vehicle</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function Header({ colors }: { colors: any }) {
    return (
        <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>My Vehicles</Text>
            <TouchableOpacity onPress={() => router.push('/add-vehicle' as any)} style={s.headerAddBtn}>
                <Ionicons name="add" size={24} color={colors.accent} />
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    headerAddBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
    scroll: { padding: 20, paddingBottom: 110 },

    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24, marginBottom: 28 },
    emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
    emptyAddBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

    vehicleCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 18, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    vehicleIconCircle: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    vehicleEmoji: { fontSize: 28 },
    vehicleInfo: { flex: 1 },
    vehicleTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    vehicleName: { fontSize: 16, fontWeight: '700', flex: 1 },
    typePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    typePillTxt: { fontSize: 11, fontWeight: '700' },
    vehicleDetails: { fontSize: 13, marginBottom: 6 },
    vehicleBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    platePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    plateText: { fontSize: 12, fontWeight: '600' },
    colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
    colorText: { fontSize: 12 },
    deleteBtn: { padding: 8, marginLeft: 4 },

    addCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 18, padding: 18, borderWidth: 1.5, borderStyle: 'dashed',
    },
    addCardIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    addCardTxt: { flex: 1, fontSize: 15, fontWeight: '600' },
});