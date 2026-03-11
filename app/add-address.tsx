import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
    Platform, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../services/apiClient';

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
        <View style={s.container}>
            <Header isEdit={isEdit} />
            <View style={s.center}><ActivityIndicator size="large" color="#0ca6e8" /></View>
        </View>
    );

    return (
        <View style={s.container}>
            <Header isEdit={isEdit} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Label */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Address Type</Text>
                        <View style={s.labelRow}>
                            {LABELS.map(l => {
                                const sel = label === l;
                                return (
                                    <TouchableOpacity key={l} style={[s.labelChip, sel && s.labelChipSel]} onPress={() => setLabel(l)}>
                                        <Ionicons name={LABEL_ICONS[l] as any} size={16} color={sel ? '#fff' : '#6b7280'} />
                                        <Text style={[s.labelChipTxt, sel && s.labelChipSelTxt]}>{l}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Address Line 1 */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Street Address <Text style={s.required}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. 42 Galle Road"
                            placeholderTextColor="#9ca3af"
                            value={addressLine1}
                            onChangeText={setAddressLine1}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Address Line 2 */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Apartment / Floor <Text style={s.optional}>(optional)</Text></Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. Apt 3B, 2nd Floor"
                            placeholderTextColor="#9ca3af"
                            value={addressLine2}
                            onChangeText={setAddressLine2}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* City */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>City <Text style={s.required}>*</Text></Text>
                        <TouchableOpacity style={[s.input, s.cityPicker]} onPress={() => setCityModal(true)}>
                            <Text style={city ? s.cityPickerSelected : s.cityPickerPlaceholder}>
                                {city || 'Select city...'}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Postal Code */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Postal Code <Text style={s.optional}>(optional)</Text></Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. 10000"
                            placeholderTextColor="#9ca3af"
                            value={postalCode}
                            onChangeText={setPostalCode}
                            keyboardType="numeric"
                            maxLength={6}
                        />
                    </View>

                    {/* Country (read-only) */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Country</Text>
                        <View style={[s.input, s.readOnly]}>
                            <Text style={s.readOnlyTxt}>🇱🇰  Sri Lanka</Text>
                        </View>
                    </View>

                    {/* Save button */}
                    <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
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
                <View style={s.modalWrap}>
                    <View style={s.modalHead}>
                        <Text style={s.modalTitle}>Select City</Text>
                        <TouchableOpacity onPress={() => setCityModal(false)}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    <View style={s.searchWrap}>
                        <Ionicons name="search-outline" size={18} color="#9ca3af" />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search city..."
                            placeholderTextColor="#9ca3af"
                            value={citySearch}
                            onChangeText={setCitySearch}
                            autoFocus
                        />
                        {citySearch.length > 0 && (
                            <TouchableOpacity onPress={() => setCitySearch('')}>
                                <Ionicons name="close-circle" size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                        {filteredCities.map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[s.cityItem, city === c && s.cityItemSel]}
                                onPress={() => { setCity(c); setCityModal(false); setCitySearch(''); }}
                            >
                                <Text style={[s.cityItemTxt, city === c && s.cityItemSelTxt]}>{c}</Text>
                                {city === c && <Ionicons name="checkmark-circle" size={20} color="#0ca6e8" />}
                            </TouchableOpacity>
                        ))}
                        {filteredCities.length === 0 && (
                            <View style={s.noResults}>
                                <Text style={s.noResultsTxt}>No cities found for "{citySearch}"</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

function Header({ isEdit }: { isEdit: boolean }) {
    return (
        <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#0d1629" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{isEdit ? 'Edit Address' : 'Add Address'}</Text>
            <View style={{ width: 40 }} />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    scroll: { padding: 20 },

    fieldWrap: { marginBottom: 20 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    required: { color: '#ef4444' },
    optional: { color: '#9ca3af', fontWeight: '400', fontSize: 12 },

    labelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    labelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },
    labelChipSel: { backgroundColor: '#0ca6e8', borderColor: '#0ca6e8' },
    labelChipTxt: { fontSize: 14, fontWeight: '600', color: '#374151' },
    labelChipSelTxt: { color: '#fff' },

    input: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#0d1629',
    },
    cityPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cityPickerSelected: { fontSize: 15, color: '#0d1629', fontWeight: '500' },
    cityPickerPlaceholder: { fontSize: 15, color: '#9ca3af' },
    readOnly: { backgroundColor: '#f8fafc', justifyContent: 'center' },
    readOnlyTxt: { fontSize: 15, color: '#6b7280' },

    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0ca6e8', borderRadius: 16, paddingVertical: 18, marginTop: 8 },
    saveBtnDisabled: { backgroundColor: '#d1d5db' },
    saveBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

    modalWrap: { flex: 1, backgroundColor: '#f8fafc' },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', margin: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15, color: '#0d1629' },
    cityItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    cityItemSel: { backgroundColor: '#f0faff' },
    cityItemTxt: { fontSize: 15, color: '#374151' },
    cityItemSelTxt: { color: '#0ca6e8', fontWeight: '700' },
    noResults: { padding: 40, alignItems: 'center' },
    noResultsTxt: { fontSize: 14, color: '#9ca3af' },
});