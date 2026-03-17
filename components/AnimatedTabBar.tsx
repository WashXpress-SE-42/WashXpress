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
import { useTheme } from '../context/ThemeContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

export const AnimatedTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            label={label as string}
            isFocused={isFocused}
            onPress={onPress}
            iconName={options.tabBarIcon as any}
            colors={colors}
          />
        );
      })}
    </View>
  );
};

const TabItem = ({ label, isFocused, onPress, iconName, colors }: any) => {
  const animatedValue = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [isFocused]);

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  // Map route names to icons if iconName is just a string or missing
  const getIcon = (focused: boolean) => {
    let name = iconName;
    if (label === 'Home') name = focused ? 'home' : 'home-outline';
    else if (label === 'Shop') name = focused ? 'basket' : 'basket-outline';
    else if (label === 'Bookings') name = focused ? 'calendar' : 'calendar-outline';
    else if (label === 'Profile') name = focused ? 'person' : 'person-outline';
    
    return name || 'square';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabItem}
    >
      <Animated.View style={{ transform: [{ scale }, { translateY }], alignItems: 'center' }}>
        <Ionicons
          name={getIcon(isFocused)}
          size={24}
          color={isFocused ? colors.accent : colors.textSecondary}
        />
        <Animated.Text
          style={[
            styles.label,
            {
              color: isFocused ? colors.accent : colors.textSecondary,
              fontWeight: isFocused ? '600' : '400',
              opacity: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.7, 0.8, 1],
              }),
              fontSize: 10,
              marginTop: 4,
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
      {isFocused && (
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
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  dot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
  }
});
