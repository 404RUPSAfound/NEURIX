import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Platform, Image, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Activity, ShieldCheck, Cpu, HardDrive, 
  BookOpen, Calculator, Info, ChevronRight, 
  Zap, Bell, Lock, Globe, Terminal, 
  Fingerprint, Signal, Database, Layers,
  Compass, Radio, Hash
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// [FOREST/SAGE ELITE HUD - SYSTEM OPERATIONS]

export default function MoreScreen() {
  const [meshActive, setMeshActive] = useState(true);
  const [stealthMode, setStealthMode] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { 
      toValue: 1, 
      duration: 800, 
      useNativeDriver: Platform.OS !== 'web' 
    }).start();
  }, []);

  const TOOLS = [
    { label: 'UNIT CONVERTER', icon: Hash, desc: 'Flow rate, Pressure, Distance' },
    { label: 'MORSE CODE', icon: Radio, desc: 'Signal visual/audio pulse' },
    { label: 'TACTICAL COMPASS', icon: Compass, desc: 'Offline orientation' },
    { label: 'MAP LAYERS', icon: Layers, desc: 'Satellite, Topo, Mesh' },
  ];

  const DOCUMENTS = [
    { title: 'SOP: FLOOD RESPONSE v2', date: '21 MAR 2026' },
    { title: 'SECURE COMMS PROTOCOL', date: '04 JAN 2026' },
    { title: 'FIRST AID: CARDIAC LOAD', date: '12 FEB 2026' },
  ];

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image 
        source={require('../../assets/images/bg-pattern.jpg')} 
        style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} 
        resizeMode="cover" 
      />
      
      <Animated.View style={[s.mainHUD, { opacity: fadeAnim }]}>
        {/* HEADER BLOCK - TACTICAL GRADIENT */}
        <LinearGradient 
          colors={['#0F2027', '#28623A']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 0, y: 1 }} 
          style={s.header}
        >
          <View style={s.headerTop}>
            <View>
              <Text style={s.commandLabel}>SYSTEM OPERATIONS · INTEL HUB</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={{ fontFamily: DESIGN.fontSerif, color: '#e9fde2ff', fontSize: 24 }}>NEURIX</Text>
                <Text style={{ fontFamily: DESIGN.fontSerif, color: '#81C784', fontSize: 24 }}>CONSOLE</Text>
              </View>
            </View>
            <TouchableOpacity style={s.headerBadge} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <ShieldCheck size={14} color="#81C784" />
              <Text style={s.badgeText}>SECURED</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* SYSTEM TELEMETRY */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>SYSTEM TELEMETRY</Text>
          </View>
          
          <View style={s.telemetryRow}>
            <TelemetryCard label="MESH SIGNAL" val="94%" icon={Signal} color="#81C784" />
            <TelemetryCard label="CPU LOAD" val="12%" icon={Cpu} color="#3B82F6" />
            <TelemetryCard label="STORAGE" val="88G" icon={HardDrive} color="#F59E0B" />
          </View>

          {/* PROTOCOL CONTROLS */}
          <View style={s.cardGroup}>
             <View style={s.tacticalCard}>
                <View style={s.settingRow}>
                   <View style={s.iconBg}><Zap size={18} color="#81C784" /></View>
                   <View style={s.settingContent}>
                      <Text style={s.settingTitle}>Autonomous Mesh Relay</Text>
                      <Text style={s.settingSub}>Allow device to act as a repeater node</Text>
                   </View>
                   <Switch 
                      value={meshActive} 
                      onValueChange={(val) => { setMeshActive(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                      trackColor={{ false: '#333', true: '#28623A' }}
                      thumbColor={meshActive ? '#81C784' : '#555'}
                   />
                </View>
                <View style={s.divider} />
                <View style={s.settingRow}>
                   <View style={s.iconBg}><Lock size={18} color="#F59E0B" /></View>
                   <View style={s.settingContent}>
                      <Text style={s.settingTitle}>Stealth Signature</Text>
                      <Text style={s.settingSub}>Minimize radio emission profile</Text>
                   </View>
                   <Switch 
                      value={stealthMode} 
                      onValueChange={(val) => { setStealthMode(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
                      trackColor={{ false: '#333', true: '#28623A' }}
                      thumbColor={stealthMode ? '#81C784' : '#555'}
                   />
                </View>
             </View>
          </View>

          {/* QUICK TOOLS */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>TACTICAL TOOLS</Text>
            <Text style={s.viewAll}>Authorized Only</Text>
          </View>

          <View style={s.toolsGrid}>
            {TOOLS.map((tool, i) => (
              <TouchableOpacity key={i} style={s.toolCard} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <View style={s.toolIconBox}>
                  <tool.icon size={22} color="#1E2F23" />
                </View>
                <Text style={s.toolLabel}>{tool.label}</Text>
                <Text style={s.toolDesc}>{tool.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* MISSION DOCUMENTS */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>MISSION BRIEFINGS</Text>
          </View>

          <View style={s.cardGroup}>
            {DOCUMENTS.map((doc, i) => (
              <TouchableOpacity key={i} style={[s.docRow, i === DOCUMENTS.length - 1 && { borderBottomWidth: 0 }]} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <View style={s.docIcon}>
                  <BookOpen size={18} color="#1E2F23" />
                </View>
                <View style={s.docInfo}>
                  <Text style={s.docTitle}>{doc.title}</Text>
                  <Text style={s.docDate}>{doc.date} · PDF · 2.4MB</Text>
                </View>
                <ChevronRight size={18} color="#B0BEC5" />
              </TouchableOpacity>
            ))}
          </View>

          {/* SYSTEM INFO */}
          <View style={s.footer}>
             <View style={s.footerShield}>
                <ShieldCheck size={24} color="#81C784" />
             </View>
             <Text style={s.footerVersion}>NEURIX OPERATIONAL SYSTEM V4.1.2</Text>
             <Text style={s.footerCpy}>© 2026 STRATEGIC COMMAND · ALL RIGHTS RESERVED</Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function TelemetryCard({ label, val, icon: Icon, color }: any) {
  return (
    <View style={s.telemetryCard}>
      <Icon size={14} color={color} />
      <Text style={s.telVal}>{val}</Text>
      <Text style={s.telLab}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF3EF' },
  mainHUD: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // HEADER
  header: { 
    backgroundColor: '#023f11ff', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 24, 
    paddingBottom: 24,
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40 
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commandLabel: { fontFamily: DESIGN.fontLabel, color: '#FFF', fontSize: 10, letterSpacing: 1.5, opacity: 0.6 },
  headerBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  badgeText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#81C784', fontSize: 10, letterSpacing: 1 },

  // TELEMETRY
  telemetryRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginTop: 24, marginBottom: 24 },
  telemetryCard: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 16, 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10
  },
  telVal: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 20, marginVertical: 4 },
  telLab: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7, letterSpacing: 1 },

  // SECTIONS
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 30, 
    marginBottom: 16, 
    marginTop: 12 
  },
  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 8.5, letterSpacing: 1.5 },
  viewAll: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 9.5 },

  // CARDS
  cardGroup: { paddingHorizontal: 24, marginBottom: 24 },
  tacticalCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 32, 
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  iconBg: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: '#EFF3EF', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  settingContent: { flex: 1 },
  settingTitle: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 14 },
  settingSub: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 10, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#EFF3EF', marginVertical: 16 },

  // TOOLS GRID
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 12, marginBottom: 32 },
  toolCard: { 
    width: (width - 60) / 2, 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10
  },
  toolIconBox: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: 'rgba(129, 199, 132, 0.2)', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 12
  },
  toolLabel: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 12, letterSpacing: 0.5 },
  toolDesc: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 9, marginTop: 4 },

  // DOCUMENTS
  docRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8
  },
  docIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#EFF3EF', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 16
  },
  docInfo: { flex: 1 },
  docTitle: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 13 },
  docDate: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 9, marginTop: 2 },

  // FOOTER
  footer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  footerShield: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: 'rgba(129, 199, 132, 0.1)', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 199, 132, 0.2)'
  },
  footerVersion: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 9, letterSpacing: 1 },
  footerCpy: { fontFamily: DESIGN.fontLabel, color: '#B0BEC5', fontSize: 7, opacity: 0.6 }
});
