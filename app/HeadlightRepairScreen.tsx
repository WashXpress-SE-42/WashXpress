import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, StatusBar } from 'react-native';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

export default function HeadlightRepairScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            <Header title="Headlight Repair" />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Image source={require('../assets/icons/headlight_cleaning.jpg')} style={styles.image} />
                <View style={[styles.content, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Headlight Repair Service</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        Restore clarity and improve night-time visibility with our professional headlight repair. We remove oxidation, yellowing, and scratches to make your headlights look crystal clear again.
                    </Text>
                    
                    <View style={[styles.featuresContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }]}>
                        <View style={[styles.featureItem, { borderBottomColor: colors.border }]}>
                            <Ionicons name="bulb-outline" size={24} color={colors.accent} />
                            <Text style={[styles.featureText, { color: colors.textPrimary }]}>Oxidation & Scratch Removal</Text>
                        </View>
                        <View style={[styles.featureItem, { borderBottomColor: colors.border }]}>
                            <Ionicons name="eye-outline" size={24} color={colors.accent} />
                            <Text style={[styles.featureText, { color: colors.textPrimary }]}>Improved Night Visibility</Text>
                        </View>
                        <View style={[styles.featureItem, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
                            <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
                            <Text style={[styles.featureText, { color: colors.textPrimary }]}>UV Protection Coating</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.orderButton, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                        onPress={() => router.push({
                            pathname: '/create-booking',
                            params: { serviceId: 'headlight-repair' }
                        } as any)}
                    >
                        <Text style={styles.orderButtonText}>Book Service</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 110,
    },
    image: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    content: {
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        minHeight: 500,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },
    featuresContainer: {
        marginBottom: 30,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    featureText: {
        fontSize: 16,
        marginLeft: 16,
        fontWeight: '600',
    },
    orderButton: {
        borderRadius: 18,
        paddingVertical: 18,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        marginTop: 10,
    },
    orderButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
});
