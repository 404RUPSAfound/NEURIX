import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, ScrollView, Platform, Linking, ActivityIndicator,
  StatusBar
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Target, Activity, Zap, Shield, AlertTriangle, 
  Radio, Phone, RefreshCw, Satellite, Signal, Globe, Disc, Cpu, Navigation2, Truck
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { mapAPI } from '@/Store/api';
import { useReconEngine } from '@/Store/reconEngine';
import { DESIGN } from '@/constants/design';

const { width, height } = Dimensions.get('window');

interface TacticalPoint {
  id: string;
  name: string;
  category: 'HOSPITAL' | 'PHARMACY' | 'RESOURCE';
  phone: string;
  lat: number;
  lng: number;
  address: string;
  distance_km: number;
}

interface DashboardStats {
  disasters: number;
  medical: number;
  ambulances: number;
  field_ops: number;
}

export default function ReconView() {
  const { nodes } = useReconEngine();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [assets, setAssets] = useState<TacticalPoint[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ disasters: 0, medical: 0, ambulances: 0, field_ops: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<TacticalPoint | null>(null);
  const [activeLayers, setActiveLayers] = useState({ medical: true, logistics: true, radar: true, units: true });
  
  const scanLineAnim = useRef(new Animated.Value(-100)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const startScanAnimation = useCallback(() => {
    scanLineAnim.setValue(-100);
    Animated.loop(
      Animated.timing(scanLineAnim, { toValue: height + 100, duration: 3500, useNativeDriver: Platform.OS !== 'web' })
    ).start();
    Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [scanLineAnim, fadeAnim]);

  const loadMissionData = async (coords: { lat: number; lng: number }) => {
    setLoading(true);
    try {
      const [assetRes, statRes] = await Promise.all([
        mapAPI.getNearbyAssets(coords.lat, coords.lng),
        mapAPI.getDashboardStats(coords.lat, coords.lng)
      ]);
      
      if (assetRes.success) setAssets(assetRes.assets);
      if (statRes.success) setStats(statRes.stats);
    } catch (e) {
      console.error("Mission Data Load Failure:", e);
    }
    setLoading(false);
  };

  const syncWithLocation = async () => {
    setLoading(true);
    const defaultCoords = { lat: 28.6139, lng: 77.2090 };
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        await loadMissionData({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } else {
        await loadMissionData(defaultCoords);
      }
    } catch {
      await loadMissionData(defaultCoords);
    }
    setLoading(false);
  };

  useEffect(() => {
    syncWithLocation();
    startScanAnimation();
  }, []);

  // Center-Relative Radar Projection logic
  const getRadarPosition = (assetLat: number, assetLng: number) => {
    const centerLat = location?.coords.latitude || 28.6139;
    const centerLng = location?.coords.longitude || 77.2090;
    
    // Zoom factor for web radar visibility (higher = more spread)
    const ZOOM = 1500; 
    const dx = (assetLng - centerLng) * ZOOM;
    const dy = (centerLat - assetLat) * ZOOM;
    
    return {
       x: 50 + dx, // Percentage
       y: 50 + dy
    };
  };

  const getCategoryTheme = (cat: string) => {
    if (cat === 'HOSPITAL') return { color: "#FF3D00", icon: Activity };
    if (cat === 'PHARMACY') return { color: '#FFB300', icon: Zap };
    return { color: DESIGN.primary, icon: Shield };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* TOP REAL-TIME TACTICAL DASHBOARD */}
      <View style={styles.topDashboard}>
         {[
           { label: 'DISASTERS', value: stats.disasters || '00', color: '#FF3D00', icon: AlertTriangle },
           { label: 'MEDICAL', value: stats.medical || '00', color: '#448AFF', icon: Shield },
           { label: 'AMBULANCES', value: stats.ambulances || '00', color: '#FFB300', icon: Truck },
           { label: 'FIELD OPS', value: stats.field_ops || '00', color: '#00E676', icon: Target }
         ].map((stat, i) => (
           <View key={i} style={styles.statModule}>
              <View style={[styles.statHeader, { borderColor: stat.color }]}>
                 <stat.icon size={12} color={stat.color} />
                 <Text style={[styles.statValue, { color: stat.color }]}>{String(stat.value).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
           </View>
         ))}
      </View>
      
      <View style={styles.radarContainer}>
        <View style={styles.gridOverlay}>
           {[...Array(12)].map((_, i) => <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i+1)*8.33}%` }]} />)}
           {[...Array(16)].map((_, i) => <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i+1)*6.25}%` }]} />)}
           <View style={styles.radarCircle1} />
           <View style={styles.radarCircle2} />
           <View style={styles.radarCircle3} />
        </View>

        <View style={styles.nodesWrapper}>
           {assets.filter(a => 
             (activeLayers.medical && (a.category === 'HOSPITAL' || a.category === 'PHARMACY')) ||
             (activeLayers.logistics && a.category === 'RESOURCE')
           ).map((asset) => {
             const theme = getCategoryTheme(asset.category);
             const pos = getRadarPosition(asset.lat, asset.lng);
             
             // Keep nodes within visible bounds
             if (Math.abs(pos.x - 50) > 45 || Math.abs(pos.y - 50) > 45) return null;

             return (
               <TouchableOpacity 
                 key={asset.id} 
                 style={[styles.nodeIcon, { left: `${pos.x}%`, top: `${pos.y}%`, borderColor: theme.color }]} 
                 onPress={() => setSelectedAsset(asset)}
               >
                  <View style={[styles.nodeCore, { backgroundColor: theme.color }]} />
               </TouchableOpacity>
             );
           })}
        </View>

        <View style={styles.mapPrompt}>
           <Globe size={18} color={DESIGN.primary} />
           <Text style={styles.mapPromptText}>WEB_RECON_NODE :: RADAR_TELEMETRY_ENABLED</Text>
        </View>
      </View>

      {activeLayers.radar && (
        <Animated.View style={[styles.scanLine, { pointerEvents: 'none', transform: [{ translateY: scanLineAnim }] }]}>
          <LinearGradient colors={['transparent', 'rgba(212, 175, 55, 0.15)', 'transparent']} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}

      <Animated.View style={[styles.topHud, { opacity: fadeAnim }]}>
        <BlurView intensity={35} tint="dark" style={styles.hudBlur}>
           <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                 <Satellite size={14} color={DESIGN.primary} />
                 <Text style={styles.hudTitle}>SENTINEL WEB_NODE 2.0</Text>
              </View>
              <Text style={styles.hudStatus}>{loading ? 'CALIBRATING GRID...' : `SECURE :: ${assets.length} ASSETS TOTAL`}</Text>
           </View>
           <TouchableOpacity onPress={syncWithLocation} disabled={loading} style={styles.syncBtn}>
              {loading ? <ActivityIndicator size="small" color={DESIGN.primary} /> : <RefreshCw size={20} color={DESIGN.primary} />}
           </TouchableOpacity>
        </BlurView>
      </Animated.View>

      <View style={styles.sideHud}>
         {[
           { id: 'medical', icon: Activity, color: "#FF3D00" },
           { id: 'logistics', icon: Zap, color: '#FFB300' },
           { id: 'units', icon: Cpu, color: '#00E676' },
           { id: 'radar', icon: Radio, color: DESIGN.primary }
         ].map(item => (
           <TouchableOpacity 
             key={item.id}
             style={[styles.sideBtn, activeLayers[item.id as keyof typeof activeLayers] && { borderColor: item.color, backgroundColor: 'rgba(0,0,0,0.85)' }]}
             onPress={() => setActiveLayers(p => ({ ...p, [item.id]: !p[item.id as keyof typeof activeLayers] }))}
           >
              <item.icon size={20} color={activeLayers[item.id as keyof typeof activeLayers] ? item.color : '#555'} />
           </TouchableOpacity>
         ))}
      </View>

      {selectedAsset && (
        <Animated.View style={[styles.intelWrapper, { transform: [{ translateY: slideAnim }] }]}>
          <BlurView intensity={95} tint="dark" style={styles.intelCard}>
            <View style={styles.cardHeader}>
               <View>
                 <Text style={styles.cardCat}>{selectedAsset.category} // TACTICAL_ASSET</Text>
                 <Text style={styles.cardTitle}>{selectedAsset.name}</Text>
                 <Text style={styles.metaText}>OPERATIONAL :: STATUS_NORMAL</Text>
               </View>
               <TouchableOpacity onPress={() => setSelectedAsset(null)} style={styles.closeBtn}>
                 <AlertTriangle size={20} color="#FF3D00" />
               </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.mainAction} 
              onPress={() => { if(selectedAsset.phone) window.open(`tel:${selectedAsset.phone}`) }}
            >
               <Phone size={18} color="#000" />
               <Text style={styles.mainActionText}>INITIATE COMM-LINK</Text>
            </TouchableOpacity>
            <View style={styles.addressBox}>
               <Text style={styles.addressTitle}>ADDRESS / LOCATION</Text>
               <Text style={styles.addressText}>{selectedAsset.address}</Text>
            </View>
          </BlurView>
        </Animated.View>
      )}

      <View style={styles.footerTicker}>
         <View style={styles.tickerContent}>
            <View style={styles.liveIndicator} />
            <Text style={styles.tickerText}>REAL_DATA_FEED :: {assets.length} NODES_ACTIVE :: GPS_LOCK: {location ? 'STABLE' : 'SIMULATED'}</Text>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  topDashboard: { position: 'absolute', top: 120, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 30 },
  statModule: { alignItems: 'center' },
  statHeader: { width: 70, height: 36, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.85)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statValue: { fontFamily: DESIGN.fontBlack, fontSize: 16, letterSpacing: 1 },
  statLabel: { fontFamily: DESIGN.fontBold, color: '#666', fontSize: 7, letterSpacing: 1.5, marginTop: 4 },
  
  radarContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: DESIGN.primary },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: DESIGN.primary },
  radarCircle1: { position: 'absolute', width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, borderWidth: 1, borderColor: DESIGN.primary, alignSelf: 'center', top: height * 0.2, opacity: 0.4 },
  radarCircle2: { position: 'absolute', width: width, height: width, borderRadius: width * 0.5, borderWidth: 1, borderColor: DESIGN.primary, alignSelf: 'center', top: height * 0.35, opacity: 0.6 },
  radarCircle3: { position: 'absolute', width: width * 0.5, height: width * 0.5, borderRadius: width * 0.25, borderWidth: 1, borderColor: DESIGN.primary, alignSelf: 'center', top: height * 0.5, opacity: 0.8 },
  
  nodesWrapper: { ...StyleSheet.absoluteFillObject },
  nodeIcon: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  nodeCore: { width: 8, height: 8, borderRadius: 4 },
  
  mapPrompt: { position: 'absolute', bottom: 85, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)' },
  mapPromptText: { fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 9, letterSpacing: 1 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 140, zIndex: 5 },
  
  topHud: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 20 },
  hudBlur: { flexDirection: 'row', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  hudTitle: { fontFamily: DESIGN.fontBlack, color: '#FFF', fontSize: 13, letterSpacing: 2 },
  hudStatus: { fontFamily: DESIGN.fontMedium, color: DESIGN.primary, fontSize: 9, letterSpacing: 1 },
  syncBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  
  sideHud: { position: 'absolute', right: 16, top: height * 0.35, zIndex: 20, gap: 12 },
  sideBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  
  intelWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  intelCard: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardCat: { fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 2 },
  cardTitle: { fontFamily: DESIGN.fontBlack, color: '#FFF', fontSize: 24, letterSpacing: 1 },
  metaText: { fontFamily: DESIGN.fontBold, color: '#666', fontSize: 9, marginTop: 4 },
  closeBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  mainAction: { height: 64, borderRadius: 20, backgroundColor: DESIGN.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 },
  mainActionText: { fontFamily: DESIGN.fontBlack, color: '#000', fontSize: 15, letterSpacing: 1 },
  addressBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  addressTitle: { fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 8, letterSpacing: 1, marginBottom: 6 },
  addressText: { fontFamily: DESIGN.fontRegular, color: '#CCC', fontSize: 13, lineHeight: 20 },
  
  footerTicker: { position: 'absolute', bottom: 34, left: 0, right: 0, height: 26, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  tickerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  liveIndicator: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#00E676', marginRight: 12 },
  tickerText: { fontFamily: DESIGN.fontBold, color: '#444', fontSize: 8, letterSpacing: 1 }
});
