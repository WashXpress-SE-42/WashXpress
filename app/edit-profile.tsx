import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';

export default function EditProfileScreen() {
    const { userType } = useAuth();
    const { colors, isDark } = useTheme();
    const { data: profile, isLoading } = useProfile();
    const updateProfileMutation = useUpdateProfile();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [area, setArea] = useState('');
    const [photoURL, setPhotoURL] = useState('');

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (profile) {
            setFirstName(profile.firstName || '');
            setLastName(profile.lastName || '');
            setPhoneNumber(profile.phoneNumber || '');
            setDisplayName(profile.displayName || '');
            setArea(profile.area || '');
            setPhotoURL(profile.photoURL || '');
        }
    }, [profile]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!firstName.trim() && !displayName.trim()) {
            newErrors.name = 'First Name or Display Name is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;

        const finalDisplayName = displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();

        const updateData: any = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber.trim(),
            displayName: finalDisplayName,
            photoURL: photoURL.trim(),
        };

        if (userType === 'provider') {
            updateData.area = area.trim();
        }

        updateProfileMutation.mutate(
            updateData,
            {
                onSuccess: () => {
                    Alert.alert('Success', 'Profile updated successfully', [
                        { text: 'OK', onPress: () => router.back() }
                    ]);
                },
                onError: (err) => {
                    Alert.alert('Error', err.message || 'Failed to update profile. Please try again.');
                }
            }
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Header title="Edit Profile" theme={isDark ? 'dark' : 'light'} />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Display Name</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="How should we call you?"
                        placeholderTextColor={colors.inputPlaceholder}
                    />
                </View>
                
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Profile Picture URL</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                        value={photoURL}
                        onChangeText={setPhotoURL}
                        placeholder="https://example.com/photo.jpg"
                        placeholderTextColor={colors.inputPlaceholder}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>First Name</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="First Name"
                        placeholderTextColor={colors.inputPlaceholder}
                    />
                    {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Last Name</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Last Name"
                        placeholderTextColor={colors.inputPlaceholder}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Phone Number</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="e.g. +1 234 567 8900"
                        placeholderTextColor={colors.inputPlaceholder}
                        keyboardType="phone-pad"
                    />
                </View>

                {userType === 'provider' && (
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Service Area</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                            value={area}
                            onChangeText={setArea}
                            placeholder="e.g. Colombo, Pelawatta"
                            placeholderTextColor={colors.inputPlaceholder}
                        />
                    </View>
                )}

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Email (Read-only)</Text>
                    <TextInput
                        style={[styles.input, styles.readOnlyInput, { backgroundColor: colors.background, color: colors.textSecondary, borderColor: colors.border }]}
                        value={profile?.email || ''}
                        editable={false}
                    />
                </View>

            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.accent }, updateProfileMutation.isPending && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={updateProfileMutation.isPending}
                >
                    {updateProfileMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    readOnlyInput: {
        opacity: 0.7,
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
    },
    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 108 : 88,
        borderTopWidth: 1,
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
