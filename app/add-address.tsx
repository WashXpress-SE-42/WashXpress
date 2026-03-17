import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
    Platform, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

const LABELS = ['Home', 'Work', 'Office', 'Other'];

const LABEL_ICONS: Record<string, string> = {
    Home: 'home', Work: 'briefcase', Office: 'business', Other: 'location',
};

const SRI_LANKA_CITIES = [
    'Colombo', 'Negombo', 'Kandy', 'Galle', 'Jaffna', 'Trincomalee',
    'Batticaloa', 'Anuradhapura', 'Polonnaruwa', 'Kurunegala', 'Ratnapura',
    'Badulla', 'Matara', 'Hambantota', 'Vavuniya', 'Mannar', 'Kalmunai',
    'Dambulla', 'Kegalle', 'Nuwara Eliya', 'Matale', 'Ampara', 'Puttalam',
    'Chilaw', 'Kalutara', 'Panadura', 'Moratuwa', 'Dehiwala', 'Maharagama',
    'Kaduwela', 'Kesbewa', 'Wattala', 'Ja-Ela', 'Katunayake', 'Gampaha',
    'Kadawatha', 'Ragama', 'Kiribathgoda', 'Kottawa', 'Horana', 'Avissawella',
    'Piliyandala', 'Boralesgamuwa', 'Mount Lavinia', 'Nugegoda',
];

export default function AddAddressScreen() {
    const { colors, isDark } = useTheme();
    const { addressId, edit } = useLocalSearchParams<{ addressId?: string; edit?: string }>();
    const isEdit = edit === 'true' && !!addressId;

    const [label, setLabel] = useState('Home');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [cityModal, setCityModal] = useState(false);
    const [citySearch, setCitySearch] = useState('');

    useEffect(() => {
        if (isEdit) loadAddress();
    }, []);

    const loadAddress = async () => {
        try {
            const res = await apiFetch(`/addresses/${addressId}`, {}, 'customer');
            if (res.success) {
                const a = res.data.address;
                setLabel(a.label || 'Home');
                setAddressLine1(a.addressLine1 || '');
                setAddressLine2(a.addressLine2 || '');
                setCity(a.city || '');
                setPostalCode(a.postalCode || '');
            }
        } catch { Alert.alert('Error', 'Failed to load address'); }
        finally { setLoading(false); }
    };

    const validate = () => {
        if (!addressLine1.trim()) { Alert.alert('Required', 'Please enter the street address.'); return false; }
        if (!city.trim()) { Alert.alert('Required', 'Please select a city.'); return false; }
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                label,
                addressLine1: addressLine1.trim(),
                addressLine2: addressLine2.trim() || undefined,
                city: city.trim(),
                postalCode: postalCode.trim() || undefined,
                country: 'Sri Lanka',
            };

            if (isEdit) {
                await apiFetch(`/addresses/${addressId}`, { method: 'PUT', body: JSON.stringify(payload) }, 'customer');
                Alert.alert('Updated!', 'Address updated successfully.', [{ text: 'OK', onPress: () => router.back() }]);
            } else {
                await apiFetch('/addresses', { method: 'POST', body: JSON.stringify(payload) }, 'customer');
                Alert.alert('Added!', 'Address added successfully.', [{ text: 'OK', onPress: () => router.back() }]);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save address');
        } finally {
            setSaving(false);
        }
    };

    const filteredCities = SRI_LANKA_CITIES.filter(c =>
        c.toLowerCase().includes(citySearch.toLowerCase())
    );

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

                    {/* Label */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Address Type</Text>
                        <View style={s.labelRow}>
                            {LABELS.map(l => {
                                const sel = label === l;
                                return (
                                    <TouchableOpacity
                                        key={l}
                                        style={[s.labelChip, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, sel && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                                        onPress={() => setLabel(l)}
                                    >
                                        <Ionicons name={LABEL_ICONS[l] as any} size={16} color={sel ? '#fff' : colors.textSecondary} />
                                        <Text style={[s.labelChipTxt, { color: colors.textSecondary }, sel && { color: '#fff' }]}>{l}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Address Line 1 */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Street Address <Text style={s.required}>*</Text></Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                            placeholder="e.g. 42 Galle Road"
                            placeholderTextColor={colors.textSecondary}
                            value={addressLine1}
                            onChangeText={setAddressLine1}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Address Line 2 */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Apartment / Floor <Text style={[s.optional, { color: colors.textSecondary }]}>(optional)</Text></Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                            placeholder="e.g. Apt 3B, 2nd Floor"
                            placeholderTextColor={colors.textSecondary}
                            value={addressLine2}
                            onChangeText={setAddressLine2}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* City */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>City <Text style={s.required}>*</Text></Text>
                        <TouchableOpacity
                            style={[s.input, s.cityPicker, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}
                            onPress={() => setCityModal(true)}
                        >
                            <Text style={[city ? s.cityPickerSelected : s.cityPickerPlaceholder, { color: city ? colors.textPrimary : colors.textSecondary }]}>
                                {city || 'Select city...'}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Postal Code */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Postal Code <Text style={[s.optional, { color: colors.textSecondary }]}>(optional)</Text></Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                            placeholder="e.g. 10000"
                            placeholderTextColor={colors.textSecondary}
                            value={postalCode}
                            onChangeText={setPostalCode}
                            keyboardType="numeric"
                            maxLength={6}
                        />
                    </View>

                    {/* Country (read-only) */}
                    <View style={s.fieldWrap}>
                        <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Country</Text>
                        <View style={[s.input, s.readOnly, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: colors.divider }]}>
                            <Text style={[s.readOnlyTxt, { color: colors.textSecondary }]}>🇱🇰  Sri Lanka</Text>
                        </View>
                    </View>

                    {/* Save button */}
                    <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.accent }, saving && { backgroundColor: isDark ? '#444' : '#d1d5db' }]} onPress={handleSave} disabled={saving}>
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <><Ionicons name={isEdit ? 'save-outline' : 'add-circle-outline'} size={20} color="#fff" /><Text style={s.saveBtnTxt}>{isEdit ? 'Save Changes' : 'Add Address'}</Text></>
                        }
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* City Picker Modal */}
            <Modal visible={cityModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCityModal(false)}>
                <View style={[s.modalWrap, { backgroundColor: colors.background }]}>
                    <View style={[s.modalHead, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                        <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Select City</Text>
                        <TouchableOpacity onPress={() => setCityModal(false)}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    <View style={[s.searchWrap, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}>
                        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                        <TextInput
                            style={[s.searchInput, { color: colors.textPrimary }]}
                            placeholder="Search city..."
                            placeholderTextColor={colors.textSecondary}
                            value={citySearch}
                            onChangeText={setCitySearch}
                            autoFocus
                        />
                        {citySearch.length > 0 && (
                            <TouchableOpacity onPress={() => setCitySearch('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                        {filteredCities.map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[s.cityItem, { borderBottomColor: colors.divider }, city === c && [s.cityItemSel, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#f0faff' }]]}
                                onPress={() => { setCity(c); setCityModal(false); setCitySearch(''); }}
                            >
                                <Text style={[s.cityItemTxt, { color: colors.textPrimary }, city === c && [s.cityItemSelTxt, { color: colors.accent }]]}>{c}</Text>
                                {city === c && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
                            </TouchableOpacity>
                        ))}
                        {filteredCities.length === 0 && (
                            <View style={s.noResults}>
                                <Text style={[s.noResultsTxt, { color: colors.textSecondary }]}>No cities found for "{citySearch}"</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

function Header({ isEdit, colors }: { isEdit: boolean, colors: any }) {
    return (
        <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{isEdit ? 'Edit Address' : 'Add Address'}</Text>
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
    scroll: { padding: 20 },

    fieldWrap: { marginBottom: 20 },
    fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    required: { color: '#ef4444' },
    optional: { fontWeight: '400', fontSize: 12 },

    labelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    labelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
    labelChipSel: { },
    labelChipTxt: { fontSize: 14, fontWeight: '600' },
    labelChipSelTxt: { },

    input: {
        borderRadius: 12, borderWidth: 1,
        paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    },
    cityPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cityPickerSelected: { fontSize: 15, fontWeight: '500' },
    cityPickerPlaceholder: { fontSize: 15 },
    readOnly: { justifyContent: 'center' },
    readOnlyTxt: { fontSize: 15 },

    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, marginTop: 8 },
    saveBtnDisabled: { },
    saveBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

    modalWrap: { flex: 1 },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15 },
    cityItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
    cityItemSel: { },
    cityItemTxt: { fontSize: 15 },
    cityItemSelTxt: { fontWeight: '700' },
    noResults: { padding: 40, alignItems: 'center' },
    noResultsTxt: { fontSize: 14 },
});