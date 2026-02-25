import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { data: profile, isLoading, error, refetch } = useProfile();

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace('/');
      console.log("✅ Signed out");
    } catch (err) {
      console.error("❌ Sign out error:", err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: {error.message}</Text>
        <Button title="Try Again" onPress={() => refetch()} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>No profile data</Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>
          {profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'No Name'}
        </Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{profile.email}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Phone:</Text>
        <Text style={styles.value}>{profile.phoneNumber}</Text>
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
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#666'
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