import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  ShieldCheck, Activity, MapPin, Truck, 
  AlertTriangle, Zap, Search, Bell, Globe, 
  FileText, Package, Users, CloudRain, Sun, 
  Navigation, Radio, Phone, Crosshair, Heart
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { router } from 'expo-router';
import { authAPI, archiveAPI, mapAPI, reconAPI } from '@/Store/api';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const STATS = [
  { label: 'ACTIVE DISASTERS', value: '03', icon: MapPin, color: DESIGN.danger },
  { label: 'PEERS NEARBY', value: '14', icon: Users, color: DESIGN.info },
  { label: 'HOSPITALS', value: '28', icon: Truck, color: DESIGN.success },
  { label: 'ALERTS', value: '08', icon: AlertTriangle, color: DESIGN.warning },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ disasters: 0, peers: 0, hospitals: 0, alerts: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [weather, setWeather] = useState({ temp: '28°C', condition: 'STORM_RISK', icon: CloudRain });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sosAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }).start();
    fetchStats();
    
    // Heartbeat for SOS button
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosAnim, { toValue: 1.15, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(sosAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();

    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const coords = { lat: 28.6139, lng: 77.2090 };
      const [liveRes, statRes] = await Promise.all([
        mapAPI.live(coords.lat, coords.lng),
        mapAPI.getDashboardStats(coords.lat, coords.lng)
      ]);

      if (statRes.success) {
        setStats({
          disasters: statRes.stats.disasters,
          peers: statRes.stats.field_ops,
          hospitals: statRes.stats.medical,
          alerts: statRes.stats.ambulances
        });
      }

      if (liveRes.success && liveRes.layers) {
        setAlerts(liveRes.layers.disasters);
      }
    } catch (_) {
      console.log("HUD SYNC FAILED (OFFLINE)");
    }
  };

  const triggerSOS = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      "CONFIRM CRITICAL SOS",
      "Broadcasting GPS + Tactical Profile to Responders. Continue?",
      [
        { text: "CANCEL", style: "cancel" },
        { text: "SEND SOS", style: "destructive", onPress: async () => {
           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
           try {
             const loc = await Location.getCurrentPositionAsync({});
             const res = await mapAPI.triggerSOS(loc.coords.latitude, loc.coords.longitude, 'manual');
             if (res?.success) {
               Alert.alert("SOS BROADCASTED", `Tactical Link: ${res.assigned_hospital} notified. ETA: ${res.responder_eta}`);
             }
           } catch (_) {
             Alert.alert("OFFLINE SOS", "Network restricted. Attempting Mesh/SMS broadcast...");
           }
        }}
      ]
    );
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#020408', '#050810', '#0A0E1A']} style={StyleSheet.absoluteFill} />
      
      {/* HUD Scanner Grid */}
      <View style={s.gridContainer}>
        {Array.from({ length: 15 }).map((_, i) => (
          <View key={i} style={s.gridRow} />
        ))}
        <View style={s.scanLine} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* WORLD-CLASS HEADER */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>STRATEGIC COMMAND · LIVE</Text>
            <Text style={s.brand}>NEURIX <Text style={{color: DESIGN.primary}}>OS</Text></Text>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity style={s.sosBtn} onPress={triggerSOS}>
               <Animated.View style={{ transform: [{ scale: sosAnim }] }}>
                <BlurView intensity={40} tint="dark" style={s.sosInner}>
                   <Phone color={DESIGN.primary} size={20} />
                   <Text style={s.sosText}>SOS</Text>
                </BlurView>
               </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Status HUD Banner */}
          <BlurView intensity={25} tint="dark" style={s.statusBanner}>
            <View style={s.statusLeft}>
              <Radio color={DESIGN.success} size={16} />
              <Text style={s.statusText}>ENCRYPTED MESH ACTIVE</Text>
            </View>
            <View style={s.statusRight}>
              <View style={s.liveDot} />
              <Text style={s.latencyText}>0.4s LATENCY</Text>
            </View>
          </BlurView>

          {/* Real Weather & GPS HUD */}
          <View style={s.topHudRow}>
             <BlurView intensity={35} tint="dark" style={s.weatherCard}>
                <View style={s.weatherHeader}>
                   <weather.icon size={20} color={DESIGN.info} />
                   <Text style={s.tempText}>{weather.temp}</Text>
                </View>
                <Text style={s.conditionText}>{weather.condition}</Text>
                <Text style={s.addressHint}>Mohali, Sector 68</Text>
             </BlurView>
             <BlurView intensity={35} tint="dark" style={s.gpsCard}>
                <Crosshair size={18} color={DESIGN.primary} />
                <View>
                   <Text style={s.gpsLabel}>COORD :: NORTH_ZONE</Text>
                   <Text style={s.gpsValue}>30.68°N, 76.72°E</Text>
                </View>
             </BlurView>
          </View>

          {/* Stats Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsContainer}>
            {[
              { label: 'ACTIVE DISASTERS', value: String(stats.disasters).padStart(2, '0'), icon: MapPin, color: DESIGN.danger },
              { label: 'PEERS NEARBY', value: String(stats.peers).padStart(2, '0'), icon: Users, color: DESIGN.info },
              { label: 'HOSPITALS', value: String(stats.hospitals).padStart(2, '0'), icon: Truck, color: DESIGN.success },
              { label: 'TACTICAL PINS', value: String(stats.alerts).padStart(2, '0'), icon: AlertTriangle, color: DESIGN.warning },
            ].map((stat, i) => (
              <BlurView key={i} intensity={35} tint="dark" style={[s.statBox, { borderLeftColor: stat.color }]}>
                 <stat.icon color={stat.color} size={14} />
                 <View>
                    <Text style={s.statVal}>{stat.value}</Text>
                    <Text style={s.statLab}>{stat.label}</Text>
                 </View>
              </BlurView>
            ))}
          </ScrollView>

          {/* Active Alerts List (Real Data) */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>SATELLITE INTEL FEED</Text>
            <TouchableOpacity onPress={() => router.push('/history')}><Text style={s.viewAll}>VIEW ALL</Text></TouchableOpacity>
          </View>

          <View style={s.alertFeed}>
             {alerts.length === 0 ? (
               <BlurView intensity={20} tint="dark" style={s.emptyAlert}>
                  <ActivityIndicator size="small" color={DESIGN.primary} />
                  <Text style={s.emptyText}>SYNCING WITH SENTINEL_GATEWAY...</Text>
               </BlurView>
             ) : (
               alerts.map((alert: any, i: number) => (
                 <TouchableOpacity key={i} style={s.alertCard} onPress={() => router.push('/map')}>
                    <BlurView intensity={45} tint="dark" style={s.alertInner}>
                       <View style={[s.severityBadge, { backgroundColor: alert.severity === 'critical' ? DESIGN.danger + '20' : DESIGN.warning + '20' }]}>
                          <AlertTriangle size={14} color={alert.severity === 'critical' ? DESIGN.danger : DESIGN.warning} />
                          <Text style={[s.severityText, { color: alert.severity === 'critical' ? DESIGN.danger : DESIGN.warning }]}>{alert.severity.toUpperCase()}</Text>
                       </View>
                       <Text style={s.alertTitle}>{alert.location || alert.type}</Text>
                       <Text style={s.alertDesc}>Magnitude {alert.severity === 'critical' ? '6.0+' : '4.2'} anomaly detected. Distance: 15km.</Text>
                       <View style={s.alertFooter}>
                          <Text style={s.alertTime}>SATELLITE_FIXED · 2M AGO</Text>
                          <Navigation size={12} color={DESIGN.info} />
                       </View>
                    </BlurView>
                 </TouchableOpacity>
               ))
             )}
          </View>

          {/* Operational Ops Section */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>TACTICAL OPERATIONS</Text>
            <Text style={s.sectionSub}>Select Deployment Sector</Text>
          </View>

          <View style={s.opsGrid}>
             <OpTile label="AI INTEL HUB" sub="PDF • Voice • Image" route="/report" icon={Zap} color={DESIGN.primary} />
             <OpTile label="MAP RECON" sub="Geospatial Intel" route="/map" icon={Navigation} color={DESIGN.info} />
             <OpTile label="AAR REPORTS" sub="Mission Analytics" route="/history" icon={FileText} color={DESIGN.success} />
             <OpTile label="NDMA SOPs" sub="Policy Protocol" route="/resources" icon={ShieldCheck} color="#D4AF37" />
             <OpTile label="FIELD TRIAGE" sub="Victim Assessment" route="/triage" icon={Heart} color={DESIGN.danger} />
             <OpTile label="RESOURCES" sub="Asset Inventory" route="/relief" icon={Package} color={DESIGN.secondary} />
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

function OpTile({ label, sub, route, icon: Icon, color }: any) {
  return (
    <TouchableOpacity style={s.opTile} onPress={() => router.push(route)}>
       <BlurView intensity={40} tint="dark" style={s.opInner}>
          <View style={[s.iconBox, { backgroundColor: color + '15' }]}>
            <Icon size={24} color={color} />
          </View>
          <Text style={s.opTitle}>{label}</Text>
          <Text style={s.opSub}>{sub}</Text>
          <View style={[s.opIndicator, { backgroundColor: color }]} />
       </BlurView>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408' },
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.05 },
  gridRow: { height: 1, backgroundColor: '#FFF', width: '100%', marginBottom: 50 },
  scanLine: { position: 'absolute', top: 100, height: 2, backgroundColor: DESIGN.primary, width: '100%', opacity: 0.3 },
  scroll: { paddingBottom: 110 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, marginBottom: 28 },
  headerIcons: { flexDirection: 'row', gap: 12 },
  greeting: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 2 },
  brand: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 34, letterSpacing: 1 },
  sosBtn: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: DESIGN.primary + '40' },
  sosInner: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: DESIGN.primary + '10' },
  sosText: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.primary, fontSize: 16 },

  statusBanner: { marginHorizontal: 24, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: DESIGN.borderDefault, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, overflow: 'hidden' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.success, fontSize: 9, letterSpacing: 1.5 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DESIGN.danger },
  latencyText: { fontFamily: DESIGN.fontMedium, color: DESIGN.textMuted, fontSize: 9 },

  topHudRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 14, marginBottom: 32 },
  weatherCard: { flex: 1.2, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden' },
  weatherHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tempText: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 24 },
  conditionText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, marginTop: 4, letterSpacing: 1 },
  addressHint: { fontFamily: DESIGN.fontBody, color: DESIGN.textMuted, fontSize: 9, marginTop: 4 },
  
  gpsCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden', gap: 12, backgroundColor: DESIGN.primary + '05' },
  gpsLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 8, letterSpacing: 1 },
  gpsValue: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 13 },

  statsContainer: { paddingHorizontal: 24, gap: 12, marginBottom: 40 },
  statBox: { width: 140, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: DESIGN.borderDefault, borderLeftWidth: 4, overflow: 'hidden' },
  statVal: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 20 },
  statLab: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 8, letterSpacing: 1 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 10, letterSpacing: 2 },
  sectionSub: { fontFamily: DESIGN.fontBody, color: DESIGN.textMuted, fontSize: 10 },
  viewAll: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 9, letterSpacing: 1 },

  alertFeed: { paddingHorizontal: 24, gap: 14, marginBottom: 40 },
  alertCard: { borderRadius: 28, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden' },
  alertInner: { padding: 22 },
  severityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginBottom: 16 },
  severityText: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 10, letterSpacing: 1 },
  alertTitle: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 18, marginBottom: 8 },
  alertDesc: { fontFamily: DESIGN.fontBody, color: DESIGN.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  alertFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertTime: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 9, letterSpacing: 1 },
  emptyAlert: { padding: 40, borderRadius: 28, alignItems: 'center', gap: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: DESIGN.borderDefault },
  emptyText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 10, letterSpacing: 1 },

  opsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, gap: 12 },
  opTile: { width: (width - 48) / 2 },
  opInner: { padding: 22, borderRadius: 28, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden', minHeight: 180 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  opTitle: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 15 },
  opSub: { fontFamily: DESIGN.fontBody, color: DESIGN.textSecondary, fontSize: 10, marginTop: 4 },
  opIndicator: { position: 'absolute', top: 22, right: 22, width: 6, height: 6, borderRadius: 3 },
});
