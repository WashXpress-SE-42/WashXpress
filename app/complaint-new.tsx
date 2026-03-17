// app/complaint-new.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';

const Colors = {
  primary: '#072AC8',
  secondary: '#1E96FC',
  background: '#1D201F',
  surface: '#252828',
  card: '#1a2235',
  muted: '#D5C6E0',
  light: '#F5E6E8',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#D5C6E0',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  border: 'rgba(255,255,255,0.07)',
};

const COMPLAINT_REASONS = [
  { id: 'poor_quality', label: 'Poor Wash Quality', icon: 'water-outline' as const },
  { id: 'damage', label: 'Vehicle Damage', icon: 'car-outline' as const },
  { id: 'no_show', label: 'Washer No Show', icon: 'person-remove-outline' as const },
  { id: 'late', label: 'Significantly Late', icon: 'time-outline' as const },
  { id: 'unprofessional', label: 'Unprofessional', icon: 'alert-circle-outline' as const },
  { id: 'incomplete', label: 'Incomplete Service', icon: 'checkbox-outline' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' as const },
];

const USE_MOCK_API = false;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8859';

export default function ComplaintNewScreen() {
  const router = useRouter();
  const { bookingId, serviceName, vehicleName, providerName, totalPrice, currency } =
    useLocalSearchParams<{
      bookingId: string;
      serviceName: string;
      vehicleName: string;
      providerName: string;
      totalPrice: string;
      currency: string;
    }>();

  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [requestRefund, setRequestRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const getFreshToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken(true);
  };

  const showPhotoOptions = () => {
    if (evidencePhotos.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 evidence photos.');
      return;
    }
    Alert.alert('Add Evidence Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: () => pickPhoto(true) },
      { text: 'Choose from Library', onPress: () => pickPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickPhoto = async (camera: boolean) => {
    const permFn = camera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Permission Required', `Please allow ${camera ? 'camera' : 'photo library'} access.`);
      return;
    }
    const launchFn = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launchFn({ quality: 0.75 });
    if (!result.canceled && result.assets.length > 0) {
      setEvidencePhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (i: number) =>
    setEvidencePhotos(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a reason for your complaint.');
      return;
    }
    if (description.trim().length < 20) {
      Alert.alert('More Detail Needed', 'Please describe the issue in at least 20 characters.');
      return;
    }
    if (requestRefund && (!refundAmount || isNaN(parseFloat(refundAmount)))) {
      Alert.alert('Invalid Amount', 'Please enter a valid refund amount.');
      return;
    }
    Alert.alert(
      'Submit Complaint',
      'Our team will review this within 24–48 hours and contact both you and the washer.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Submit', onPress: doSubmit }]
    );
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      if (USE_MOCK_API) {
        await new Promise(r => setTimeout(r, 1400));
        Alert.alert(
          'Complaint Submitted ✓',
          'Our admin team will review your complaint and notify you of the outcome.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      const token = await getFreshToken();
      const formData = new FormData();
      formData.append('bookingId', bookingId);
      formData.append('reason', selectedReason);
      formData.append('description', description.trim());
      formData.append('requestRefund', String(requestRefund));
      if (requestRefund && refundAmount) formData.append('refundAmount', refundAmount);
      evidencePhotos.forEach((uri, idx) => {
        formData.append('evidence', { uri, type: 'image/jpeg', name: `evidence_${idx}.jpg` } as any);
      });

      const res = await fetch(`${API_BASE_URL}/api/customer/complaints`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        Alert.alert(
          'Complaint Submitted ✓',
          'Our admin team will review your complaint and notify you within 24–48 hours.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to submit complaint.');
      }
    } catch (err) {
      console.error('submitComplaint:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File a Complaint</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Booking Reference Card */}
        <View style={styles.bookingCard}>
          <View style={styles.bookingIconWrap}>
            <Ionicons name="receipt-outline" size={20} color={Colors.secondary} />
          </View>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingService}>{serviceName || 'Service'}</Text>
            <Text style={styles.bookingMeta}>{vehicleName}</Text>
            <Text style={styles.bookingMeta}>Washer: {providerName}</Text>
          </View>
          <View>
            <Text style={styles.bookingPrice}>
              {currency} {parseFloat(totalPrice || '0').toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Reason */}
        <Text style={styles.sectionLabel}>What went wrong?</Text>
        <View style={styles.reasonGrid}>
          {COMPLAINT_REASONS.map(r => {
            const active = selectedReason === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.reasonChip, active && styles.reasonChipActive]}
                onPress={() => setSelectedReason(r.id)}
              >
                <Ionicons name={r.icon} size={16} color={active ? Colors.white : Colors.secondary} />
                <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.sectionLabel}>Describe the issue</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what happened in detail. The more info you provide, the faster we can resolve this..."
          placeholderTextColor={Colors.muted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>

        {/* Evidence Photos */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Evidence Photos</Text>
          <Text style={styles.sectionCount}>{evidencePhotos.length}/5</Text>
        </View>
        <Text style={styles.sectionHint}>
          Upload photos showing the issue — scratches, dirty spots, incomplete areas, etc.
        </Text>
        <View style={styles.photoRow}>
          {evidencePhotos.map((uri, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                <Ionicons name="close-circle" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          {evidencePhotos.length < 5 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={showPhotoOptions}>
              <Ionicons name="camera-outline" size={26} color={Colors.secondary} />
              <Text style={styles.addPhotoText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Refund Toggle */}
        <View style={styles.refundCard}>
          <TouchableOpacity
            style={styles.refundToggleRow}
            onPress={() => setRequestRefund(v => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.refundLeft}>
              <View style={styles.refundIconWrap}>
                <Ionicons name="wallet-outline" size={20} color={Colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.refundTitle}>Request a Refund</Text>
                <Text style={styles.refundSub}>Ask for a full or partial refund</Text>
              </View>
            </View>
            <View style={[styles.toggle, requestRefund && styles.toggleOn]}>
              <View style={[styles.toggleThumb, requestRefund && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          {requestRefund && (
            <View style={styles.refundAmountWrap}>
              <Text style={styles.refundAmountLabel}>
                Amount ({currency || 'LKR'}) — Max: {parseFloat(totalPrice || '0').toLocaleString()}
              </Text>
              <TextInput
                style={styles.refundInput}
                value={refundAmount}
                onChangeText={setRefundAmount}
                placeholder="Enter amount"
                placeholderTextColor={Colors.muted}
                keyboardType="numeric"
              />
              <Text style={styles.refundNote}>
                Admin reviews and determines the final refund based on your evidence.
              </Text>
            </View>
          )}
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.secondary} />
          <Text style={styles.infoText}>
            After submission, our admin team will review your complaint, contact the washer for
            their side, and notify you of the outcome within 24–48 hours.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color={Colors.white} />
              <Text style={styles.submitText}>Submit Complaint</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 24,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },

  content: { padding: 20 },

  // Booking card
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(30,150,252,0.18)',
  },
  bookingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(30,150,252,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingInfo: { flex: 1 },
  bookingService: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  bookingMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  bookingPrice: { fontSize: 14, fontWeight: '700', color: Colors.secondary },

  // Sections
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionCount: { fontSize: 13, color: Colors.textSecondary },
  sectionHint: { fontSize: 12, color: Colors.muted, marginBottom: 14 },

  // Reasons
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: 'rgba(30,150,252,0.22)',
  },
  reasonChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  reasonChipText: { fontSize: 13, fontWeight: '500', color: Colors.secondary },
  reasonChipTextActive: { color: Colors.white },

  // Text area
  textArea: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
  },
  charCount: { fontSize: 11, color: Colors.muted, textAlign: 'right', marginBottom: 24 },

  // Photos
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 86, height: 86, borderRadius: 12 },
  photoRemove: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: Colors.background,
    borderRadius: 11,
  },
  addPhotoBtn: {
    width: 86,
    height: 86,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(30,150,252,0.4)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30,150,252,0.05)',
  },
  addPhotoText: { fontSize: 11, color: Colors.secondary, fontWeight: '600' },

  // Refund
  refundCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
  },
  refundToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refundLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  refundIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refundTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  refundSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: Colors.warning },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.muted, alignSelf: 'flex-start' },
  toggleThumbOn: { backgroundColor: Colors.white, alignSelf: 'flex-end' },
  refundAmountWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  refundAmountLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  refundInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  refundNote: { fontSize: 11, color: Colors.muted, marginTop: 8, lineHeight: 16 },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(30,150,252,0.07)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(30,150,252,0.18)',
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 19 },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.danger,
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
