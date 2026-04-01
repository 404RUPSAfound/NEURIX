import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { DESIGN } from '@/constants/design';

export const AlertBanner: React.FC<{ message: string; type?: 'DANGER' | 'INFO' }> = ({ message, type = 'INFO' }) => {
  const color = type === 'DANGER' ? DESIGN.danger : DESIGN.primary;
  return (
    <Animated.View entering={FadeInUp.duration(500)} style={s.banner}>
      <View style={[s.iconBox, { backgroundColor: color + '15', borderColor: color + '30' }]}>
        <AlertCircle color={color} size={16} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.bannerTitle}>{type} ALERT</Text>
        <Text style={s.bannerMsg} ellipsizeMode={'tail'}>{message}</Text>
      </View>
    </Animated.View>
  );
};

export const StatusBar: React.FC<{ status: string }> = ({ status }) => (
  <View style={s.statusBar}>
    <View style={s.statusLeft}>
      <View style={s.statusDot} />
      <Text style={s.statusText}>STATUS: {status}</Text>
    </View>
    <Text style={s.statusVersion}>SYSTEM OPTIMAL_v2.1</Text>
  </View>
);

const s = StyleSheet.create({
  banner: { marginBottom: 24, backgroundColor: DESIGN.bgCard, borderWidth: 1, borderColor: DESIGN.borderDefault, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: DESIGN.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  iconBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginRight: 16 },
  bannerTitle: { fontFamily: DESIGN.fontBlack, color: DESIGN.textPrimary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  bannerMsg: { fontFamily: DESIGN.fontMedium, color: DESIGN.textSecondary, fontSize: 13, lineHeight: 18 },
  
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DESIGN.borderSubtle, marginBottom: 24 },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DESIGN.success, marginRight: 8 },
  statusText: { fontFamily: DESIGN.fontBlack, color: DESIGN.primary, fontSize: 9, textTransform: 'uppercase', letterSpacing: 2 },
  statusVersion: { fontFamily: DESIGN.fontBold, color: DESIGN.textMuted, fontSize: 9, letterSpacing: 1 }
});
