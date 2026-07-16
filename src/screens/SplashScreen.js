import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';
import { COLORS } from '../utils/constants';

// Full-screen splash — red screen with logo for the first 5 seconds,
// then switches to a black screen with the rotating loader message
// if the auth check (or a slow/waking backend) is still in progress.
export default function SplashScreen() {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: showLoader ? '#000' : COLORS.primary }]}>
      {!showLoader ? (
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      ) : (
        <AppLoader messages={LOADING_MESSAGES.default} style={{ backgroundColor: 'transparent' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 260,
    height: 260,
  },
});