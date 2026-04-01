import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, ScrollView, Platform, Linking, ActivityIndicator,
  StatusBar
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Target, Activity, Zap, Shield, AlertTriangle, 
  Radio, Phone, RefreshCw, Satellite, Signal, Disc, Cpu, Truck
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { mapAPI } from '@/Store/api';
import { useReconEngine } from '@/Store/reconEngine';
import { DESIGN } from '@/constants/design';

const { width, height } = Dimensions.get('window');

const TACTICAL_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#0a0a0a" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0a0a0a" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#333333" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#1f1f1f" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#001122" }] }
];

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
  const mapRef = useRef<MapView>(null);
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
      Animated.timing(scanLineAnim, { toValue: height + 100, duration: 3000, useNativeDriver: Platform.OS !== 'web' })
    ).start();
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [scanLineAnim, fadeAnim]);

  const loadMissionData = async (coords: { lat: number; lng: number }) => {
    setLoading(true);
    try {
      const [assetRes, statRes] = await Promise.all([
        mapAPI.getNearbyAssets(coords.lat, coords.lng),
        mapAPI.getDashboardStats(coords.lat, coords.lng)
      ]);
      if (assetRes.success) setAssets(assetRes.assets);
      if (statRes.success) {
          setStats(statRes.stats);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.log("Stats Load ERR:", e);
    }
    setLoading(false);
  };

  const handleAssetSelect = (asset: TacticalPoint) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedAsset(asset);
    mapRef.current?.animateToRegion({
        latitude: asset.lat - 0.003,
        longitude: asset.lng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
    }, 1000);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: false, tension: 60, friction: 10 }).start();
  };

  const syncWithLocation = async () => {
    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
    mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
    }, 1500);
    await loadMissionData({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  useEffect(() => {
    syncWithLocation();
    startScanAnimation();
  }, []);

  const getCategoryTheme = (cat: string) => {
    if (cat === 'HOSPITAL') return { color: "#FF3D00", icon: Activity };
    if (cat === 'PHARMACY') return { color: '#FFB300', icon: Zap };
    return { color: DESIGN.primary, icon: Shield };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* TOP DASHBOARD (NATIVE) */}
      <BlurView intensity={30} tint="dark" style={styles.topDashboard}>
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
      </BlurView>
      
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={TACTICAL_MAP_STYLE}
        showsUserLocation
        showsCompass={false}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {assets.filter(a => 
          (activeLayers.medical && (a.category === 'HOSPITAL' || a.category === 'PHARMACY')) ||
          (activeLayers.logistics && a.category === 'RESOURCE')
        ).map(asset => {
          const theme = getCategoryTheme(asset.category);
          return (
            <Marker key={asset.id} coordinate={{ latitude: asset.lat, longitude: asset.lng }} onPress={() => handleAssetSelect(asset)} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={[styles.markerContainer, { borderColor: theme.color }]}><View style={[styles.markerCore, { backgroundColor: theme.color }]} /></View>
            </Marker>
          );
        })}

        {activeLayers.units && nodes.map(node => (
          <Marker
            key={node.id}
            coordinate={{ 
              latitude: (location?.coords.latitude || 28.6139) + (node.y - 50) * 0.0005, 
              longitude: (location?.coords.longitude || 77.2090) + (node.x - 50) * 0.0005 
            }}
          >
             <View style={styles.unitMarker}>
                <Disc size={12} color="#00E676" />
                <View style={styles.unitLabel}><Text style={styles.unitText}>{node.id}</Text></View>
             </View>
          </Marker>
        ))}
      </MapView>

      {activeLayers.radar && (
        <Animated.View style={[styles.scanLine, { pointerEvents: 'none', transform: [{ translateY: scanLineAnim }] }]}>
          <LinearGradient colors={['transparent', 'rgba(212, 175, 55, 0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}

      <Animated.View style={[styles.topHud, { opacity: fadeAnim }]}>
        <BlurView intensity={40} tint="dark" style={styles.hudBlur}>
           <View style={{ flex: 1 }}>
              <View style={styles.titleRow}><Satellite size={14} color={DESIGN.primary} /><Text style={styles.hudTitle}>SENTINEL OPS CORE 2.0</Text></View>
              <Text style={styles.hudStatus}>{loading ? 'CALIBRATING...' : `SECURE :: ${assets.length} ASSETS_DETECTED`}</Text>
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
          <BlurView intensity={90} tint="dark" style={styles.intelCard}>
            <View style={styles.cardHeader}>
               <View>
                 <Text style={styles.cardCat}>{selectedAsset.category}</Text>
                 <Text style={styles.cardTitle}>{selectedAsset.name}</Text>
                 <Text style={styles.metaText}>OPERATIONAL :: STATUS_STABLE</Text>
               </View>
               <TouchableOpacity onPress={() => Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start(() => setSelectedAsset(null))}>
                 <AlertTriangle size={22} color="#FF3D00" />
               </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.mainAction} onPress={() => Linking.openURL(`tel:${selectedAsset.phone}`)}>
               <Phone size={18} color="#000" />
               <Text style={styles.mainActionText}>INITIATE COMM-LINK</Text>
            </TouchableOpacity>
            <View style={styles.addressBox}>
               <Text style={styles.addressTitle}>DISPATCH LOCATION</Text>
               <Text style={styles.addressText}>{selectedAsset.address}</Text>
            </View>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { ...StyleSheet.absoluteFillObject },
  topDashboard: { position: 'absolute', top: 125, left: 16, right: 16, zIndex: 30, flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statModule: { alignItems: 'center' },
  statHeader: { width: 68, height: 34, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.8)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statValue: { fontFamily: DESIGN.fontBlack, fontSize: 16, letterSpacing: 1 },
  statLabel: { fontFamily: DESIGN.fontBold, color: '#AAA', fontSize: 7, letterSpacing: 1, marginTop: 4 },
  
  scanLine: { position: 'absolute', left: 0, right: 0, height: 100, zIndex: 5 },
  markerContainer: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  markerCore: { width: 8, height: 8, borderRadius: 4 },
  unitMarker: { alignItems: 'center' },
  unitLabel: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  unitText: { fontFamily: DESIGN.fontBold, color: '#00E676', fontSize: 7 },
  topHud: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 20 },
  hudBlur: { flexDirection: 'row', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  hudTitle: { fontFamily: DESIGN.fontBlack, color: '#FFF', fontSize: 13, letterSpacing: 2 },
  hudStatus: { fontFamily: DESIGN.fontMedium, color: DESIGN.primary, fontSize: 9 },
  syncBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  sideHud: { position: 'absolute', right: 16, top: height * 0.32, zIndex: 20, gap: 12 },
  sideBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  intelWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  intelCard: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 48, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardCat: { fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 2 },
  cardTitle: { fontFamily: DESIGN.fontBlack, color: '#FFF', fontSize: 20 },
  metaText: { fontFamily: DESIGN.fontBold, color: '#666', fontSize: 9, marginTop: 4 },
  mainAction: { height: 60, borderRadius: 18, backgroundColor: DESIGN.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 },
  mainActionText: { fontFamily: DESIGN.fontBlack, color: '#000', fontSize: 14, letterSpacing: 1 },
  addressBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 },
  addressTitle: { fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 8, marginBottom: 4 },
  addressText: { fontFamily: DESIGN.fontRegular, color: '#DDD', fontSize: 13 }
});
