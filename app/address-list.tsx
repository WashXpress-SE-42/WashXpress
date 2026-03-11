import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiFetch } from '../services/apiClient';

interface Address {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  country: string;
  isDefault?: boolean;
}

const LABEL_ICONS: Record<string, string> = {
  Home: 'home', Work: 'briefcase', Office: 'business',
  Other: 'location',
};

export default function AddressListScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  const loadAddresses = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiFetch('/addresses', {}, 'customer');
      if (res.success) setAddresses(res.data.addresses || []);
    } catch {
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAddresses(); }, []);
  const onRefresh = () => { setRefreshing(true); loadAddresses(true); };

  const handleSetDefault = async (address: Address) => {
    if (address.isDefault) return;
    try {
      setSettingDefault(address.id);
      await apiFetch(`/addresses/${address.id}/default`, { method: 'PATCH' }, 'customer');
      setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === address.id })));
    } catch {
      Alert.alert('Error', 'Failed to set default address');
    } finally {
      setSettingDefault(null);
    }
  };

  const handleDelete = (address: Address) => {
    if (address.isDefault) {
      Alert.alert('Cannot Delete', 'Set a different default address before deleting this one.');
      return;
    }
    Alert.alert(
      'Remove Address',
      `Remove "${address.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(address.id);
              await apiFetch(`/addresses/${address.id}`, { method: 'DELETE' }, 'customer');
              setAddresses(prev => prev.filter(a => a.id !== address.id));
            } catch {
              Alert.alert('Error', 'Failed to remove address');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  if (loading) return (
    <View style={s.container}>
      <Header />
      <View style={s.center}><ActivityIndicator size="large" color="#0ca6e8" /></View>
    </View>
  );

  return (
    <View style={s.container}>
      <Header />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ca6e8']} />}
      >
        {addresses.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <Ionicons name="location-outline" size={44} color="#9ca3af" />
            </View>
            <Text style={s.emptyTitle}>No addresses yet</Text>
            <Text style={s.emptySubtitle}>Add your home, work, or any location where you'd like your car washed.</Text>
            <TouchableOpacity style={s.emptyAddBtn} onPress={() => router.push('/add-address' as any)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={s.emptyAddBtnTxt}>Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {addresses.map(a => {
              const iconName = LABEL_ICONS[a.label] || 'location';
              return (
                <View key={a.id} style={[s.addressCard, a.isDefault && s.addressCardDefault]}>
                  <View style={s.addressCardLeft}>
                    <View style={[s.addressIconCircle, a.isDefault && s.addressIconCircleDefault]}>
                      <Ionicons name={iconName as any} size={22} color={a.isDefault ? '#fff' : '#6b7280'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.addressTopRow}>
                        <Text style={s.addressLabel}>{a.label}</Text>
                        {a.isDefault && (
                          <View style={s.defaultBadge}>
                            <Ionicons name="star" size={10} color="#0ca6e8" />
                            <Text style={s.defaultBadgeTxt}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.addressLine1}>{a.addressLine1}</Text>
                      {a.addressLine2 && <Text style={s.addressLine2}>{a.addressLine2}</Text>}
                      <Text style={s.addressCity}>{a.city}{a.postalCode ? `, ${a.postalCode}` : ''}</Text>
                    </View>
                  </View>

                  <View style={s.addressActions}>
                    {/* Edit */}
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={() => router.push({ pathname: '/add-address', params: { addressId: a.id, edit: 'true' } } as any)}
                    >
                      <Ionicons name="pencil-outline" size={16} color="#0ca6e8" />
                    </TouchableOpacity>

                    {/* Set default */}
                    {!a.isDefault && (
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => handleSetDefault(a)}
                        disabled={settingDefault === a.id}
                      >
                        {settingDefault === a.id
                          ? <ActivityIndicator size="small" color="#f59e0b" />
                          : <Ionicons name="star-outline" size={16} color="#f59e0b" />
                        }
                      </TouchableOpacity>
                    )}

                    {/* Delete */}
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={() => handleDelete(a)}
                      disabled={deleting === a.id}
                    >
                      {deleting === a.id
                        ? <ActivityIndicator size="small" color="#ef4444" />
                        : <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={s.addCard} onPress={() => router.push('/add-address' as any)}>
              <View style={s.addCardIcon}>
                <Ionicons name="add-circle" size={26} color="#0ca6e8" />
              </View>
              <Text style={s.addCardTxt}>Add Another Address</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Header() {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#0d1629" />
      </TouchableOpacity>
      <Text style={s.headerTitle}>Saved Addresses</Text>
      <TouchableOpacity onPress={() => router.push('/add-address' as any)} style={s.headerAddBtn}>
        <Ionicons name="add" size={24} color="#0ca6e8" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
  headerAddBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  scroll: { padding: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0d1629', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22, paddingHorizontal: 24, marginBottom: 28 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0ca6e8', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  emptyAddBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  addressCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  addressCardDefault: { borderColor: '#0ca6e8' },
  addressCardLeft: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  addressIconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 14, flexShrink: 0 },
  addressIconCircleDefault: { backgroundColor: '#0ca6e8' },
  addressTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  addressLabel: { fontSize: 16, fontWeight: '700', color: '#0d1629' },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0f4fd', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  defaultBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#0ca6e8' },
  addressLine1: { fontSize: 14, color: '#374151', marginBottom: 2 },
  addressLine2: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  addressCity: { fontSize: 13, color: '#6b7280' },
  addressActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },

  addCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: '#e0f4fd', borderStyle: 'dashed',
  },
  addCardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e0f4fd', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  addCardTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0ca6e8' },
});