// app/complaint-status.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';

const Colors = {
  primary: '#072AC8',
  secondary: '#1E96FC',
  background: '#1D201F',
  surface: '#252828',
  card: '#1a2235',
  muted: '#D5C6E0',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#D5C6E0',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  border: 'rgba(255,255,255,0.07)',
};

type StatusKey =
  | 'submitted'
  | 'under_review'
  | 'washer_responded'
  | 'resolved_refund'
  | 'resolved_penalty'
  | 'resolved_no_action'
  | 'dismissed';

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; icon: string; description: string }> = {
  submitted: {
    label: 'Submitted',
    color: Colors.secondary,
    icon: 'time-outline',
    description: 'Your complaint has been received and is awaiting admin review.',
  },
  under_review: {
    label: 'Under Review',
    color: Colors.warning,
    icon: 'search-outline',
    description: 'Our admin team is reviewing your complaint and has contacted the washer.',
  },
  washer_responded: {
    label: 'Washer Responded',
    color: '#A855F7',
    icon: 'chatbubbles-outline',
    description: 'The washer has provided their account. Admin is making a final decision.',
  },
  resolved_refund: {
    label: 'Refund Approved',
    color: Colors.success,
    icon: 'checkmark-circle-outline',
    description: 'Your refund has been approved and will be processed within 3–5 business days.',
  },
  resolved_penalty: {
    label: 'Resolved',
    color: Colors.success,
    icon: 'shield-checkmark-outline',
    description: 'Your complaint has been resolved. A penalty has been issued to the washer.',
  },
  resolved_no_action: {
    label: 'Closed – Insufficient Evidence',
    color: Colors.muted,
    icon: 'close-circle-outline',
    description: 'After review, insufficient evidence was found to take action on this complaint.',
  },
  dismissed: {
    label: 'Dismissed',
    color: Colors.muted,
    icon: 'remove-circle-outline',
    description: 'This complaint has been dismissed.',
  },
};

const DEFAULT_TIMELINE = [
  { event: 'Complaint submitted', done: true },
  { event: 'Admin review started', done: false },
  { event: 'Washer contacted for response', done: false },
  { event: 'Decision issued', done: false },
];

const USE_MOCK_API = false;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8859';

const MOCK_DATA = {
  id: 'cmp_001',
  status: 'under_review' as StatusKey,
  reason: 'poor_quality',
  description: 'The washer left soap residue on the windows and did not clean the wheels properly despite the premium package.',
  requestRefund: true,
  refundAmount: 2500,
  currency: 'LKR',
  evidencePhotos: [] as string[],
  adminNote: '',
  submittedAt: new Date().toISOString(),
  timeline: [
    { event: 'Complaint submitted', time: new Date().toISOString(), done: true },
    { event: 'Admin review started', time: new Date().toISOString(), done: true },
    { event: 'Washer contacted for response', time: null, done: false },
    { event: 'Decision issued', time: null, done: false },
  ],
  booking: {
    service: { name: 'Premium Wash' },
    vehicle: { make: 'Toyota', model: 'Camry' },
    provider: { displayName: 'Alex W.' },
  },
};

export default function ComplaintStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadComplaint(); }, [id]);

  const getFreshToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken(true);
  };

  const loadComplaint = async () => {
    if (USE_MOCK_API) {
      setComplaint(MOCK_DATA);
      setLoading(false);
      return;
    }
    try {
      const token = await getFreshToken();
      const res = await fetch(`${API_BASE_URL}/api/customer/complaints/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setComplaint(data.data.complaint);
    } catch (e) {
      console.error('loadComplaint:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const reasonLabel = (r: string) =>
    r?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }
  if (!complaint) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.muted} />
        <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Complaint not found.</Text>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[complaint.status as StatusKey] || STATUS_CONFIG.submitted;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complaint Status</Text>
        <TouchableOpacity onPress={loadComplaint}>
          <Ionicons name="refresh-outline" size={22} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status Hero */}
        <View style={[styles.statusHero, { borderColor: cfg.color + '35' }]}>
          <View style={[styles.statusIconCircle, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon as any} size={30} color={cfg.color} />
          </View>
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.statusDesc}>{cfg.description}</Text>
        </View>

        {/* Admin Note */}
        {!!complaint.adminNote && (
          <View style={styles.adminNote}>
            <View style={styles.adminNoteHeader}>
              <Ionicons name="shield-outline" size={15} color={Colors.warning} />
              <Text style={styles.adminNoteTitle}>Message from Admin</Text>
            </View>
            <Text style={styles.adminNoteText}>{complaint.adminNote}</Text>
          </View>
        )}

        {/* Refund Status */}
        {complaint.requestRefund && (
          <View style={styles.refundCard}>
            <View style={styles.refundRow}>
              <Ionicons name="wallet-outline" size={18} color={Colors.warning} />
              <Text style={styles.refundCardTitle}>Refund Requested</Text>
            </View>
            <Text style={styles.refundAmount}>
              {complaint.currency} {complaint.refundAmount?.toLocaleString()}
            </Text>
            <Text style={styles.refundStatus}>
              {complaint.status === 'resolved_refund'
                ? '✓ Approved — processing within 3–5 business days'
                : 'Pending admin decision'}
            </Text>
          </View>
        )}

        {/* Booking reference */}
        {complaint.booking && (
          <View style={styles.bookingRef}>
            <Ionicons name="car-outline" size={15} color={Colors.secondary} />
            <Text style={styles.bookingRefText}>
              {complaint.booking.service?.name} •{' '}
              {complaint.booking.vehicle?.make} {complaint.booking.vehicle?.model}
            </Text>
          </View>
        )}

        {/* Timeline */}
        <Text style={styles.sectionTitle}>Progress</Text>
        <View style={styles.timeline}>
          {(complaint.timeline || DEFAULT_TIMELINE).map((item: any, i: number, arr: any[]) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.dotCol}>
                <View style={[styles.dot, item.done ? styles.dotDone : styles.dotPending]}>
                  {item.done && <Ionicons name="checkmark" size={10} color={Colors.white} />}
                </View>
                {i < arr.length - 1 && (
                  <View style={[styles.line, item.done ? styles.lineDone : styles.linePending]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineEvent, !item.done && styles.timelineEventDim]}>
                  {item.event}
                </Text>
                {item.time && <Text style={styles.timelineTime}>{fmt(item.time)}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Your Complaint Details */}
        <Text style={styles.sectionTitle}>Your Complaint</Text>
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reason</Text>
            <Text style={styles.detailValue}>{reasonLabel(complaint.reason)}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Submitted</Text>
            <Text style={styles.detailValue}>{fmt(complaint.submittedAt)}</Text>
          </View>
          <Text style={styles.descLabel}>Your Description</Text>
          <Text style={styles.descText}>{complaint.description}</Text>
        </View>

        {/* Evidence Photos */}
        {complaint.evidencePhotos?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your Evidence Photos</Text>
            <View style={styles.photoRow}>
              {complaint.evidencePhotos.map((url: string, i: number) => (
                <Image key={i} source={{ uri: url }} style={styles.photoThumb} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },

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

  // Status hero
  statusHero: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  statusDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Admin note
  adminNote: {
    backgroundColor: 'rgba(245,158,11,0.09)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.28)',
  },
  adminNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  adminNoteTitle: { fontSize: 13, fontWeight: '700', color: Colors.warning },
  adminNoteText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

  // Refund
  refundCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
  },
  refundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  refundCardTitle: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  refundAmount: { fontSize: 22, fontWeight: '800', color: Colors.warning, marginBottom: 4 },
  refundStatus: { fontSize: 12, color: Colors.textSecondary },

  // Booking ref
  bookingRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  bookingRefText: { fontSize: 13, color: Colors.secondary },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
  },

  // Timeline
  timeline: { marginBottom: 28 },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  dotCol: { alignItems: 'center', marginRight: 14, width: 20 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDone: { backgroundColor: Colors.success },
  dotPending: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  line: { width: 2, flex: 1, minHeight: 24, marginVertical: 4 },
  lineDone: { backgroundColor: Colors.success + '55' },
  linePending: { backgroundColor: 'rgba(255,255,255,0.08)' },
  timelineContent: { flex: 1, paddingBottom: 22 },
  timelineEvent: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  timelineEventDim: { color: Colors.muted },
  timelineTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },

  // Details card
  detailCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: { fontSize: 13, color: Colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  descLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 14, marginBottom: 6 },
  descText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21 },

  // Photos
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  photoThumb: { width: 88, height: 88, borderRadius: 12 },
});
