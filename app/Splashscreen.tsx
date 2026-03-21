import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000); // 2 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/icons/icon_copy.svg')} 
        style={styles.logo} 
        resizeMode="contain" 
      />
      <Text style={styles.text}>WashXpress</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d1629',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  text: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});