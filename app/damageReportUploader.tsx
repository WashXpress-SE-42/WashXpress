// components/DamageReportUploader.tsx
// Washer uploads pre-existing damage photos before starting the job
// These are stored in Firebase Storage and linked to the booking in Firestore

import React, { useState } from 'react';
import {
    ActivityIndicator, Alert, Image, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImages, pickImages, takePhoto, StoragePaths } from '@/utils/storage';

interface Props {
    bookingId: string;
    existingPhotos?: string[];
    onSaved: (photos: string[]) => void;
    colors: any;
    isDark: boolean;
}

export default function DamageReportUploader({
    bookingId, existingPhotos = [], onSaved, colors, isDark,
}: Props) {
    const [photos, setPhotos] = useState<string[]>(existingPhotos);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [saved, setSaved] = useState(existingPhotos.length > 0);

    const handlePickFromLibrary = async () => {
        try {
            const uris = await pickImages(5 - photos.length);
            if (uris.length > 0) await uploadAndSave(uris);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleTakePhoto = async () => {
        try {
            const uri = await takePhoto();
            if (uri) await uploadAndSave([uri]);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const uploadAndSave = async (newUris: string[]) => {
        setUploading(true);
        setUploadProgress('Uploading photos...');
        try {
            const urls = await uploadImages(
                newUris,
                StoragePaths.damageReport(bookingId),
                (done, total) => setUploadProgress(`Uploading ${done}/${total}...`)
            );

            const allPhotos = [...photos, ...urls];
            setPhotos(allPhotos);

            // Save to Firestore on the booking document
            setUploadProgress('Saving to booking...');
            await updateDoc(doc(db, 'bookings', bookingId), {
                damageReportPhotos: allPhotos,
                damageReportUploadedAt: serverTimestamp(),
                damageReportNote: 'Pre-existing damage documented by washer before service',
            });

            setSaved(true);
            onSaved(allPhotos);
            setUploadProgress('');
        } catch (e: any) {
            Alert.alert('Upload Failed', e.message || 'Failed to upload photos');
            setUploadProgress('');
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (url: string) => {
        Alert.alert(
            'Remove Photo',
            'Remove this damage photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const updated = photos.filter(p => p !== url);
                        setPhotos(updated);
                        await updateDoc(doc(db, 'bookings', bookingId), {
                            damageReportPhotos: updated,
                        });
                        if (updated.length === 0) setSaved(false);
                        onSaved(updated);
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
            {/* Header */}
            <View style={styles.titleRow}>
                <Ionicons name="camera" size={18} color={colors.warning || '#f59e0b'} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>Pre-Job Damage Report</Text>
                {saved && photos.length > 0 && (
                    <View style={styles.savedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                        <Text style={styles.savedTxt}>Saved</Text>
                    </View>
                )}
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Document any pre-existing damage before starting. This protects you from false damage claims.
            </Text>

            {/* Photo grid */}
            {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                    {photos.map((url, i) => (
                        <View key={i} style={styles.photoWrap}>
                            <Image source={{ uri: url }} style={styles.photo} />
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => removePhoto(url)}
                            >
                                <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                            <View style={styles.photoIndex}>
                                <Text style={styles.photoIndexTxt}>{i + 1}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Upload progress */}
            {uploading && (
                <View style={[styles.progressRow, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb' }]}>
                    <ActivityIndicator size="small" color={colors.warning || '#f59e0b'} />
                    <Text style={[styles.progressTxt, { color: colors.warning || '#f59e0b' }]}>{uploadProgress}</Text>
                </View>
            )}

            {/* Action buttons */}
            {photos.length < 5 && !uploading && (
                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={[styles.uploadBtn, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb', borderColor: colors.warning || '#f59e0b' }]}
                        onPress={handleTakePhoto}
                    >
                        <Ionicons name="camera-outline" size={18} color={colors.warning || '#f59e0b'} />
                        <Text style={[styles.uploadBtnTxt, { color: colors.warning || '#f59e0b' }]}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.uploadBtn, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb', borderColor: colors.warning || '#f59e0b' }]}
                        onPress={handlePickFromLibrary}
                    >
                        <Ionicons name="images-outline" size={18} color={colors.warning || '#f59e0b'} />
                        <Text style={[styles.uploadBtnTxt, { color: colors.warning || '#f59e0b' }]}>From Gallery</Text>
                    </TouchableOpacity>
                </View>
            )}

            {photos.length === 0 && !uploading && (
                <View style={[styles.emptyBox, { backgroundColor: isDark ? 'rgba(245,158,11,0.05)' : '#fefce8', borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a' }]}>
                    <Ionicons name="warning-outline" size={28} color={colors.warning || '#f59e0b'} />
                    <Text style={[styles.emptyTxt, { color: colors.warning || '#f59e0b' }]}>No damage photos yet</Text>
                    <Text style={[styles.emptySubTxt, { color: colors.textSecondary }]}>Strongly recommended before starting</Text>
                </View>
            )}

            <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Max 5 photos · Photos are timestamped and linked to this booking
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { borderRadius: 18, padding: 18, marginBottom: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    title: { fontSize: 16, fontWeight: '700', flex: 1 },
    savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    savedTxt: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
    subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
    photoScroll: { marginBottom: 12 },
    photoWrap: { position: 'relative', marginRight: 10 },
    photo: { width: 100, height: 100, borderRadius: 12 },
    removeBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 },
    photoIndex: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    photoIndexTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 10 },
    progressTxt: { fontSize: 13, fontWeight: '600' },
    btnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
    uploadBtnTxt: { fontSize: 13, fontWeight: '700' },
    emptyBox: { alignItems: 'center', borderRadius: 12, padding: 20, marginBottom: 10, borderWidth: 1, gap: 4 },
    emptyTxt: { fontSize: 14, fontWeight: '700' },
    emptySubTxt: { fontSize: 12 },
    hint: { fontSize: 11, textAlign: 'center' },
});