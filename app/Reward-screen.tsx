import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView
} from 'react-native';
import { Header } from '../components/Header';

export default function RewardsScreen() {

  const userPoints = 700;
  const goldLevel = 1000;

  const pointsRemaining = goldLevel - userPoints;
  const progress = (userPoints / goldLevel) * 100;

  return (
    <View style={styles.container}>

      <Header title="Star Rewards" />

      <ScrollView contentContainerStyle={styles.content}>

        {/* Illustration */}
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
          }}
          style={styles.image}
        />

        {/* Points Text */}
        <Text style={styles.pointsText}>
          {pointsRemaining} points more to Gold
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` }
            ]}
          />
        </View>

        {/* Tier Levels */}
        <View style={styles.tiers}>

          <Text style={styles.tier}>Silver</Text>

          <Text style={styles.divider}>|</Text>

          <Text style={styles.tierActive}>Gold</Text>

          <Text style={styles.divider}>|</Text>

          <Text style={styles.tier}>Platinum</Text>

          <Text style={styles.divider}>|</Text>

          <Text style={styles.tier}>Diamond</Text>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },

  content: {
    alignItems: 'center',
    padding: 20
  },

  image: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
    marginTop: 20,
    marginBottom: 30
  },

  pointsText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 10
  },

  progressBar: {
    width: '90%',
    height: 18,
    backgroundColor: '#e6deb0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#facc15'
  },

  tiers: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },

  tier: {
    fontSize: 14,
    color: '#64748b',
    marginHorizontal: 6
  },

  tierActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000'
  },

  divider: {
    fontSize: 14,
    color: '#94a3b8'
  }

});