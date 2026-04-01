import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Activity } from 'lucide-react-native';
import api, { authAPI } from '@/Store/api';
import { DESIGN } from '@/constants/design';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 20, friction: 7, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(progressAnim, { toValue: 1, duration: 4000, useNativeDriver: false })
    ]).start();

    const timer = setTimeout(async () => {
      try {
        const user = await authAPI.getUser();
        if (user?.token) {
           await api.get('/health');
           router.replace('/(tabs)');
        } else {
           router.replace('/auth');
        }
      } catch (e) {
        router.replace('/auth');
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={s.container}>
      <LinearGradient colors={[DESIGN.bg, DESIGN.bgSurface]} style={StyleSheet.absoluteFill} />
      
      <Animated.View style={[s.center, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={s.logoCircle}>
          <ShieldCheck size={72} color={DESIGN.primary} strokeWidth={1} />
        </View>
        <Text style={s.brand}>NEURIX</Text>
        <Text style={s.tagline}>TACTICAL INTELLIGENCE NETWORK</Text>
      </Animated.View>

      <View style={s.loaderContainer}>
        <View style={s.progressRow}>
          <Text style={s.loaderText}>INITIALIZING COMMAND LINK</Text>
          <Activity size={12} color={DESIGN.primary} />
        </View>
        <View style={s.barBase}>
          <Animated.View style={[s.barFill, { width: barWidth }]} />
        </View>
        <Text style={s.status}>SECURE AES-256 HANDSHAKE ACTIVE</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGN.bg, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', zIndex: 10 },
  logoCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: DESIGN.borderDefault, marginBottom: 32 },
  brand: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 52, letterSpacing: 8 },
  tagline: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 4, marginTop: 8 },
  
  loaderContainer: { position: 'absolute', bottom: 80, width: width * 0.7 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  loaderText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 9, letterSpacing: 2 },
  barBase: { width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1 },
  barFill: { height: '100%', backgroundColor: DESIGN.primary },
  status: { fontFamily: DESIGN.fontLabel, color: DESIGN.textMuted, fontSize: 8, marginTop: 12, textAlign: 'center', opacity: 0.5, letterSpacing: 1 },
});
