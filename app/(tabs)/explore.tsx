import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Image, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  BrainCircuit, ShieldAlert, Zap, 
  Activity, Radio, Map, BarChart3, 
  AlertTriangle, Fingerprint, Cpu, 
  Globe, Server
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { fetchTacticalData, reverseGeocode } from '@/Store/realData';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function SystemIntelligence() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const result = await fetchTacticalData(loc.coords.latitude, loc.coords.longitude);
      setData(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.1 }]} resizeMode="cover" />

      {/* TACTICAL HEADER */}
      <Animated.View style={[s.header, { 
        backgroundColor: scrollY.interpolate({
          inputRange: [0, 50],
          outputRange: ['transparent', 'rgba(235, 251, 237, 0.9)']
        })
      }]}>
        <View style={s.headerInner}>
          <View>
            <Text style={s.headerTitle}>SYSTEM_INTELLIGENCE</Text>
            <View style={s.statusRow}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>NEURIX AI: ONLINE_SECURE</Text>
            </View>
          </View>
          <Fingerprint size={24} color={DESIGN.primary} />
        </View>
      </Animated.View>

      <Animated.ScrollView 
        contentContainerStyle={s.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== 'web' })}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.loaderBox}>
            <ActivityIndicator color={DESIGN.primary} size="large" />
            <Text style={s.loaderTxt}>ANALYZING SECTOR METADATA...</Text>
          </View>
        ) : (
          <>
            {/* THREAT ANALYSIS MATRIX */}
            <View style={s.section}>
              <View style={s.sectionHdr}>
                 <ShieldAlert size={14} color={DESIGN.primary} />
                 <Text style={s.sectionTitle}>REAL-TIME_THREAT_MATRIX</Text>
              </View>
              
              <View style={s.threatGrid}>
                 <BlurView intensity={30} tint="dark" style={s.threatCard}>
                    <Activity size={20} color="#E11D48" />
                    <Text style={s.threatVal}>{data?.disasters?.length || 0}</Text>
                    <Text style={s.threatLbl}>SEISMIC_VAR</Text>
                 </BlurView>
                 <BlurView intensity={30} tint="dark" style={s.threatCard}>
                    <AlertTriangle size={20} color="#F59E0B" />
                    <Text style={s.threatVal}>{data?.alerts?.length || 0}</Text>
                    <Text style={s.threatLbl}>ATMOS_RISK</Text>
                 </BlurView>
                 <BlurView intensity={30} tint="dark" style={[s.threatCard, { opacity: 0.5 }]}>
                    <Zap size={20} color={DESIGN.primary} />
                    <Text style={s.threatVal}>0%</Text>
                    <Text style={s.threatLbl}>RADIO_INT</Text>
                 </BlurView>
              </View>
            </View>

            {/* AI STRATEGIC SUGGESTIONS */}
            <View style={s.section}>
               <View style={s.sectionHdr}>
                  <BrainCircuit size={14} color={DESIGN.primary} />
                  <Text style={s.sectionTitle}>NEURIX_STRATEGIC_ADVISORY</Text>
               </View>
               
               <BlurView intensity={40} tint="dark" style={s.aiBox}>
                  <View style={s.pulseContainer}>
                     <View style={s.aiDot} />
                  </View>
                  <Text style={s.aiText}>
                    {data?.disasters?.length > 0 
                      ? "DETECTION: SEISMIC ACTIVITY DETECTED IN SECTOR. RECOMMENDATION: CROSS-CHECK MESH PROTOCOLS & IDENTIFY NEAREST REFUGE." 
                      : data?.alerts?.length > 0 
                      ? "DETECTION: ATMOSPHERIC TURBULENCE. RECOMMENDATION: ACTIVATE RAIN PROTOCOLS & MONITOR LOCAL DRAINAGE MAPPED IN OSM."
                      : "SECTOR CLEAR: NO ACTIVE KINETIC OR ATMOSPHERIC THREATS DETECTED. SYSTEM IN LOW-LATENCY MONITORING MODE."
                    }
                  </Text>
                  <TouchableOpacity style={s.actionBtn}>
                     <Text style={s.actionBtnTxt}>EXECUTE_SOP</Text>
                     <Zap size={14} color="#FFF" />
                  </TouchableOpacity>
               </BlurView>
            </View>

            {/* RESOURCE DENSITY HEATMAP SIMULATION-LIKE STATS */}
            <View style={s.section}>
               <View style={s.sectionHdr}>
                  <BarChart3 size={14} color={DESIGN.primary} />
                  <Text style={s.sectionTitle}>OPERATIONAL_AVAILABILITY</Text>
               </View>
               
               <View style={s.resList}>
                  <View style={s.resItem}>
                     <View style={s.resInfo}>
                        <Text style={s.resLabel}>MEDICAL_NODES</Text>
                        <Text style={s.resSub}>{data?.hospitals?.length || 0} UNITS IN 15KM</Text>
                     </View>
                     <View style={[s.bar, { width: '70%', backgroundColor: DESIGN.primary }]} />
                  </View>
                  <View style={s.resItem}>
                     <View style={s.resInfo}>
                        <Text style={s.resLabel}>MESH_CONNECTIVITY</Text>
                        <Text style={s.resSub}>STABLE_LINK (BTLE_PROT)</Text>
                     </View>
                     <View style={[s.bar, { width: '90%', backgroundColor: '#10B981' }]} />
                  </View>
                  <View style={s.resItem}>
                     <View style={s.resInfo}>
                        <Text style={s.resLabel}>POWER_GRID_STATUS</Text>
                        <Text style={s.resSub}>UNKNOWN (SENSOR_WAIT)</Text>
                     </View>
                     <View style={[s.bar, { width: '30%', backgroundColor: '#F59E0B' }]} />
                  </View>
               </View>
            </View>

            {/* SYSTEM LOGS BLOCK */}
            <View style={s.logSection}>
               <View style={s.logHdr}>
                  <Cpu size={12} color="#90A4AE" />
                  <Text style={s.logTitle}>KERNEL_LOG_SECURE_V4.1</Text>
               </View>
               <View style={s.logRows}>
                  <Text style={s.logLine}>[09:22:11] SYNC: USGS_SEISMIC_SERVER_ACK</Text>
                  <Text style={s.logLine}>[09:22:13] SYNC: OSM_OVERPASS_LAYER_ACK</Text>
                  <Text style={s.logLine}>[09:22:15] AI: SECTOR_ADVISORY_GENERATED</Text>
                  <Text style={s.logLine}>[09:22:16] MESH: HEARTBEAT_PULSE_SENT</Text>
               </View>
            </View>

            <View style={{ height: 100 }} />
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebfbedff' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 18, letterSpacing: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  statusText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1 },

  scrollContent: { paddingTop: 130, paddingHorizontal: 24 },
  loaderBox: { alignItems: 'center', marginTop: 100, gap: 20 },
  loaderTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10, letterSpacing: 2 },

  section: { marginBottom: 32 },
  sectionHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 1.5 },

  threatGrid: { flexDirection: 'row', gap: 12 },
  threatCard: { flex: 1, padding: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  threatVal: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 24, marginTop: 8 },
  threatLbl: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 7, letterSpacing: 1, marginTop: 2 },

  aiBox: { padding: 24, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pulseContainer: { position: 'absolute', top: 20, right: 20 },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DESIGN.primary },
  aiText: { fontFamily: DESIGN.fontBodySemiBold, color: '#1E2F23', fontSize: 13, lineHeight: 22, marginBottom: 20 },
  actionBtn: { alignSelf: 'flex-start', backgroundColor: '#1E2F23', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtnTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 10, letterSpacing: 1 },

  resList: { gap: 16 },
  resItem: { gap: 8 },
  resInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  resLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#1E2F23', fontSize: 10 },
  resSub: { fontFamily: DESIGN.fontLabel, color: '#90A4AE', fontSize: 8 },
  bar: { height: 6, borderRadius: 3, opacity: 0.8 },

  logSection: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  logHdr: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  logTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1 },
  logRows: { gap: 6 },
  logLine: { fontFamily: 'monospace', fontSize: 8, color: '#B0BEC5' }
});
