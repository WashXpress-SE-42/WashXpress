import { Ionicons } from '@expo/vector-icons';
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
import { useAuth } from '../context/AuthContext';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';

export default function EditProfileScreen() {
    const { userType } = useAuth();
    const { data: profile, isLoading } = useProfile();
    const updateProfileMutation = useUpdateProfile();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [area, setArea] = useState('');

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (profile) {
            setFirstName(profile.firstName || '');
            setLastName(profile.lastName || '');
            setPhoneNumber(profile.phoneNumber || '');
            setDisplayName(profile.displayName || '');
            setArea(profile.area || '');
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

        // Determine a fallback displayName if not provided
        const finalDisplayName = displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();

        const updateData: any = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber.trim(),
            displayName: finalDisplayName,
        };

        if (userType === 'provider') {
            updateData.area = area.trim();
        }

        console.log("Saving profile data:", updateData);

        updateProfileMutation.mutate(
            updateData,
            {
                onSuccess: () => {
                    console.log("✅ Profile update successful");
                    Alert.alert('Success', 'Profile updated successfully', [
                        {
                            text: 'OK', onPress: () => {
                                console.log("Navigating back to Profile...");
                                router.back();
                            }
                        }
                    ]);
                },
                onError: (err) => {
                    console.error("❌ Profile update error:", err);
                    Alert.alert('Error', err.message || 'Failed to update profile. Please try again.');
                }
            }
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 40 }} /> {/* Placeholder for balance */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Display Name</Text>
                    <TextInput
                        style={styles.input}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="How should we call you?"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="First Name"
                        placeholderTextColor="#999"
                    />
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Last Name"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="e.g. +1 234 567 8900"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                    />
                </View>

                {userType === 'provider' && (
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Service Area</Text>
                        <TextInput
                            style={styles.input}
                            value={area}
                            onChangeText={setArea}
                            placeholder="e.g. Colombo, Pelawatta"
                            placeholderTextColor="#999"
                        />
                    </View>
                )}

                {/* Email is typically read-only or handled separately via Auth providers */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email (Read-only)</Text>
                    <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={profile?.email || ''}
                        editable={false}
                    />
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, updateProfileMutation.isPending && styles.saveButtonDisabled]}
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
        backgroundColor: '#F5F5F5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
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
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#000',
    },
    readOnlyInput: {
        backgroundColor: '#F0F0F0',
        color: '#666',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
    },
    footer: {
        padding: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    saveButton: {
        backgroundColor: '#2563eb',
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
