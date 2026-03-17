import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface HeaderProps {
    title: string;
    showBack?: boolean;
    rightElement?: React.ReactNode;
    theme?: 'light' | 'dark'; // Keep for overrides, but default to global
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = true, rightElement, theme: themeOverride }) => {
    const router = useRouter();
    const { userType } = useAuth();
    const { isDark: globalIsDark, colors } = useTheme();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            if (userType === 'provider') {
                router.replace('/washer-home' as any);
            } else {
                router.replace('/customer-home' as any);
            }
        }
    };

    const isDark = themeOverride ? themeOverride === 'dark' : globalIsDark;

    return (
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={isDark ? colors.textPrimary : colors.accent} />
                        {Platform.OS === 'ios' && <Text style={[styles.backText, { color: isDark ? colors.textPrimary : colors.accent }]}>Back</Text>}
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.titleContainer}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
            </View>
            <View style={styles.rightContainer}>
                {rightElement || <View style={{ width: 40 }} />}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
        borderBottomWidth: 1,
        zIndex: 100,
    },
    leftContainer: {
        flex: 1,
        alignItems: 'flex-start',
    },
    titleContainer: {
        flex: 2,
        alignItems: 'center',
    },
    rightContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -4,
    },
    backText: {
        fontSize: 17,
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
});
