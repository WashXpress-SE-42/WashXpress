import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const JOBS = [
  {
    id: '1',
    name: 'John Smith',
    vehicle: 'Toyota Camry • Silver • ABC1234',
    service: 'Premium Polish',
    address: '123 Main Street, Downtown',
    date: '2026-01-20',
    time: '10:00 AM',
    amount: '$35',
    distance: '2.3 miles',
    priority: 'Priority',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    vehicle: 'Honda CR-V • White • XYZ5678',
    service: 'Basic Shine',
    address: '456 Oak Avenue, North Side',
    date: '2026-01-20',
    time: '2:00 PM',
    amount: '$25',
    distance: '4.1 miles',
    priority: 'Standard',
  },
  {
    id: '3',
    name: 'Michael Brown',
    vehicle: 'BMW X5 • Black • LMN9012',
    service: 'Ultimate Detail',
    address: '789 Elm Road, West End',
    date: '2026-01-21',
    time: '9:00 AM',
    amount: '$50',
    distance: '1.8 miles',
    priority: 'VIP',
  },
  {
    id: '4',
    name: 'Emily Davis',
    vehicle: 'Tesla Model 3 • Blue • QRS3456',
    service: 'One-Time Wash',
    address: '321 Pine Street, East District',
    date: '2026-01-20',
    time: '4:00 PM',
    amount: '$15',
    distance: '3.5 miles',
    priority: 'Standard',
  },
];

function formatDate(dateStr: string) {
  const today = new Date();
  const date = new Date(dateStr);
  const todayStr = today.toDateString();
  const tomorrowStr = new Date(today.getTime() + 86400000).toDateString();
  if (date.toDateString() === todayStr) return 'Today';
  if (date.toDateString() === tomorrowStr) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: any = {
    VIP: { bg: '#f3e8ff', text: '#7c3aed' },
    Priority: { bg: '#dbeafe', text: '#1d4ed8' },
    Standard: { bg: '#f3f4f6', text: '#6b7280' },
  };
  const s = styles[priority] || styles.Standard;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: s.bg }]}>
      <Text style={[badgeStyles.text, { color: s.text }]}>{priority}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginLeft: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default function WasherHome() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');

  const handleAcceptJob = (jobId: string) => {
    // TODO: implement accept job logic
    console.log('Accepted job:', jobId);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.providerName}>Indrajith</Text>
            </View>
            <TouchableOpacity style={styles.profileBtn}>
              <Ionicons name="person-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Earnings Card */}
          <TouchableOpacity style={styles.earningsCard} activeOpacity={0.85}>
            <View style={styles.earningsLeft}>
              <View style={styles.earningsLabelRow}>
                <Ionicons name="cash-outline" size={16} color="#16a34a" />
                <Text style={styles.earningsLabel}>  This Month's Earnings</Text>
              </View>
              <Text style={styles.earningsAmount}>$1,245</Text>
              <View style={styles.trendRow}>
                <Ionicons name="trending-up-outline" size={14} color="#16a34a" />
                <Text style={styles.trendText}>  +12% from last month</Text>
              </View>
            </View>
            <View style={styles.earningsRight}>
              <Text style={styles.jobsDoneCount}>28</Text>
              <Text style={styles.jobsDoneLabel}>Jobs Done</Text>
            </View>
            <Text style={styles.earningsTap}>Tap to view detailed statistics →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="star" size={22} color="#f59e0b" />
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={22} color="#3b82f6" />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#16a34a" />
            <Text style={styles.statValue}>28</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* ── Available Jobs ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Jobs</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>4 New</Text>
            </View>
          </View>

          {JOBS.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              {/* Card Header */}
              <View style={styles.jobCardHeader}>
                <View style={styles.jobCardLeft}>
                  <View style={styles.jobNameRow}>
                    <Text style={styles.jobName}>{job.name}</Text>
                    <PriorityBadge priority={job.priority} />
                  </View>
                  <Text style={styles.jobVehicle}>{job.vehicle}</Text>
                </View>
                <View style={styles.jobCardRight}>
                  <Text style={styles.jobAmount}>{job.amount}</Text>
                  <Text style={styles.jobDistance}>{job.distance}</Text>
                </View>
              </View>

              {/* Service Type */}
              <View style={styles.serviceBox}>
                <Ionicons name="car-sport-outline" size={14} color="#2563eb" />
                <Text style={styles.serviceText}>  {job.service}</Text>
              </View>

              {/* Job Details */}
              <View style={styles.jobDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={14} color="#6b7280" />
                  <Text style={styles.detailText}>{job.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                  <Text style={styles.detailText}>{formatDate(job.date)}</Text>
                  <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginLeft: 10 }} />
                  <Text style={styles.detailText}>{job.time}</Text>
                </View>
              </View>

              {/* Accept Button */}
              <TouchableOpacity
                style={styles.acceptBtn}
                activeOpacity={0.8}
                onPress={() => handleAcceptJob(job.id)}
              >
                <Text style={styles.acceptBtnText}>Accept Job</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Pro Tip Card */}
          <View style={styles.proTipCard}>
            <View style={styles.proTipIcon}>
              <Ionicons name="star" size={22} color="#d97706" />
            </View>
            <View style={styles.proTipContent}>
              <Text style={styles.proTipTitle}>Pro Tip</Text>
              <Text style={styles.proTipBody}>
                Jobs with Priority or VIP badges pay 15–30% more! Accept them quickly before they're taken.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Navigation ── */}
      <View style={styles.bottomNav}>
        {[
          { key: 'home', icon: 'home', label: 'Home' },
          { key: 'jobs', icon: 'briefcase-outline', label: 'My Jobs' },
          { key: 'earnings', icon: 'cash-outline', label: 'Earnings' },
          { key: 'shop', icon: 'cart-outline', label: 'Shop' },
          { key: 'profile', icon: 'person-outline', label: 'Profile' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={22}
              color={activeTab === tab.key ? '#16a34a' : '#9ca3af'}
            />
            <Text
              style={[
                styles.navLabel,
                activeTab === tab.key && styles.navLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },

  // Header
  header: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    color: '#dcfce7',
    fontSize: 14,
    marginBottom: 4,
  },
  providerName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsLeft: {
    flex: 1,
  },
  earningsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  earningsRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  jobsDoneCount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#16a34a',
  },
  jobsDoneLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  earningsTap: {
    width: '100%',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    color: '#9ca3af',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  newBadge: {
    marginLeft: 10,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  newBadgeText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '600',
  },

  // Job Card
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jobCardLeft: {
    flex: 1,
  },
  jobNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  jobVehicle: {
    fontSize: 13,
    color: '#6b7280',
  },
  jobCardRight: {
    alignItems: 'flex-end',
  },
  jobAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16a34a',
  },
  jobDistance: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  serviceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  serviceText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  jobDetails: {
    gap: 6,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 6,
  },
  acceptBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Pro Tip Card
  proTipCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  proTipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  proTipContent: {
    flex: 1,
  },
  proTipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  proTipBody: {
    fontSize: 13,
    color: '#b45309',
    lineHeight: 19,
  },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    paddingBottom: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 3,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#16a34a',
    fontWeight: '600',
  },
});