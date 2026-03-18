// app/file-complaint.tsx
// Customer files a complaint about a completed or cancelled booking
// Supports photo evidence upload to Firebase Storage

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, KeyboardAvoidingView,
    Platform, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '@/services/apiClient';
import { useTheme } from '../context/ThemeContext';
import { pickImages, takePhoto, uploadImages, StoragePaths } from '@/utils/storage';
import { db } from '@/firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type ComplaintCategory =
    | 'no_show'
    | 'poor_quality'
    | 'damage'
    | 'rude_behaviour'
    | 'overcharged'
    | 'safety'
    | 'other';

const CATEGORIES: { value: ComplaintCategory; label: string; icon: string }[] = [
    { value: 'no_show',       label: 'Washer no-show',     icon: '🚫' },
    { value: 'poor_quality',  label: 'Poor quality',        icon: '😞' },
    { value: 'damage',        label: 'Vehicle damage',      icon: '🚗' },
    { value: 'rude_behaviour',label: 'Rude behaviour',      icon: '😠' },
    { value: 'overcharged',   label: 'Overcharged',         icon: '💰' },
    { value: 'safety',        label: 'Safety concern',      icon: '⚠️' },
    { value: 'other',         label: 'Other',               icon: '📋' },
];

const PRIORITY_MAP: Record<ComplaintCategory, string> = {
    damage:        'critical',
    safety:        'critical',
    no_show:       'high',
    overcharged:   'high',
    poor_quality:  'medium',
    rude_behaviour:'medium',
    other:         'low',
};

export default function FileComplaintScreen() {
    const { colors, isDark } = useTheme();
    const { bookingId, washerName } = useLocalSearchParams<{ bookingId: string; washerName?: string }>();

    const [booking, setBooking] = useState<any>(null);
    const [category, setCategory] = useState<ComplaintCategory | null>(null);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (bookingId) loadBooking();
    }, [bookingId]);

    const loadBooking = async () => {
        try {
            const res = await apiFetch(`/bookings/${bookingId}`, {}, 'customer');
            if (res.success) setBooking(res.data?.booking ?? res.booking);
        } catch { /* non-fatal */ }
    };

    const handlePickPhotos = async () => {
        try {
            const uris = await pickImages(5 - evidencePhotos.length);
            if (uris.length > 0) await uploadEvidence(uris);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleTakePhoto = async () => {
        try {
            const uri = await takePhoto();
            if (uri) await uploadEvidence([uri]);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const uploadEvidence = async (uris: string[]) => {
        setUploading(true);
        try {
            // Temp complaint ID for storage path — will be replaced on submit
            const tempId = `temp_${Date.now()}`;
            const urls = await uploadImages(
                uris,
                StoragePaths.complaintEvidence(tempId),
                (done, total) => setUploadProgress(`Uploading ${done}/${total}...`)
            );
            setEvidencePhotos(prev => [...prev, ...urls]);
        } catch (e: any) {
            Alert.alert('Upload Failed', e.message);
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    const removePhoto = (url: string) => {
        setEvidencePhotos(prev => prev.filter(p => p !== url));
    };

    const handleSubmit = async () => {
        if (!category) { Alert.alert('Required', 'Please select a complaint category.'); return; }
        if (!subject.trim()) { Alert.alert('Required', 'Please enter a subject.'); return; }
        if (description.trim().length < 20) { Alert.alert('Required', 'Please provide more detail (at least 20 characters).'); return; }

        setSubmitting(true);
        try {
            // Build complaint document
            const complaintData = {
                type: 'customer',
                status: 'open',
                priority: PRIORITY_MAP[category] || 'low',
                category,
                subject: subject.trim(),
                description: description.trim(),
                reportedBy: booking?.customerId || 'unknown',
                reportedByName: booking?.customerName || null,
                reportedAgainst: booking?.providerId || booking?.assignedStaffId || null,
                reportedAgainstName: booking?.assignedStaffName || washerName || null,
                bookingId: bookingId || null,
                evidencePhotos,
                adminNotes: '',
                resolvedBy: null,
                resolvedAt: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'complaints'), complaintData);

            Alert.alert(
                'Complaint Submitted ✅',
                'Your complaint has been received. Our team will review it within 24 hours.',
                [{ text: 'Done', onPress: () => router.back() }]
            );
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to submit complaint');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>File a Complaint</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Booking context */}
                    {booking && (
                        <View style={[s.contextCard, { backgroundColor: colors.cardBackground }]}>
                            <Ionicons name="receipt-outline" size={16} color={colors.textSecondary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[s.contextTitle, { color: colors.textPrimary }]}>{booking.service?.name}</Text>
                                <Text style={[s.contextSub, { color: colors.textSecondary }]}>
                                    {booking.scheduledDate} · {booking.assignedStaffName || washerName || 'Washer'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Category */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                            What happened? <Text style={s.required}>*</Text>
                        </Text>
                        <View style={s.categoryGrid}>
                            {CATEGORIES.map(c => {
                                const sel = category === c.value;
                                return (
                                    <TouchableOpacity
                                        key={c.value}
                                        style={[
                                            s.categoryChip,
                                            { backgroundColor: colors.cardBackground, borderColor: colors.divider },
                                            sel && { backgroundColor: colors.accent, borderColor: colors.accent },
                                            c.value === 'damage' && !sel && { borderColor: '#ef4444' },
                                            c.value === 'safety' && !sel && { borderColor: '#ef4444' },
                                        ]}
                                        onPress={() => {
                                            setCategory(c.value);
                                            if (!subject) setSubject(c.label);
                                        }}
                                    >
                                        <Text style={s.categoryIcon}>{c.icon}</Text>
                                        <Text style={[
                                            s.categoryLabel,
                                            { color: colors.textPrimary },
                                            sel && { color: '#fff' },
                                        ]}>{c.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Critical warning */}
                        {(category === 'damage' || category === 'safety') && (
                            <View style={s.criticalBanner}>
                                <Ionicons name="warning" size={16} color="#ef4444" />
                                <Text style={s.criticalTxt}>
                                    {category === 'damage'
                                        ? 'Vehicle damage claims — please upload clear photos of the damage as evidence.'
                                        : 'Safety concerns are treated as critical priority and reviewed immediately.'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Subject */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                            Subject <Text style={s.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                            placeholder="Brief summary of the issue"
                            placeholderTextColor={colors.textSecondary}
                            value={subject}
                            onChangeText={setSubject}
                            maxLength={100}
                        />
                    </View>

                    {/* Description */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                            Description <Text style={s.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[s.input, s.textArea, { backgroundColor: colors.cardBackground, borderColor: colors.divider, color: colors.textPrimary }]}
                            placeholder="Describe what happened in detail. Include time, what was said or done, and how it affected you."
                            placeholderTextColor={colors.textSecondary}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            maxLength={1000}
                        />
                        <Text style={[s.charCount, { color: colors.textSecondary }]}>
                            {description.length}/1000 {description.length < 20 && description.length > 0 && '(min 20 chars)'}
                        </Text>
                    </View>

                    {/* Evidence photos */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                            Evidence Photos <Text style={[s.optional, { color: colors.textSecondary }]}>(recommended)</Text>
                        </Text>
                        <Text style={[s.sectionSub, { color: colors.textSecondary }]}>
                            Upload photos of damage, screenshots of messages, or any relevant evidence.
                        </Text>

                        {/* Photo preview */}
                        {evidencePhotos.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoScroll}>
                                {evidencePhotos.map((url, i) => (
                                    <View key={i} style={s.photoWrap}>
                                        <Image source={{ uri: url }} style={s.photo} />
                                        <TouchableOpacity style={s.removePhotoBtn} onPress={() => removePhoto(url)}>
                                            <Ionicons name="close-circle" size={22} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {/* Upload progress */}
                        {uploading && (
                            <View style={[s.progressRow, { backgroundColor: isDark ? 'rgba(12,166,232,0.1)' : '#e0f4fd' }]}>
                                <ActivityIndicator size="small" color={colors.accent} />
                                <Text style={[s.progressTxt, { color: colors.accent }]}>{uploadProgress || 'Uploading...'}</Text>
                            </View>
                        )}

                        {/* Upload buttons */}
                        {evidencePhotos.length < 5 && !uploading && (
                            <View style={s.uploadBtnRow}>
                                <TouchableOpacity
                                    style={[s.uploadBtn, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}
                                    onPress={handleTakePhoto}
                                >
                                    <Ionicons name="camera-outline" size={18} color={colors.accent} />
                                    <Text style={[s.uploadBtnTxt, { color: colors.accent }]}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.uploadBtn, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}
                                    onPress={handlePickPhotos}
                                >
                                    <Ionicons name="images-outline" size={18} color={colors.accent} />
                                    <Text style={[s.uploadBtnTxt, { color: colors.accent }]}>Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <Text style={[s.hint, { color: colors.textSecondary }]}>Max 5 photos</Text>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[s.submitBtn, { backgroundColor: colors.accent }, (submitting || !category) && s.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting || !category}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="send-outline" size={20} color="#fff" />
                                <Text style={s.submitBtnTxt}>Submit Complaint</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={[s.disclaimer, { color: colors.textSecondary }]}>
                        Your complaint will be reviewed by our admin team within 24 hours. False complaints may result in account suspension.
                    </Text>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scroll: { padding: 20 },

    contextCard: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 14,
        padding: 14, marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    contextTitle: { fontSize: 14, fontWeight: '700' },
    contextSub: { fontSize: 12, marginTop: 2 },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
    sectionSub: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
    required: { color: '#ef4444' },
    optional: { fontSize: 13, fontWeight: '400' },

    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 10,
        borderRadius: 12, borderWidth: 1.5,
    },
    categoryIcon: { fontSize: 16 },
    categoryLabel: { fontSize: 13, fontWeight: '600' },

    criticalBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#fef2f2', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: '#fecaca', marginTop: 10,
    },
    criticalTxt: { flex: 1, fontSize: 13, color: '#ef4444', lineHeight: 18 },

    input: {
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
        paddingVertical: 13, fontSize: 15,
    },
    textArea: { minHeight: 120, lineHeight: 22 },
    charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },

    photoScroll: { marginBottom: 12 },
    photoWrap: { position: 'relative', marginRight: 10 },
    photo: { width: 100, height: 100, borderRadius: 12 },
    removePhotoBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 11 },

    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 10 },
    progressTxt: { fontSize: 13, fontWeight: '600' },

    uploadBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
    uploadBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    },
    uploadBtnTxt: { fontSize: 13, fontWeight: '700' },
    hint: { fontSize: 11, textAlign: 'center' },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, borderRadius: 16, paddingVertical: 18, marginBottom: 14,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

    disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});