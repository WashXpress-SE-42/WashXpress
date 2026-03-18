import React, { useEffect, useRef, useState } from 'react';
import {
    Alert, Animated, ScrollView, StyleSheet, Text,
    TextInput, TouchableOpacity, View, ActivityIndicator,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BookingDetails {
    id: string;
    service: { name: string; categoryId: string };
    vehicle: { make: string; model: string; nickname?: string };
    scheduledDate: string;
    provider?: { displayName: string; photoURL?: string } | null;
    assignedStaffName?: string;
    totalPrice: number;
    currency: string;
    paidWithSubscription: boolean;
}

// ── Category emoji map ────────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
    'exterior-wash': '🚿',
    'interior-clean': '🧹',
    'tire-cleaning': '⚙️',
    'full-detail': '✨',
};

// ── Quick tag options ─────────────────────────────────────────────────────────
const POSITIVE_TAGS = [
    'On time', 'Great job', 'Very thorough', 'Friendly',
    'Professional', 'Careful with my car', 'Will book again',
];

const NEGATIVE_TAGS = [
    'Late arrival', 'Rushed job', 'Missed spots', 'Not friendly',
    'Needs improvement', 'Careless',
];

// ── Star rating component ─────────────────────────────────────────────────────
function StarRating({
    rating, onRate, size = 40,
}: { rating: number; onRate: (r: number) => void; size?: number }) {
    const scales = useRef([...Array(5)].map(() => new Animated.Value(1))).current;

    const handlePress = (star: number) => {
        onRate(star);
        Animated.sequence([
            Animated.timing(scales[star - 1], { toValue: 1.4, duration: 100, useNativeDriver: true }),
            Animated.spring(scales[star - 1], { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
        ]).start();
    };

    return (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => handlePress(star)} activeOpacity={0.7}>
                    <Animated.View style={{ transform: [{ scale: scales[star - 1] }] }}>
                        <Ionicons
                            name={star <= rating ? 'star' : 'star-outline'}
                            size={size}
                            color={star <= rating ? '#f59e0b' : '#d1d5db'}
                        />
                    </Animated.View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ── Rating label ──────────────────────────────────────────────────────────────
function ratingLabel(r: number) {
    if (r === 0) return '';
    if (r === 1) return 'Poor 😞';
    if (r === 2) return 'Fair 😐';
    if (r === 3) return 'Good 🙂';
    if (r === 4) return 'Great 😊';
    return 'Excellent! 🌟';
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RateBookingScreen() {
    const { colors, isDark } = useTheme();
    const { id: bookingId } = useLocalSearchParams<{ id: string }>();

    const [booking, setBooking] = useState<BookingDetails | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(true);
    const [rating, setRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Entrance animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        loadBooking();
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
        ]).start();
    }, []);

    const loadBooking = async () => {
        try {
            const res = await apiFetch(`/bookings/${bookingId}`, {}, 'customer');
            if (res.success) {
              setBooking(res.data?.booking ?? res.booking ?? res.data);}
        } catch (e) {
            console.error('Load booking for rating error:', e);
        } finally {
            setLoadingBooking(false);
        }
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Rating Required', 'Please select a star rating before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            await apiFetch('/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    bookingId,
                    providerId: booking?.provider ? undefined : undefined, // backend resolves from booking
                    rating,
                    comment: comment.trim() || null,
                    tags: selectedTags,
                }),
            }, 'customer');

            Alert.alert(
                'Thank you! ⭐',
                'Your review helps other customers and motivates our washers.',
                [{ text: 'Done', onPress: () => router.back() }]
            );
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const washerName = booking?.provider?.displayName
        ?? booking?.assignedStaffName
        ?? 'Your Washer';

    const emoji = CATEGORY_EMOJI[booking?.service?.categoryId ?? ''] || '🚗';
    const activeTags = rating >= 4 ? POSITIVE_TAGS : rating > 0 ? NEGATIVE_TAGS : POSITIVE_TAGS;

    if (loadingBooking) return (
        <View style={[s.center, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.accent} />
        </View>
    );

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Rate Your Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                        {/* Service summary card */}
                        {booking && (
                            <View style={[s.summaryCard, { backgroundColor: colors.cardBackground }]}>
                                <View style={[s.serviceIconCircle, { backgroundColor: isDark ? 'rgba(12,166,232,0.15)' : '#e0f4fd' }]}>
                                    <Text style={s.serviceEmoji}>{emoji}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={[s.serviceName, { color: colors.textPrimary }]}>{booking.service?.name}</Text>
                                    <Text style={[s.vehicleText, { color: colors.textSecondary }]}>
                                        {booking.vehicle?.nickname || `${booking.vehicle?.make} ${booking.vehicle?.model}`}
                                    </Text>
                                    <Text style={[s.dateText, { color: colors.textSecondary }]}>
                                        {new Date(booking.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </Text>
                                </View>
                                <View style={[s.priceBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4' }]}>
                                    <Text style={[s.priceText, { color: colors.success || '#10b981' }]}>
                                        {booking.paidWithSubscription ? 'Sub' : `LKR ${booking.totalPrice?.toLocaleString()}`}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Washer info */}
                        <View style={s.washerSection}>
                            <View style={[s.washerAvatar, { backgroundColor: isDark ? 'rgba(12,166,232,0.15)' : '#e0f4fd' }]}>
                                <Ionicons name="person" size={32} color={colors.accent} />
                            </View>
                            <View style={{ alignItems: 'center', marginTop: 12 }}>
                                <Text style={[s.washerLabel, { color: colors.textSecondary }]}>How did</Text>
                                <Text style={[s.washerName, { color: colors.textPrimary }]}>{washerName}</Text>
                                <Text style={[s.washerLabel, { color: colors.textSecondary }]}>do?</Text>
                            </View>
                        </View>

                        {/* Star rating */}
                        <View style={s.starsSection}>
                            <StarRating rating={rating} onRate={setRating} size={48} />
                            {rating > 0 && (
                                <Animated.Text style={[s.ratingLabel, { color: rating >= 4 ? '#f59e0b' : colors.textSecondary }]}>
                                    {ratingLabel(rating)}
                                </Animated.Text>
                            )}
                        </View>

                        {/* Quick tags */}
                        {rating > 0 && (
                            <View style={s.tagsSection}>
                                <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                                    {rating >= 4 ? 'What did you love?' : 'What could be better?'}
                                </Text>
                                <View style={s.tagsWrap}>
                                    {activeTags.map(tag => {
                                        const sel = selectedTags.includes(tag);
                                        return (
                                            <TouchableOpacity
                                                key={tag}
                                                style={[
                                                    s.tag,
                                                    { backgroundColor: colors.cardBackground, borderColor: colors.divider },
                                                    sel && { backgroundColor: colors.accent, borderColor: colors.accent },
                                                ]}
                                                onPress={() => toggleTag(tag)}
                                            >
                                                <Text style={[s.tagTxt, { color: colors.textSecondary }, sel && { color: '#fff' }]}>
                                                    {sel ? '✓ ' : ''}{tag}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Written review */}
                        <View style={s.commentSection}>
                            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                                Add a comment <Text style={[s.optional, { color: colors.textSecondary }]}>(optional)</Text>
                            </Text>
                            <TextInput
                                style={[
                                    s.commentInput,
                                    {
                                        backgroundColor: colors.cardBackground,
                                        borderColor: colors.divider,
                                        color: colors.textPrimary,
                                    },
                                ]}
                                placeholder="Share details about your experience..."
                                placeholderTextColor={colors.textSecondary}
                                value={comment}
                                onChangeText={setComment}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                maxLength={500}
                            />
                            <Text style={[s.charCount, { color: colors.textSecondary }]}>{comment.length}/500</Text>
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            style={[
                                s.submitBtn,
                                { backgroundColor: rating > 0 ? colors.accent : colors.divider },
                            ]}
                            onPress={handleSubmit}
                            disabled={submitting || rating === 0}
                            activeOpacity={0.85}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="star" size={20} color="#fff" />
                                    <Text style={s.submitBtnTxt}>Submit Review</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Skip */}
                        <TouchableOpacity style={s.skipBtn} onPress={() => router.back()}>
                            <Text style={[s.skipTxt, { color: colors.textSecondary }]}>Skip for now</Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1,
    },
    closeBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },

    scroll: { padding: 20 },

    summaryCard: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 18,
        padding: 16, marginBottom: 28,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    serviceIconCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    serviceEmoji: { fontSize: 26 },
    serviceName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
    vehicleText: { fontSize: 13, marginBottom: 2 },
    dateText: { fontSize: 12 },
    priceBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    priceText: { fontSize: 13, fontWeight: '700' },

    washerSection: { alignItems: 'center', marginBottom: 28 },
    washerAvatar: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center',
    },
    washerLabel: { fontSize: 14, marginVertical: 2 },
    washerName: { fontSize: 22, fontWeight: '800', textAlign: 'center' },

    starsSection: { alignItems: 'center', marginBottom: 28, gap: 12 },
    ratingLabel: { fontSize: 18, fontWeight: '700', marginTop: 4 },

    tagsSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: {
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 20, borderWidth: 1.5,
    },
    tagTxt: { fontSize: 13, fontWeight: '600' },

    commentSection: { marginBottom: 28 },
    optional: { fontSize: 13, fontWeight: '400' },
    commentInput: {
        borderWidth: 1, borderRadius: 14, padding: 14,
        fontSize: 15, minHeight: 110, lineHeight: 22,
    },
    charCount: { fontSize: 12, textAlign: 'right', marginTop: 6 },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, borderRadius: 16, paddingVertical: 18, marginBottom: 14,
    },
    submitBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

    skipBtn: { alignItems: 'center', paddingVertical: 10 },
    skipTxt: { fontSize: 14 },
});