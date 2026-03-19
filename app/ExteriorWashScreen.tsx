import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Href } from 'expo-router';

export default function ExteriorWashScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Header title="Exterior Wash" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Image source={require('../assets/icons/washing.jpg')} style={styles.image} />
                <View style={styles.content}>
                    <Text style={styles.title}>Exterior Wash Service</Text>
                    <Text style={styles.description}>
                        Give your car a deep, protective clean with our premium exterior wash service. We use high-quality foam soaps and microfiber towels to remove dirt and grime without scratching your paint.
                    </Text>
                    
                    <View style={styles.featuresContainer}>
                        <View style={styles.featureItem}>
                            <Ionicons name="water-outline" size={24} color="#0ca6e8" />
                            <Text style={styles.featureText}>Premium Foam Wash</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="sparkles-outline" size={24} color="#0ca6e8" />
                            <Text style={styles.featureText}>Hand Dry & Wax</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="shield-checkmark-outline" size={24} color="#0ca6e8" />
                            <Text style={styles.featureText}>Paint Protection</Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.orderButton}
                        onPress={() => router.push({ 
                            pathname: '/create-booking', 
                            params: { categoryId: 'exterior-wash' } 
                        } as any)}
                    >
                        <Text style={styles.orderButtonText}>Order Service</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    image: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    content: {
        padding: 20,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#0d1629',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#64748b',
        lineHeight: 24,
        marginBottom: 24,
    },
    featuresContainer: {
        marginBottom: 30,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    featureText: {
        fontSize: 16,
        color: '#334155',
        marginLeft: 16,
        fontWeight: '500',
    },
    orderButton: {
        backgroundColor: '#0ca6e8',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#0ca6e8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    orderButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
});
