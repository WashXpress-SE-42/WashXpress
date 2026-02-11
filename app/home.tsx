import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#2563eb', '#1d4ed8', '#1e3a8a']}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="water" size={40} color="#fff" />
              <Text style={styles.title}>WashXpress</Text>
            </View>
            <Text style={styles.subtitle}>Premium Car Care On Demand</Text>
          </View>

          {/* Hero Image Placeholder */}
          <View style={styles.heroContainer}>
            <View style={styles.heroCard}>
              <Ionicons name="sparkles" size={64} color="#fff" style={styles.heroIcon} />
              <Text style={styles.heroText}>Your car's best friend</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why WashXpress?</Text>
            
            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="flash" size={24} color="#fff" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Quick & Easy</Text>
                <Text style={styles.featureDescription}>
                  Book in seconds, washed in minutes
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="calendar" size={24} color="#fff" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Flexible Plans</Text>
                <Text style={styles.featureDescription}>
                  Choose what fits your lifestyle
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Professional Care</Text>
                <Text style={styles.featureDescription}>
                  Trained experts you can trust
                </Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>50K+</Text>
                <Text style={styles.statLabel}>Happy Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>4.9</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>100K+</Text>
                <Text style={styles.statLabel}>Washes Done</Text>
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Get Started</Text>
            </TouchableOpacity>
            <Text style={styles.ctaSubtext}>
              No credit card required to explore
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center',
  },
  heroContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  heroCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 24,
    height: 192,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.3)',
  },
  heroIcon: {
    opacity: 0.8,
    marginBottom: 12,
  },
  heroText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 12,
  },
  featureIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#bfdbfe',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaContainer: {
    paddingHorizontal: 24,
  },
  ctaButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ctaSubtext: {
    textAlign: 'center',
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 12,
  },
});