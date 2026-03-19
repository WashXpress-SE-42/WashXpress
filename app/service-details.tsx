import { apiFetch } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Header } from '../components/Header';

const BRAND = '#0ca6e8';
const BRAND_DARK = '#0d1629';

// ── Fixed service type definitions ────────────────────────────────────────────
const SERVICE_TYPES: Record<string, {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    features: string[];
    whatToExpect: string;
}> = {
    'exterior-wash': {
        icon: 'water-outline',
        color: '#0ca6e8',
        bgColor: '#e0f4fd',
        features: [
            'Full exterior body wash',
            'Wheel & rim cleaning',
            'Window & mirror cleaning',
            'Tire shine application',
            'Hand dry finish',
        ],
        whatToExpect: 'A thorough exterior wash that removes dirt, grime and road residue leaving your car sparkling clean.',
    },
    'interior-clean': {
        icon: 'sparkles-outline',
        color: '#7c3aed',
        bgColor: '#ede9fe',
        features: [
            'Deep vacuum of seats & floors',
            'Dashboard & console wipe down',
            'Door panel cleaning',
            'Window interior cleaning',
            'Air vent cleaning',
            'Air freshener',
        ],
        whatToExpect: 'A deep interior clean that leaves your cabin fresh, dust-free and spotless.',
    },
    'tire-cleaning': {
        icon: 'ellipse-outline',
        color: '#d97706',
        bgColor: '#fef3c7',
        features: [
            'Tire deep scrub & degreasing',
            'Wheel & rim detailing',
            'Brake dust removal',
            'Tire shine application',
            'Wheel arch cleaning',
        ],
        whatToExpect: 'Professional tire and wheel cleaning that restores the original shine and removes built-up brake dust and grime.',
    },
    'full-detail': {
        icon: 'star-outline',
        color: '#059669',
        bgColor: '#d1fae5',
        features: [
            'Complete exterior wash & dry',
            'Clay bar paint decontamination',
            'Interior deep vacuum & wipe',
            'Leather/upholstery conditioning',
            'Tire & wheel full detail',
            'Window polish (inside & out)',
            'Engine bay wipe down',
        ],
        whatToExpect: 'The ultimate full-car treatment — inside and out. Your vehicle will look showroom-ready when we\'re done.',
    },
};

function getServiceType(categoryId: string) {
    return SERVICE_TYPES[categoryId] || SERVICE_TYPES['exterior-wash'];
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

interface Category {
    id: string;
    name: string;
}

export default function ServiceDetailsScreen() {
    const router = useRouter();
    const { id: serviceId } = useLocalSearchParams<{ id: string }>();

    const [service, setService] = useState<Service | null>(null);
    const [category, setCategory] = useState<Category | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serviceId) { Alert.alert('Error', 'Service not found'); router.back(); return; }
        loadServiceDetails();
    }, []);

    const loadServiceDetails = async () => {
        try {
            setLoading(true);
            const data = await apiFetch(`/services/${serviceId}`, { requiresAuth: false }, 'customer');
            if (data.success) {
                setService(data.data.service);
                if (data.data.service.category) setCategory(data.data.service.category);
            } else {
                Alert.alert('Error', 'Service not found');
                router.back();
            }
        } catch {
            Alert.alert('Error', 'Failed to load service details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={BRAND} />
                <Text style={styles.loadingText}>Loading service...</Text>
            </View>
        );
    }

    if (!service) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={56} color="#cbd5e1" />
                <Text style={styles.errorText}>Service not found</Text>
                <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
                    <Text style={styles.goBackText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const type = getServiceType(service.categoryId);

    return (
        <View style={styles.container}>
            {/* Header */}
            <Header title="Service Details" />

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 180 }}>
                {/* Hero */}
                <View style={[styles.hero, { backgroundColor: type.bgColor }]}>
                    <View style={[styles.heroIcon, { backgroundColor: type.color + '22' }]}>
                        <Ionicons name={type.icon} size={64} color={type.color} />
                    </View>
                    {category && (
                        <View style={[styles.categoryBadge, { backgroundColor: type.color + '18' }]}>
                            <Text style={[styles.categoryBadgeText, { color: type.color }]}>{category.name}</Text>
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceDesc}>{service.description || type.whatToExpect}</Text>

                    {/* Duration & Price */}
                    <View style={styles.metaRow}>
                        <View style={[styles.metaCard, { flex: 1, marginRight: 8 }]}>
                            <Ionicons name="time-outline" size={20} color="#94a3b8" />
                            <Text style={styles.metaLabel}>Duration</Text>
                            <Text style={styles.metaValue}>~{service.duration} min</Text>
                        </View>
                        <View style={[styles.metaCard, { flex: 1, marginLeft: 8 }]}>
                            <Ionicons name="cash-outline" size={20} color="#94a3b8" />
                            <Text style={styles.metaLabel}>Price</Text>
                            <Text style={[styles.metaValue, { color: type.color }]}>
                                LKR {service.price.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* What's Included */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>What's Included</Text>
                    {type.features.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                            <View style={[styles.featureCheck, { backgroundColor: type.color + '18' }]}>
                                <Ionicons name="checkmark" size={14} color={type.color} />
                            </View>
                            <Text style={styles.featureText}>{f}</Text>
                        </View>
                    ))}
                </View>

                {/* How It Works */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>How It Works</Text>
                    {[
                        { step: '1', title: 'Book the Service', desc: 'Select your vehicle, date & time, and confirm your booking.' },
                        { step: '2', title: 'Washer Assigned', desc: 'Available certified washers in your area race to accept your job.' },
                        { step: '3', title: 'Service at Your Location', desc: 'Your washer arrives and completes the service at your doorstep.' },
                        { step: '4', title: 'Pay & Rate', desc: 'Pay securely and share your experience with a review.' },
                    ].map(s => (
                        <View key={s.step} style={styles.stepRow}>
                            <View style={[styles.stepCircle, { backgroundColor: type.color }]}>
                                <Text style={styles.stepNum}>{s.step}</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>{s.title}</Text>
                                <Text style={styles.stepDesc}>{s.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Washer assignment note */}
                <View style={[styles.note, { borderLeftColor: type.color }]}>
                    <Ionicons name="flash-outline" size={18} color={type.color} />
                    <Text style={styles.noteText}>
                        No specific washer is pre-assigned. Once you book, the nearest available certified washer claims your job — just like Uber!
                    </Text>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <View>
                    <Text style={styles.footerLabel}>Total Price</Text>
                    <Text style={styles.footerPrice}>LKR {service.price.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.bookBtn, { backgroundColor: type.color }]}
                    onPress={() => router.push({ pathname: '/create-booking' as any, params: { serviceId: service.id } })}
                >
                    <Text style={styles.bookBtnText}>Book Now</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    loadingText: { marginTop: 12, fontSize: 15, color: '#64748b' },
    errorText: { fontSize: 17, color: '#94a3b8', marginTop: 14 },
    goBackBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: BRAND, borderRadius: 10 },
    goBackText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
    },
    headerBtn: { width: 40, padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: BRAND_DARK },

    scroll: { flex: 1 },

    hero: { height: 200, justifyContent: 'center', alignItems: 'center', gap: 12 },
    heroIcon: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
    categoryBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    categoryBadgeText: { fontSize: 13, fontWeight: '700' },

    infoSection: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 8, borderBottomColor: '#f8fafc' },
    serviceName: { fontSize: 26, fontWeight: '800', color: BRAND_DARK, marginBottom: 10 },
    serviceDesc: { fontSize: 15, lineHeight: 22, color: '#64748b', marginBottom: 20 },
    metaRow: { flexDirection: 'row' },
    metaCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
    metaLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
    metaValue: { fontSize: 16, fontWeight: '700', color: BRAND_DARK },

    section: { backgroundColor: '#fff', padding: 20, marginTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: BRAND_DARK, marginBottom: 16 },

    featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    featureCheck: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    featureText: { fontSize: 14, color: '#374151', flex: 1 },

    stepRow: { flexDirection: 'row', marginBottom: 20 },
    stepCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    stepNum: { fontSize: 15, fontWeight: '800', color: '#fff' },
    stepContent: { flex: 1 },
    stepTitle: { fontSize: 15, fontWeight: '600', color: BRAND_DARK, marginBottom: 3 },
    stepDesc: { fontSize: 13, color: '#64748b', lineHeight: 19 },

    note: {
        margin: 16, padding: 14, backgroundColor: '#fff', borderRadius: 12,
        borderLeftWidth: 4, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, elevation: 1
    },
    noteText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 19 },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 90,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, elevation: 8
    },
    footerLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 3 },
    footerPrice: { fontSize: 22, fontWeight: '800', color: BRAND_DARK },
    bookBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 28, paddingVertical: 15, borderRadius: 14
    },
    bookBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});