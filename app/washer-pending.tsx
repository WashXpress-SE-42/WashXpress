import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface CertificationProgress {
  type: 'field_certification' | 'training_center' | 'experience_review';
  // Field certification
  completed?: number;
  required?: number;
  percentage?: number;
  evaluations?: Array<{
    id: string;
    status: 'passed' | 'failed' | 'pending';
    mentorName?: string;
    date?: string;
    notes?: string;
  }>;
  // Training center
  centerName?: string;
  status?: string;
  expectedCompletion?: string;
}

interface ProviderProfile {
  displayName: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  certificationStatus: string;
  certificationPath: string | null;
  washerStatus: string;
  certificationProgress?: CertificationProgress;
}

const STATUS_LABELS: Record<string, string> = {
  pending_certification: 'Under Review',
  in_training: 'In Training',
  certified: 'Certified',
  rejected: 'Not Approved',
  uncertified: 'Pending',
};

const getStatusColors = (colors: any) => ({
  pending_certification: colors.warning || '#f59e0b',
  in_training: colors.info || '#2563eb',
  certified: colors.success || '#16a34a',
  rejected: colors.error || '#dc2626',
  uncertified: colors.textSecondary || '#6b7280',
});

export default function WasherPendingScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDark } = useTheme();

  // Pulse animation for pending indicators
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadProfile();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Poll every 30s — if they get verified, auto-navigate to washer-home
    const interval = setInterval(async () => {
      const updated = await fetchProfile();
      if (updated?.isVerified) {
        clearInterval(interval);
        router.replace('/washer-home');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchProfile = async (): Promise<ProviderProfile | null> => {
    try {
      const data = await apiFetch('/auth/washer/profile', {}, 'provider');
      if (data.success) {
        const p: ProviderProfile = {
          ...data.provider,
          certificationProgress: data.certificationProgress,
        };
        setProfile(p);
        return p;
      }
    } catch (error: any) {
      console.error('Fetch profile error:', error);
      if (error.message === 'Route not found') {
        Alert.alert('Configuration Error', 'The profile endpoint was not found. Please refresh the app or contact support.');
      }
    }
    return null;
  };

  const loadProfile = async () => {
    setLoading(true);
    await fetchProfile();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const updated = await fetchProfile();
    setRefreshing(false);
    if (updated?.isVerified) {
      router.replace('/washer-home');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading your profile...</Text>
      </View>
    );
  }

  const certStatus = profile?.certificationStatus || 'pending_certification';
  const certPath = profile?.certificationPath;
  const progress = profile?.certificationProgress;

  const statusColors = getStatusColors(colors) as Record<string, string>;
  const statusColor = statusColors[certStatus] || colors.textSecondary;
  const statusLabel = STATUS_LABELS[certStatus] || 'Pending';

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={s.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />
      }
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
        <View style={s.headerTop}>
          <View style={[s.logoMark, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}>
            <Ionicons name="water" size={28} color={colors.accent} />
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            <Text style={[s.logoutText, { color: colors.textSecondary }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.headerGreeting, { color: colors.textPrimary }]}>Hi, {profile?.displayName?.split(' ')[0] || 'Washer'} 👋</Text>
        <Text style={[s.headerSubtitle, { color: colors.textSecondary }]}>Your application is being processed</Text>

        {/* Status pill */}
        <View style={[s.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* ── FIELD CERTIFICATION PATH ── */}
      {certPath === 'field_certification' && progress && (
        <>
          {/* Progress Ring Card */}
          <View style={[s.progressCard, { backgroundColor: colors.cardBackground }]}>
            <View style={s.progressCardHeader}>
              <View style={[s.progressIconWrapper, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}>
                <Ionicons name="people" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.progressCardTitle, { color: colors.textPrimary }]}>Field Certification</Text>
                <Text style={[s.progressCardSubtitle, { color: colors.textSecondary }]}>Mentored on-the-job evaluations</Text>
              </View>
            </View>

            {/* Big progress display */}
            <View style={s.bigProgressRow}>
              <View style={[s.bigProgressCircle, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)', borderColor: colors.accent }]}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Text style={[s.bigProgressNumber, { color: colors.accent }]}>{progress.completed ?? 0}</Text>
                </Animated.View>
                <Text style={[s.bigProgressDivider, { color: colors.textSecondary }]}>of {progress.required ?? 6}</Text>
              </View>

              <View style={s.progressMeta}>
                <Text style={[s.progressMetaLabel, { color: colors.textPrimary }]}>Evaluations completed</Text>
                <View style={[s.progressBarTrack, { backgroundColor: colors.divider }]}>
                  <View
                    style={[
                      s.progressBarFill,
                      { width: `${progress.percentage ?? 0}%`, backgroundColor: colors.accent },
                    ]}
                  />
                </View>
                <Text style={[s.progressMetaPercent, { color: colors.textSecondary }]}>{progress.percentage ?? 0}% complete</Text>
              </View>
            </View>

            {/* Steps */}
            <View style={s.stepsContainer}>
              {Array.from({ length: progress.required ?? 6 }).map((_, i) => {
                const evaluation = progress.evaluations?.[i];
                const isDone = i < (progress.completed ?? 0);
                const isCurrent = i === (progress.completed ?? 0);

                return (
                  <View key={i} style={[s.stepRow, { borderBottomColor: colors.divider }]}>
                    <View style={[
                      s.stepCircle,
                      { borderColor: colors.divider },
                      isDone && [s.stepCircleDone, { backgroundColor: colors.success, borderColor: colors.success }],
                      isCurrent && [s.stepCircleCurrent, { borderColor: colors.accent }],
                    ]}>
                      {isDone
                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                        : <Text style={[s.stepNumber, { color: colors.textSecondary }, isCurrent && [s.stepNumberCurrent, { color: colors.accent }]]}>{i + 1}</Text>
                      }
                    </View>

                    <View style={s.stepContent}>
                      <Text style={[s.stepTitle, { color: colors.textPrimary }, isDone && [s.stepTitleDone, { color: colors.textSecondary, textDecorationLine: 'line-through' }]]}>
                        Evaluation {i + 1}
                        {isCurrent && <Text style={[s.stepCurrentBadge, { color: colors.accent }]}> ← Next</Text>}
                      </Text>
                      {evaluation && (
                        <Text style={[s.stepMeta, { color: colors.textSecondary }]}>
                          {evaluation.mentorName && `Mentor: ${evaluation.mentorName}`}
                          {evaluation.date && ` · ${evaluation.date}`}
                        </Text>
                      )}
                      {!evaluation && !isDone && (
                        <Text style={[s.stepMeta, { color: colors.textSecondary }]}>
                          {isCurrent ? 'Awaiting mentor assignment' : 'Upcoming'}
                        </Text>
                      )}
                    </View>

                    {isDone && (
                      <View style={[s.stepPassedBadge, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4' }]}>
                        <Text style={[s.stepPassedText, { color: colors.success || '#16a34a' }]}>Passed</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {(progress.completed ?? 0) === 0 && (
              <View style={[s.infoBox, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)', borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
                <Text style={[s.infoBoxText, { color: colors.accent }]}>
                  A mentor will be assigned to you shortly. They'll accompany you on your first wash jobs and evaluate your technique.
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* ── TRAINING CENTER PATH ── */}
      {certPath === 'training_center' && (
        <View style={[s.progressCard, { backgroundColor: colors.cardBackground }]}>
          <View style={s.progressCardHeader}>
            <View style={[s.progressIconWrapper, { backgroundColor: (colors.accentLight || 'rgba(37,99,235,0.1)') }]}>
              <Ionicons name="school" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.progressCardTitle, { color: colors.textPrimary }]}>Training Center</Text>
              <Text style={[s.progressCardSubtitle, { color: colors.textSecondary }]}>Structured classroom program</Text>
            </View>
          </View>

          {/* Training stages */}
          {[
            {
              icon: 'mail-outline' as const,
              title: 'Application Received',
              desc: 'Your registration has been submitted',
              done: true,
            },
            {
              icon: 'business-outline' as const,
              title: 'Training Center Assignment',
              desc: progress?.centerName
                ? `Assigned to ${progress.centerName}`
                : 'Admin is assigning you to a center',
              done: !!progress?.centerName,
              active: !progress?.centerName,
            },
            {
              icon: 'book-outline' as const,
              title: 'Training Program',
              desc: progress?.expectedCompletion
                ? `Expected completion: ${progress.expectedCompletion}`
                : 'Complete the curriculum and practical sessions',
              done: ['completed', 'certified'].includes(progress?.status ?? ''),
              active: progress?.status === 'in_progress',
            },
            {
              icon: 'ribbon-outline' as const,
              title: 'Final Evaluation',
              desc: 'Pass the certification exam to become verified',
              done: certStatus === 'certified',
            },
          ].map((stage, i) => (
            <View key={i} style={s.trainingStageRow}>
              <View style={[
                s.trainingStageIcon,
                { backgroundColor: colors.divider },
                stage.done && [s.trainingStageIconDone, { backgroundColor: colors.success || '#16a34a' }],
                stage.active && [s.trainingStageIconActive, { backgroundColor: colors.accent }],
              ]}>
                {stage.done
                  ? <Ionicons name="checkmark" size={18} color="#fff" />
                  : <Ionicons name={stage.icon} size={18} color={stage.active ? '#fff' : colors.textSecondary} />
                }
              </View>

              {i < 3 && (
                <View style={[s.trainingConnector, { backgroundColor: colors.divider }, stage.done && [s.trainingConnectorDone, { backgroundColor: colors.success || '#16a34a' }]]} />
              )}

              <View style={s.trainingStageContent}>
                <Text style={[s.trainingStageTitle, { color: colors.textPrimary }, stage.done && [s.trainingStageTitleDone, { color: colors.success || '#16a34a' }]]}>
                  {stage.title}
                </Text>
                <Text style={[s.trainingStageDesc, { color: colors.textSecondary }]}>{stage.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── EXPERIENCE REVIEW PATH ── */}
      {(certPath === null || !certPath) && certStatus === 'pending_certification' && (
        <View style={[s.progressCard, { backgroundColor: colors.cardBackground }]}>
          <View style={s.progressCardHeader}>
            <View style={[s.progressIconWrapper, { backgroundColor: colors.successLight || 'rgba(22,163,74,0.1)' }]}>
              <Ionicons name="briefcase" size={22} color={colors.success || '#16a34a'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.progressCardTitle, { color: colors.textPrimary }]}>Experience Review</Text>
              <Text style={[s.progressCardSubtitle, { color: colors.textSecondary }]}>Admin verification of your background</Text>
            </View>
          </View>

          {[
            { title: 'Application Submitted', desc: 'Your experience details have been received', done: true },
            { title: 'Background Verification', desc: 'Admin is verifying your professional history', done: false, active: true },
            { title: 'Skills Assessment', desc: 'A quick practical evaluation may be scheduled', done: false },
            { title: 'Account Activation', desc: 'Get verified and start accepting jobs', done: false },
          ].map((stage, i) => (
            <View key={i} style={[s.reviewStageRow, i < 3 && { marginBottom: 0 }]}>
              <View style={[
                s.reviewDot,
                { backgroundColor: colors.divider },
                stage.done && [s.reviewDotDone, { backgroundColor: colors.success || '#16a34a' }],
                stage.active && [s.reviewDotActive, { backgroundColor: colors.accent }],
              ]}>
                {stage.done
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : stage.active
                  ? <Animated.View style={[s.reviewDotPulse, { transform: [{ scale: pulseAnim }], backgroundColor: colors.background }]} />
                  : null
                }
              </View>
              <View style={s.reviewStageContent}>
                <Text style={[s.reviewStageTitle, { color: colors.textPrimary }, stage.done && [s.reviewStageTitleDone, { color: colors.success || '#16a34a' }]]}>
                  {stage.title}
                </Text>
                <Text style={[s.reviewStageDesc, { color: colors.textSecondary }]}>{stage.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* What to expect card */}
      <View style={[s.expectCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[s.expectTitle, { color: colors.textPrimary }]}>What happens next?</Text>
        {[
          { icon: 'notifications-outline' as const, text: 'You\'ll receive an email and app notification when your status changes' },
          { icon: 'refresh-outline' as const, text: 'Pull down to refresh this screen and check for updates' },
          { icon: 'help-circle-outline' as const, text: 'Contact support at support@washxpress.lk for any questions' },
        ].map(({ icon, text }, i) => (
          <View key={i} style={s.expectRow}>
            <View style={[s.expectIconWrapper, { backgroundColor: colors.accentLight || 'rgba(37,99,235,0.1)' }]}>
              <Ionicons name={icon} size={18} color={colors.accent} />
            </View>
            <Text style={[s.expectText, { color: colors.textSecondary }]}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Refresh hint */}
      <View style={s.refreshHint}>
        <Ionicons name="sync-outline" size={14} color={colors.textSecondary} />
        <Text style={[s.refreshHintText, { color: colors.textSecondary }]}>Pull down to check for updates · Auto-checks every 30s</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    borderBottomWidth: 1,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoMark: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  logoutText: { fontSize: 14, fontWeight: '500' },
  headerGreeting: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 15, marginBottom: 16 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '700' },

  // Progress card (shared)
  progressCard: {
    marginHorizontal: 20, marginTop: 20,
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  progressCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  progressIconWrapper: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  progressCardTitle: { fontSize: 17, fontWeight: '700' },
  progressCardSubtitle: { fontSize: 13, marginTop: 2 },

  // Field cert — big progress
  bigProgressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 20 },
  bigProgressCircle: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  bigProgressNumber: { fontSize: 30, fontWeight: '900', lineHeight: 36 },
  bigProgressDivider: { fontSize: 13 },
  progressMeta: { flex: 1 },
  progressMetaLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  progressBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressMetaPercent: { fontSize: 13, marginTop: 6 },

  // Field cert — steps
  stepsContainer: { gap: 0 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  stepCircleDone: {},
  stepCircleCurrent: {},
  stepNumber: { fontSize: 13, fontWeight: '700' },
  stepNumberCurrent: {},
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600' },
  stepTitleDone: {},
  stepCurrentBadge: { fontWeight: '700' },
  stepMeta: { fontSize: 12, marginTop: 2 },
  stepPassedBadge: {
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  stepPassedText: { fontSize: 11, fontWeight: '700' },

  // Training center stages
  trainingStageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  trainingStageIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14, flexShrink: 0,
  },
  trainingStageIconDone: {},
  trainingStageIconActive: {},
  trainingConnector: {
    position: 'absolute', left: 19, top: 40,
    width: 2, height: 28,
  },
  trainingConnectorDone: {},
  trainingStageContent: { flex: 1, paddingTop: 4 },
  trainingStageTitle: { fontSize: 15, fontWeight: '600' },
  trainingStageTitleDone: {},
  trainingStageDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },

  // Experience review stages
  reviewStageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  reviewDot: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14, flexShrink: 0,
  },
  reviewDotDone: {},
  reviewDotActive: {},
  reviewDotPulse: { width: 10, height: 10, borderRadius: 5 },
  reviewStageContent: { flex: 1, paddingTop: 2 },
  reviewStageTitle: { fontSize: 14, fontWeight: '600' },
  reviewStageTitleDone: {},
  reviewStageDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },

  // Info box
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, padding: 14,
    borderWidth: 1, marginTop: 16,
  },
  infoBoxText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // What to expect
  expectCard: {
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  expectTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  expectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  expectIconWrapper: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  expectText: { flex: 1, fontSize: 14, lineHeight: 20, paddingTop: 8 },

  // Refresh hint
  refreshHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 20, paddingHorizontal: 24,
  },
  refreshHintText: { fontSize: 12 },
});