import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { getProfile, signOut, CustomerProfile } from '../services/authService';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      console.log("🔍 Fetching profile...");
      const data = await getProfile();
      console.log("✅ Profile received:", JSON.stringify(data, null, 2));
      setProfile(data);
      setError(null);
    } catch (err: any) {
      console.error("❌ Profile error:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/'); // Navigate to login/home
      console.log("✅ Signed out");
    } catch (err) {
      console.error("❌ Sign out error:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: {error}</Text>
        <Button title="Try Again" onPress={loadProfile} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>No profile data</Text>
        <Button title="Retry" onPress={loadProfile} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{profile.firstName} {profile.lastName}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{profile.email}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Phone:</Text>
        <Text style={styles.value}>{profile.phone}</Text>
      </View>
      <Button title="Sign Out" onPress={handleSignOut} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
  },
  error: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
});