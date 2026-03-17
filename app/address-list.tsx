import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

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
  const { colors, isDark } = useTheme();
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
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Header colors={colors} />
      <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Header colors={colors} />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />}
      >
        {addresses.length === 0 ? (
          <View style={s.emptyState}>
            <View style={[s.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
              <Ionicons name="location-outline" size={44} color={colors.textSecondary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No addresses yet</Text>
            <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>Add your home, work, or any location where you'd like your car washed.</Text>
            <TouchableOpacity style={[s.emptyAddBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/add-address' as any)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={s.emptyAddBtnTxt}>Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {addresses.map(a => {
              const iconName = LABEL_ICONS[a.label] || 'location';
              return (
                <View key={a.id} style={[s.addressCard, { backgroundColor: colors.cardBackground, shadowColor: '#000' }, a.isDefault && { borderColor: colors.accent }]}>
                  <View style={s.addressCardLeft}>
                    <View style={[s.addressIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }, a.isDefault && { backgroundColor: colors.accent }]}>
                      <Ionicons name={iconName as any} size={22} color={a.isDefault ? '#fff' : colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.addressTopRow}>
                        <Text style={[s.addressLabel, { color: colors.textPrimary }]}>{a.label}</Text>
                        {a.isDefault && (
                          <View style={[s.defaultBadge, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                            <Ionicons name="star" size={10} color={colors.accent} />
                            <Text style={[s.defaultBadgeTxt, { color: colors.accent }]}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.addressLine1, { color: colors.textPrimary }]}>{a.addressLine1}</Text>
                      {a.addressLine2 && <Text style={[s.addressLine2, { color: colors.textSecondary }]}>{a.addressLine2}</Text>}
                      <Text style={[s.addressCity, { color: colors.textSecondary }]}>{a.city}{a.postalCode ? `, ${a.postalCode}` : ''}</Text>
                    </View>
                  </View>

                  <View style={[s.addressActions, { borderTopColor: colors.divider }]}>
                    {/* Edit */}
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#f8fafc' }]}
                      onPress={() => router.push({ pathname: '/add-address', params: { addressId: a.id, edit: 'true' } } as any)}
                    >
                      <Ionicons name="pencil-outline" size={16} color={colors.accent} />
                    </TouchableOpacity>

                    {/* Set default */}
                    {!a.isDefault && (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#f8fafc' }]}
                        onPress={() => handleSetDefault(a)}
                        disabled={settingDefault === a.id}
                      >
                        {settingDefault === a.id
                          ? <ActivityIndicator size="small" color={colors.warning} />
                          : <Ionicons name="star-outline" size={16} color={colors.warning} />
                        }
                      </TouchableOpacity>
                    )}

                    {/* Delete */}
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#f8fafc' }]}
                      onPress={() => handleDelete(a)}
                      disabled={deleting === a.id}
                    >
                      {deleting === a.id
                        ? <ActivityIndicator size="small" color={colors.error} />
                        : <Ionicons name="trash-outline" size={16} color={colors.error} />
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={[s.addCard, { backgroundColor: colors.cardBackground, borderColor: isDark ? colors.accent : '#e0f4fd' }]} onPress={() => router.push('/add-address' as any)}>
              <View style={[s.addCardIcon, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.15)' : '#e0f4fd' }]}>
                <Ionicons name="add-circle" size={26} color={colors.accent} />
              </View>
              <Text style={[s.addCardTxt, { color: colors.accent }]}>Add Another Address</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Header({ colors }: { colors: any }) {
  return (
    <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Saved Addresses</Text>
      <TouchableOpacity onPress={() => router.push('/add-address' as any)} style={s.headerAddBtn}>
        <Ionicons name="add" size={24} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d1629' },
  headerAddBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  scroll: { padding: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24, marginBottom: 28 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  emptyAddBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  addressCard: {
    borderRadius: 18, padding: 16, marginBottom: 12,
    elevation: 2,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  addressCardDefault: { },
  addressCardLeft: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  addressIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14, flexShrink: 0 },
  addressIconCircleDefault: { },
  addressTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  addressLabel: { fontSize: 16, fontWeight: '700' },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  defaultBadgeTxt: { fontSize: 11, fontWeight: '700' },
  addressLine1: { fontSize: 14, marginBottom: 2 },
  addressLine2: { fontSize: 13, marginBottom: 2 },
  addressCity: { fontSize: 13 },
  addressActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, borderTopWidth: 1, paddingTop: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  addCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, padding: 18, borderWidth: 1.5, borderStyle: 'dashed',
  },
  addCardIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  addCardTxt: { flex: 1, fontSize: 15, fontWeight: '600' },
});