import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header } from '../components/Header';

const BRAND = '#0ca6e8';
const BRAND_DARK = '#0d1629';

// Fixed 4 service types
const SERVICE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; description: string }> = {
  'exterior-wash': { icon: 'water-outline', color: '#0ca6e8', description: 'Full exterior body wash & dry' },
  'interior-clean': { icon: 'sparkles-outline', color: '#7c3aed', description: 'Deep interior vacuum & wipe down' },
  'tire-cleaning': { icon: 'ellipse-outline', color: '#d97706', description: 'Tire & wheel deep clean' },
  'full-detail': { icon: 'star-outline', color: '#059669', description: 'Complete interior & exterior detail' },
};

function getServiceMeta(categoryId: string) {
  return SERVICE_META[categoryId] || { icon: 'car-outline' as any, color: BRAND, description: '' };
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number;
  categoryId: string;
}

export default function ServiceBrowseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryParam = params.category as string | undefined;

  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'duration'>('price_asc');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (categoryParam) setSelectedCategory(categoryParam); }, [categoryParam]);
  useEffect(() => { applyFilters(); }, [services, selectedCategory, searchQuery, minPrice, maxPrice, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadCategories(), loadServices()]);
    } catch {
      Alert.alert('Error', 'Failed to load services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiFetch('/services/categories', { requiresAuth: false }, 'customer');
      if (data.success) setCategories(data.data.categories);
    } catch (e) {
      console.error('Load categories error:', e);
    }
  };

  const loadServices = async () => {
    try {
      const data = await apiFetch('/services?limit=50', { requiresAuth: false }, 'customer');
      if (data.success) setServices(data.data.services);
    } catch (e) {
      console.error('Load services error:', e);
    }
  };

  const applyFilters = () => {
    let filtered = [...services];

    if (selectedCategory) filtered = filtered.filter(s => s.categoryId === selectedCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }

    if (minPrice) filtered = filtered.filter(s => s.price >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter(s => s.price <= parseFloat(maxPrice));

    filtered.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return a.duration - b.duration;
    });

    setFilteredServices(filtered);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('price_asc');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title="Browse Services"
        rightElement={
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.headerBtn}>
            <Ionicons name="options-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52 }} contentContainerStyle={styles.categoriesContent}>
        <TouchableOpacity
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => setSelectedCategory(null)}>
          <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity key={cat.id}
            style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
            onPress={() => setSelectedCategory(cat.id)}>
            <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsCount}>{filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}</Text>
        {(minPrice || maxPrice || selectedCategory) && (
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Services */}
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 30 }}>
        {filteredServices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters</Text>
          </View>
        ) : (
          filteredServices.map(service => {
            const meta = getServiceMeta(service.categoryId);
            return (
              <TouchableOpacity key={service.id} style={styles.card}
                onPress={() => router.push(`/service-details?id=${service.id}`)}>
                {/* Icon */}
                <View style={[styles.cardIcon, { backgroundColor: meta.color + '18' }]}>
                  <Ionicons name={meta.icon} size={28} color={meta.color} />
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{service.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>
                    {service.description || meta.description}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Ionicons name="time-outline" size={13} color="#94a3b8" />
                    <Text style={styles.cardMetaText}>~{service.duration} min</Text>
                  </View>
                </View>

                {/* Price */}
                <View style={styles.cardRight}>
                  <Text style={styles.cardPrice}>LKR {service.price.toLocaleString()}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={BRAND_DARK} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.filterLabel}>Price Range (LKR)</Text>
              <View style={styles.priceRow}>
                <TextInput style={styles.priceInput} placeholder="Min" keyboardType="numeric"
                  value={minPrice} onChangeText={setMinPrice} />
                <Text style={{ marginHorizontal: 12, color: '#94a3b8', fontSize: 16 }}>—</Text>
                <TextInput style={styles.priceInput} placeholder="Max" keyboardType="numeric"
                  value={maxPrice} onChangeText={setMaxPrice} />
              </View>

              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.sortRow}>
                {([
                  { key: 'price_asc', label: 'Price ↑' },
                  { key: 'price_desc', label: 'Price ↓' },
                  { key: 'duration', label: 'Duration' },
                ] as const).map(s => (
                  <TouchableOpacity key={s.key}
                    style={[styles.sortBtn, sortBy === s.key && styles.sortBtnActive]}
                    onPress={() => setSortBy(s.key)}>
                    <Text style={[styles.sortBtnText, sortBy === s.key && styles.sortBtnTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { clearFilters(); setShowFilters(false); }}>
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: BRAND_DARK },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0'
  },
  searchInput: { flex: 1, fontSize: 15, color: BRAND_DARK },

  categoriesContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8
  },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  resultsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10
  },
  resultsCount: { fontSize: 13, color: '#94a3b8' },
  clearText: { fontSize: 13, color: BRAND, fontWeight: '600' },

  list: { flex: 1, paddingHorizontal: 16 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#0d1629', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04,
    shadowRadius: 4, elevation: 2
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', marginRight: 14
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: BRAND_DARK, marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: '#94a3b8' },
  cardRight: { alignItems: 'flex-end' },
  cardPrice: { fontSize: 15, fontWeight: '800', color: BRAND_DARK },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#94a3b8', marginTop: 14 },
  emptySub: { fontSize: 14, color: '#cbd5e1', marginTop: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: BRAND_DARK },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 20, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: BRAND_DARK
  },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1,
    borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center'
  },
  sortBtnActive: { backgroundColor: BRAND, borderColor: BRAND },
  sortBtnText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  sortBtnTextActive: { color: '#fff', fontWeight: '700' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    borderColor: '#fca5a5', alignItems: 'center'
  },
  clearBtnText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
  applyBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: BRAND, alignItems: 'center' },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});