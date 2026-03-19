import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

const VEHICLE_TYPES = ['Sedan', 'Hatchback', 'SUV', 'Coupe', 'Convertible', 'Wagon', 'Van', 'Truck'];
const COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Gold', 'Other'];

const COLOR_SWATCHES: Record<string, string> = {
    White: '#ffffff', Black: '#1f2937', Silver: '#9ca3af', Gray: '#6b7280',
    Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308',
    Orange: '#f97316', Brown: '#92400e', Gold: '#d97706', Other: '#e5e7eb',
};

const CURRENT_YEAR = new Date().getFullYear();

export default function AddVehicleScreen() {
    const { colors, isDark } = useTheme();
    const { vehicleId, edit } = useLocalSearchParams<{ vehicleId?: string; edit?: string }>();
    const isEdit = edit === 'true' && !!vehicleId;

    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState(String(CURRENT_YEAR));
    const [type, setType] = useState('');
    const [color, setColor] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isEdit) loadVehicle();
    }, []);

    const loadVehicle = async () => {
        try {
            const res = await apiFetch(`/vehicles/${vehicleId}`, {}, 'customer');
            if (res.success) {
                const v = res.data.vehicle;
                setMake(v.make || '');
                setModel(v.model || '');
                setYear(String(v.year || CURRENT_YEAR));
                setType(v.type || '');
                setColor(v.color || '');
                setLicensePlate(v.licensePlate || '');
                setNickname(v.nickname || '');
            }
        } catch { Alert.alert('Error', 'Failed to load vehicle details'); }
        finally { setLoading(false); }
    };

    const validate = () => {
        if (!make.trim()) { Alert.alert('Required', 'Please enter the vehicle make.'); return false; }
        if (!model.trim()) { Alert.alert('Required', 'Please enter the vehicle model.'); return false; }
        if (!type) { Alert.alert('Required', 'Please select a vehicle type.'); return false; }
        if (!color) { Alert.alert('Required', 'Please select a vehicle color.'); return false; }
        if (!licensePlate.trim()) { Alert.alert('Required', 'Please enter the license plate number.'); return false; }
        const yearNum = Number(year);
        if (!year || isNaN(yearNum) || yearNum < 1980 || yearNum > CURRENT_YEAR + 1) {
            Alert.alert('Invalid Year', `Please enter a valid year between 1980 and ${CURRENT_YEAR + 1}.`); return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                make: make.trim(),
                model: model.trim(),
                year: Number(year),
                type,
                color,
                licensePlate: licensePlate.trim().toUpperCase(),
                nickname: nickname.trim() || undefined,
            };

            if (isEdit) {
                await apiFetch(`/vehicles/${vehicleId}`, { method: 'PUT', body: JSON.stringify(payload) }, 'customer');
                Alert.alert('Updated!', 'Vehicle updated successfully.', [{ text: 'OK', onPress: () => router.back() }]);
            } else {
                await apiFetch('/vehicles', { method: 'POST', body: JSON.stringify(payload) }, 'customer');
                Alert.alert('Added!', 'Vehicle added successfully.', [{ text: 'OK', onPress: () => router.back() }]);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save vehicle');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            <Header isEdit={isEdit} colors={colors} />
            <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>
        </View>
    );

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            <Header isEdit={isEdit} colors={colors} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Make & Model */}
                    <View style={s.row}>
                        <View style={[s.fieldWrap, { flex: 1, marginRight: 8 }]}>
                            <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Make <Text style={s.required}>*</Text></Text>
                            <TextInput
                                style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                                placeholder="e.g. Toyota"
                                placeholderTextColor={colors.textSecondary}
                                value={make}
                                onChangeText={setMake}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={[s.fieldWrap, { flex: 1 }]}>
                            <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Model <Text style={s.required}>*</Text></Text>
                            <TextInput
                                style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                                placeholder="e.g. Corolla"
                                placeholderTextColor={colors.textSecondary}
                                value={model}
                                onChangeText={setModel}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    {/* Year & Nickname */}
                    <View style={s.row}>
                        <View style={[s.fieldWrap, { flex: 1, marginRight: 8 }]}>
                            <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Year <Text style={s.required}>*</Text></Text>
                            <TextInput
                                style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                                placeholder={String(CURRENT_YEAR)}
                                placeholderTextColor={colors.textSecondary}
                                value={year}
                                onChangeText={setYear}
                                keyboardType="numeric"
                                maxLength={4}
                            />
                        </View>
                        <View style={[s.fieldWrap, { flex: 1 }]}>
                            <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Nickname <Text style={[s.optional, { color: colors.textSecondary }]}>(optional)</Text></Text>
                            <TextInput
                                style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                                placeholder="e.g. My Corolla"
                                placeholderTextColor={colors.textSecondary}
                                value={nickname}
                                onChangeText={setNickname}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    {/* License Plate */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>License Plate <Text style={s.required}>*</Text></Text>
                        <TextInput
                            style={[s.input, s.plateInput, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                            placeholder="e.g. CAR-1234"
                            placeholderTextColor={colors.textSecondary}
                            value={licensePlate}
                            onChangeText={t => setLicensePlate(t.toUpperCase())}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* Vehicle Type */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Vehicle Type <Text style={s.required}>*</Text></Text>
                        <View style={s.typeGrid}>
                            {VEHICLE_TYPES.map(t => {
                                const sel = type === t;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[s.typeChip, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, sel && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                                        onPress={() => setType(t)}
                                    >
                                        <Text style={[s.typeChipTxt, { color: colors.textSecondary }, sel && { color: '#fff' }]}>{t}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {type && (
                            <View style={[s.typeNotice, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                                <Ionicons name="information-circle-outline" size={13} color={colors.accent} />
                                <Text style={[s.typeNoticeTxt, { color: colors.accent }]}>
                                    {type === 'Sedan' || type === 'Hatchback' || type === 'Coupe'
                                        ? 'Standard pricing applies'
                                        : type === 'Convertible' ? '+10% pricing'
                                            : type === 'Wagon' ? '+20% pricing'
                                                : type === 'SUV' ? '+30% pricing'
                                                    : type === 'Van' ? '+40% pricing'
                                                        : '+50% pricing'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Color */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Color <Text style={s.required}>*</Text></Text>
                        <View style={s.colorGrid}>
                            {COLORS.map(c => {
                                const sel = color === c;
                                return (
                                    <TouchableOpacity
                                        key={c}
                                        style={[s.colorChip, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, sel && { borderColor: colors.accent, backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#f0faff' }]}
                                        onPress={() => setColor(c)}
                                    >
                                        <View style={[s.colorSwatch, { backgroundColor: COLOR_SWATCHES[c] || (isDark ? '#333' : '#e5e7eb'), borderWidth: c === 'White' ? 1 : 0, borderColor: isDark ? '#444' : '#e5e7eb' }]} />
                                        <Text style={[s.colorChipTxt, { color: colors.textSecondary }, sel && { color: colors.accent }]}>{c}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Save button */}
                    <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.accent }, saving && { backgroundColor: isDark ? '#444' : '#d1d5db' }]} onPress={handleSave} disabled={saving}>
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <><Ionicons name={isEdit ? 'save-outline' : 'add-circle-outline'} size={20} color="#fff" /><Text style={s.saveBtnTxt}>{isEdit ? 'Save Changes' : 'Add Vehicle'}</Text></>
                        }
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function Header({ isEdit, colors }: { isEdit: boolean, colors: any }) {
    return (
        <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
            <View style={{ width: 40 }} />
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
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scroll: { padding: 20, paddingBottom: 110 },

    row: { flexDirection: 'row', marginBottom: 0 },
    fieldWrap: { marginBottom: 20 },
    fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    required: { color: '#ef4444' },
    optional: { fontWeight: '400', fontSize: 12 },

    input: {
        borderRadius: 12, borderWidth: 1,
        paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    },
    plateInput: { fontWeight: '700', letterSpacing: 2, fontSize: 16 },

    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
    typeChipSel: { },
    typeChipTxt: { fontSize: 14, fontWeight: '600' },
    typeChipSelTxt: { },
    typeNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderRadius: 8, padding: 8 },
    typeNoticeTxt: { fontSize: 12, fontWeight: '600' },

    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    colorChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
    colorChipSel: { },
    colorSwatch: { width: 16, height: 16, borderRadius: 8 },
    colorChipTxt: { fontSize: 13, fontWeight: '600' },
    colorChipSelTxt: { },

    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 8 },
    saveBtnDisabled: { },
    saveBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
});