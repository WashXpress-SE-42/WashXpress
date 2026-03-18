// app/pre-existing-damage-section.tsx
// A reusable component — import this into your washer booking details screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

const Colors = {
  secondary: '#1E96FC',
  background: '#0d1629',
  surface: '#1e2d4a',
  muted: '#D5C6E0',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#D5C6E0',
  warning: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  border: 'rgba(255,255,255,0.07)',
};

const USE_MOCK_API = false;
const API_BASE_URL = process.env.EXPO_PUBLIC_PROVIDER_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8859';

interface Props {
  bookingId?: string;
  existingPhotos?: string[];
  onPhotosUploaded?: (photos: string[]) => void;
}

export default function PreExistingDamageSection({ bookingId: propBookingId, existingPhotos = [], onPhotosUploaded }: Props) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const bId = propBookingId || params.id;
  const bookingId = bId as string;
  
  if (!bId) {
    return (
      <View style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>Error: No Booking ID provided</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.accent }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(existingPhotos.length > 0);

  const getFreshToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken(true);
  };

  const showOptions = () => {
    if (photos.length >= 6) {
      Alert.alert('Limit Reached', 'You can document up to 6 photos.');
      return;
    }
    Alert.alert('Document Damage', 'Add a photo', [
      { text: 'Take Photo Now', onPress: () => pick(true) },
      { text: 'Choose from Library', onPress: () => pick(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pick = async (camera: boolean) => {
    const permFn = camera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Permission Required', `Allow ${camera ? 'camera' : 'photo library'} access.`);
      return;
    }
    const result = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ quality: 0.75 });
    if (!result.canceled && result.assets.length > 0) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
      setSaved(false);
    }
  };

  const removePhoto = (i: number) => {
    if (saved) {
      Alert.alert('Remove?', 'This photo is already saved. Remove it?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: () => { setPhotos(p => p.filter((_, idx) => idx !== i)); setSaved(false); },
        },
      ]);
    } else {
      setPhotos(p => p.filter((_, idx) => idx !== i));
    }
  };

  const handleSave = async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Add at least one photo before saving.');
      return;
    }
    setUploading(true);
    try {
      if (USE_MOCK_API) {
        await new Promise(r => setTimeout(r, 1200));
        setSaved(true);
        onPhotosUploaded?.(photos);
        Alert.alert(
          'Saved ✓',
          'Damage documented. These photos will protect you if the customer files a damage complaint.'
        );
        return;
      }

      const token = await getFreshToken();
      const formData = new FormData();
      formData.append('bookingId', bookingId);
      photos.forEach((uri, i) => {
        formData.append('damagePhotos', { uri, type: 'image/jpeg', name: `damage_${i}.jpg` } as any);
      });

      const res = await fetch(`${API_BASE_URL}/api/washer/bookings/${bookingId}/pre-damage`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        onPhotosUploaded?.(data.data.photoUrls || photos);
        Alert.alert('Saved ✓', 'Pre-existing damage documented. You are now protected against false damage claims.');
      } else {
        Alert.alert('Error', data.message || 'Failed to save photos.');
      }
    } catch (e) {
      console.error('uploadPreExistingDamage:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Standalone Header */}
      {!propBookingId && (
        <View style={[styles.standaloneHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vehicle Damage</Text>
          <View style={{ width: 40 }} /> 
        </View>
      )}

      <View style={[styles.container, { margin: propBookingId ? 0 : 16, backgroundColor: colors.cardBackground, borderColor: isDark ? 'rgba(245,158,11,0.28)' : 'rgba(245,158,11,0.15)' }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(245,158,11,0.13)' : 'rgba(245,158,11,0.08)' }]}>
          <Ionicons name="camera-outline" size={19} color={colors.warning || Colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Document Pre-Existing Damage</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Photograph damage visible before you start</Text>
        </View>
        {saved && (
          <View style={[styles.savedBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.13)' : 'rgba(16,185,129,0.08)' }]}>
            <Ionicons name="checkmark-circle" size={15} color={colors.success || Colors.success} />
            <Text style={[styles.savedBadgeText, { color: colors.success || Colors.success }]}>Saved</Text>
          </View>
        )}
      </View>

      {/* Why this matters */}
      <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.04)', borderColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' }]}>
        <Ionicons name="shield-outline" size={15} color={colors.warning || Colors.warning} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          If the customer files a damage complaint, these photos are shown to the admin as evidence
          that the damage existed before your service. Take clear shots of any scratches, dents,
          dirt, or existing marks.
        </Text>
      </View>

      {/* Photo grid */}
      <View style={styles.photoGrid}>
        {photos.map((uri, i) => (
          <View key={i} style={styles.photoWrap}>
            <Image source={{ uri }} style={styles.photoThumb} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(i)}>
              <Ionicons name="close-circle" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 6 && (
          <TouchableOpacity style={[styles.addBtn, { borderColor: isDark ? 'rgba(245,158,11,0.45)' : 'rgba(245,158,11,0.35)', backgroundColor: isDark ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.02)' }]} onPress={showOptions}>
            <Ionicons name="add" size={22} color={colors.warning || Colors.warning} />
            <Text style={[styles.addBtnText, { color: colors.warning || Colors.warning }]}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Save button */}
      {photos.length > 0 && !saved && (
        <TouchableOpacity
          style={[styles.saveBtn, uploading && { opacity: 0.6 }, { backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)', borderColor: isDark ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.25)' }]}
          onPress={handleSave}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={17} color={colors.textPrimary} />
              <Text style={[styles.saveBtnText, { color: colors.textPrimary }]}>
                Save {photos.length} Photo{photos.length > 1 ? 's' : ''} — Protect Yourself
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {saved && (
        <View style={styles.savedConfirm}>
          <Ionicons name="checkmark-circle-outline" size={17} color={colors.success || Colors.success} />
          <Text style={[styles.savedConfirmText, { color: colors.success || Colors.success }]}>
            {photos.length} photo{photos.length > 1 ? 's' : ''} saved — you're protected
          </Text>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  standaloneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.13)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.13)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  savedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.success },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 78, height: 78, borderRadius: 10 },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(13,22,41,0.85)',
    borderRadius: 10,
  },
  addBtn: {
    width: 78,
    height: 78,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.45)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(245,158,11,0.05)',
  },
  addBtnText: { fontSize: 10, color: Colors.warning, fontWeight: '700' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  savedConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  savedConfirmText: { fontSize: 13, color: Colors.success, fontWeight: '500' },
});
