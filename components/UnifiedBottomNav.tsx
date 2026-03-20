import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, Href } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// Helper to determine if a pathname is a sub-route of a tab
const getActiveTab = (pathname: string, userType: string) => {
  if (userType === 'provider') {
    if (pathname === '/washer-home' || pathname === '/provider-home' || pathname.startsWith('/washer-job-request')) return 'home';
    if (pathname === '/myjobs' || pathname.startsWith('/washer-booking-details') || pathname.startsWith('/washer-inprogress') || pathname === '/washer-requests') return 'jobs';
    if (pathname === '/marketplace') return 'shop';
    if (pathname === '/washer-earnings') return 'earnings';
    if (pathname === '/profile' || pathname === '/edit-profile') return 'profile';
  } else {
    if (pathname === '/customer-home') return 'home';
    if (pathname === '/service-browse' || pathname.startsWith('/service-details') || pathname.startsWith('/create-booking') || pathname === '/checkout-page') return 'browse';
    if (pathname === '/booking-list' || pathname.startsWith('/booking-details') || pathname.startsWith('/customer-Inprogress') || pathname === '/booking-confirmation' || pathname === '/payment-screen' || pathname === '/PaymentScreen') return 'bookings';
    if (pathname === '/subscriptions') return 'plans';
    if (pathname === '/profile' || pathname === '/edit-profile' || pathname.startsWith('/address-') || pathname.startsWith('/vehicle-') || pathname === '/add-vehicle' || pathname === '/add-address' || pathname === '/my-subscription') return 'account';
  }
  return null;
}

export const UnifiedBottomNav = () => {
  const { colors } = useTheme();
  const { userType } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Define hidden routes where navigation should not appear
  const hiddenRoutes = ['/login', '/signup', '/washer-signup', '/Splashscreen', '/index', '/', '/home', '/washer-pending'];

  if (hiddenRoutes.includes(pathname)) {
    return null;
  }

  // Determine which nav items to show based on userType
  const navItems = userType === 'provider' 
    ? [
        { key: 'home', icon: 'home', label: 'Home', route: '/washer-home' },
        { key: 'jobs', icon: 'briefcase', label: 'My Jobs', route: '/myjobs' },
        { key: 'earnings', icon: 'cash', label: 'Earnings', route: '/washer-earnings' }, 
        { key: 'shop', icon: 'cart', label: 'Shop', route: '/marketplace' },
        { key: 'profile', icon: 'person', label: 'Profile', route: '/profile' },
      ]
    : [
        { key: 'home', icon: 'home', label: 'Home', route: '/customer-home' },
        { key: 'browse', icon: 'search', label: 'Browse', route: '/service-browse' },
        { key: 'bookings', icon: 'calendar', label: 'Bookings', route: '/booking-list' },
        { key: 'plans', icon: 'shield-checkmark', label: 'Plans', route: '/subscriptions' },
        { key: 'account', icon: 'person', label: 'Account', route: '/profile' },
      ];

  const activeTabKey = getActiveTab(pathname, userType || 'customer');

  const handlePress = (item: typeof navItems[0]) => {
    if (activeTabKey === item.key) {
      // If already on this tab, pop to root (replace with root route)
      router.replace(item.route as Href);
    } else {
      // Use replace for tab switching to avoid stack accumulation
      router.replace(item.route as Href);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
      {navItems.map((item) => (
        <NavButton
          key={item.key}
          item={item}
          isActive={activeTabKey === item.key}
          onPress={() => handlePress(item)}
          colors={colors}
        />
      ))}
    </View>
  );
};

const NavButton = ({ item, isActive, onPress, colors }: any) => {
  const animatedValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [isActive]);

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.navItem}
    >
      <Animated.View style={{ transform: [{ scale }, { translateY }], alignItems: 'center' }}>
        <Ionicons
          name={isActive ? (item.icon as any) : (`${item.icon}-outline` as any)}
          size={24}
          color={isActive ? colors.accent : colors.textSecondary}
        />
        <Animated.Text
          style={[
            styles.label,
            {
              color: isActive ? colors.accent : colors.textSecondary,
              fontWeight: isActive ? '600' : '400',
              opacity: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.7, 0.8, 1],
              }),
            },
          ]}
        >
          {item.label}
        </Animated.Text>
      </Animated.View>
      {isActive && (
        <Animated.View 
          style={[
            styles.dot, 
            { 
              backgroundColor: colors.accent,
              transform: [{ scale: animatedValue }],
              opacity: animatedValue
            }
          ]} 
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 68,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 4,
  },
  dot: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  }
});
