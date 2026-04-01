import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Platform, Alert, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  ShieldCheck, Activity, MapPin, Truck, 
  AlertTriangle, Zap, Search, Bell, Globe, 
  FileText, Package, Users, CloudRain, Sun, 
  Navigation, Radio, Phone, Crosshair, Heart,
  Brain, Mic, Wifi, Satellite, Cpu
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { router } from 'expo-router';
import { authAPI, archiveAPI, mapAPI, reconAPI } from '@/Store/api';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// [FOREST/SAGE ELITE HUD - 100% OPERATIONAL]

export default function Dashboard() {
  const [stats, setStats] = useState({ disasters: 0, peers: 0, hospitals: 0, alerts: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>({ temp: '28°C', condition: 'SYNCING...', risk: 'NORMAL', icon: CloudRain });
  const [location, setLocation] = useState<{lat: number, lng: number, address: string}>({ lat: 30.6841, lng: 76.7214, address: "Mohali, Sector 68" });
  const [isOffline, setIsOffline] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Overview');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sosAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }).start();
    
    (async () => {
       await fetchTacticalData();
       await fetchWeather();
    })();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();

    const statsInterval = setInterval(fetchTacticalData, 60000);
    const weatherInterval = setInterval(fetchWeather, 300000); 

    return () => {
      clearInterval(statsInterval);
      clearInterval(weatherInterval);
    };
  }, []);

  const fetchWeather = async () => {
     try {
        const loc = await Location.getCurrentPositionAsync({});
        const res = await mapAPI.getWeather(loc.coords.latitude, loc.coords.longitude);
        if (res.success) {
           setWeather({
              temp: res.temp,
              condition: res.condition,
              risk: res.risk || 'OPTIMAL',
              icon: res.risk === 'STORM_RISK' ? AlertTriangle : (res.condition === 'RAIN' ? CloudRain : Sun)
           });
        }
     } catch (_) { setIsOffline(true); }
  };

  const fetchTacticalData = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = loc.coords;
      
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geocode.length > 0) { setLocation({ lat, lng, address: `${geocode[0].city || 'Sector'}, ${geocode[0].region || 'Dist'}` }); }
      } catch (_) {}

      await mapAPI.updateHeartbeat(lat, lng);
      const [liveRes, statRes] = await Promise.all([
        mapAPI.live(lat, lng),
        mapAPI.getDashboardStats(lat, lng)
      ]);

      if (statRes.success) {
        setStats({
          disasters: statRes.stats.disasters,
          peers: statRes.stats.field_ops,
          hospitals: statRes.stats.medical,
          alerts: statRes.stats.ambulances
        });
      }
      if (liveRes.success) setAlerts(liveRes.layers.disasters);
    } catch (_) { setIsOffline(true); }
  };

  const triggerSOS = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert("CONFIRM CRITICAL SOS", "Broadcasting encrypted signal to responders. Continue?", [
      { text: "CANCEL", style: "cancel" },
      { text: "SEND SIGNAL", style: "destructive", onPress: async () => {
         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
         try {
            const loc = await Location.getCurrentPositionAsync({});
            const res = await mapAPI.triggerSOS(loc.coords.latitude, loc.coords.longitude, 'manual');
            if (res.success) Alert.alert("SOS SENT", `Responder unit ${res.assigned_hospital} deployed. ETA: ${res.responder_eta}`);
         } catch (_) { Alert.alert("OFFLINE SOS", "Mesh relay triggered. Searching for peers..."); }
      }}
    ]);
  };

  const STAT_CARDS = [
    { label: 'DISASTERS', value: stats.disasters.toString().padStart(2, '0'), icon: MapPin, color: '#EF4444', route: '/history' },
    { label: 'PEERS NEARBY', value: stats.peers.toString().padStart(2, '0'), icon: Users, color: '#3B82F6', route: '/community' },
    { label: 'HOSPITALS', value: stats.hospitals.toString().padStart(2, '0'), icon: Heart, color: '#E11D48', route: '/explore' },
    { label: 'ACTIVE ALERTS', value: stats.alerts.toString().padStart(2, '0'), icon: AlertTriangle, color: '#F59E0B', route: '/explore' },
  ];

  return (
    <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={s.container}>
      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />
      <StatusBar barStyle="light-content" />
      
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
              <Text style={s.commandLabel}>STRATEGIC COMMAND · {isOffline ? "OFFLINE" : "LIVE"}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={{ fontFamily: DESIGN.fontSerif, color: '#e9fde2ff', fontSize: 28 }}>NEURIX</Text>
                <Text style={{ fontFamily: DESIGN.fontSerif, color: '#81C784', fontSize: 28 }}>OS</Text>
              </View>
            </View>
            <View style={s.headerIcons}>
              <TouchableOpacity style={s.iconBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Search color="#b7f8dcff" size={20} style={{ opacity: 0.6 }} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/history'); }}>
                <Bell color="#99fdceff" size={20} style={{ opacity: 0.6 }} />
              </TouchableOpacity>
              <TouchableOpacity style={s.sosBtn} onPress={triggerSOS}>
                <Text style={s.sosText}>SOS</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.statusHUD}>
            <View style={s.statusLeft}>
              <Animated.View style={[s.statusDot, { backgroundColor: '#81C784', opacity: pulseAnim }]} />
              <Text style={s.statusLabel}>ENCRYPTED MESH ACTIVE</Text>
            </View>
            <Text style={s.latencyText}>0.4s latency</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* METRICS ROW */}
          <View style={s.metricsRow}>
             <View style={s.hudCard}>
                <Text style={s.hudLabel}>CONDITIONS</Text>
                <Text style={s.weatherTemp}>{weather.temp}</Text>
                <Text style={[s.weatherRisk, { color: weather.risk !== 'OPTIMAL' ? '#E11D48' : '#388E3C' }]}>{weather.risk}</Text>
                <Text style={s.weatherLoc}>{location.address}</Text>
             </View>
             <View style={s.hudCard}>
                <Text style={s.hudLabel}>COORD · NORTH ZONE</Text>
                <Text style={s.gpsText}>{location.lat.toFixed(2)}°N</Text>
                <Text style={s.gpsText}>{location.lng.toFixed(2)}°E</Text>
             </View>
          </View>

          <View style={s.statsGrid}>
             <View style={s.statsRow}>
                {STAT_CARDS.slice(0, 2).map((stat, i) => (
                   <StatPod key={i} count={stat.value} label={stat.label} route={stat.route} />
                ))}
             </View>
             <View style={s.statsRow}>
                {STAT_CARDS.slice(2, 4).map((stat, i) => (
                   <StatPod key={i} count={stat.value} label={stat.label} route={stat.route} />
                ))}
             </View>
          </View>

          {/* RESOURCE & RELIEF NODES */}
          <View style={s.sectionHeader}>
             <Text style={s.sectionTitle}>TACTICAL RESOURCES</Text>
             <Text style={s.viewAll}>Authorized Only</Text>
          </View>

          <View style={s.resourceRow}>
             <ResourcePod label="RESOURCES" icon={Package} color="#3B82F6" route="/resources" />
             <ResourcePod label="RELIEF OPS" icon={Truck} color="#388E3C" route="/relief" />
             <ResourcePod label="MEDICAL" icon={Heart} color="#E11D48" route="/triage" />
          </View>

          {/* NEURAL COMMAND HUB */}
          <TouchableOpacity style={s.hubSection} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/processing'); }}>
             <View style={s.hubCard}>
                <View style={s.hubIconBox}>
                   <Brain color="#FFF" size={24} />
                </View>
                <View style={s.hubContent}>
                   <Text style={s.hubVersion}>INTELLIGENCE SYNTHESIS V4.1</Text>
                   <Text style={s.hubTitle}>Neural Command Hub</Text>
                   <View style={s.tagBadge}>
                      <Text style={s.tagText}>HYBRID AI</Text>
                   </View>
                </View>
             </View>
          </TouchableOpacity>

          {/* ACTION ROW */}
          <View style={s.actionRow}>
             <ActionPod label="UPLOAD PDF" icon={FileText} color="#2A3B2E" route="/report" />
             <ActionPod label="VOICE REPORT" icon={Mic} color="#2A3B2E" route="/chat" />
             <ActionPod label="OP REPLAN" icon={Zap} color="#2A3B2E" route="/recon" />
          </View>

          {/* STATS ROW */}
          <View style={s.statsRow}>
             <StatPod count={stats.disasters} label="DISASTERS" />
             <StatPod count={stats.peers} label="PEERS NEARBY" />
             <StatPod count={stats.alerts} label="ACTIVE ALERTS" />
          </View>

          {/* PILL FILTERS */}
          <View style={s.filterRow}>
             {['Overview', 'Analysis', 'Notes', 'Schedule'].map((f) => (
                <TouchableOpacity key={f} style={[s.pill, activeFilter === f && s.pillActive]} onPress={() => { setActiveFilter(f); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                   <Text style={[s.pillText, activeFilter === f && s.pillTextActive]}>{f}</Text>
                </TouchableOpacity>
             ))}
          </View>

          {/* FEED SECTION */}
          <View style={s.sectionHeader}>
             <Text style={s.sectionTitle}>SATELLITE INTEL FEED</Text>
             <TouchableOpacity onPress={() => router.push('/history')}><Text style={s.viewAll}>View All</Text></TouchableOpacity>
          </View>

          <View style={s.feedList}>
             {alerts.length > 0 ? alerts.map((alert: any, i: number) => (
               <FeedCard key={i} title={alert.type || 'Anomaly Detected'} severity={alert.severity || 'LOW'} />
             )) : (
               <>
                 <FeedCard title="Earthquake Aftershock" severity="MEDIUM" />
                 <FeedCard title="Resource Blackout" severity="HIGH" />
               </>
             )}
          </View>

          {/* TACTICAL OPERATIONS */}
          <View style={s.sectionHeader}>
             <Text style={s.sectionTitle}>TACTICAL OPERATIONS</Text>
             <Text style={s.viewAll}>Select Sector</Text>
          </View>

          <View style={s.opsGrid}>
             <View style={s.opsRow}>
                <OpsSquare label="DEPLOY UNIT" icon={Navigation} color="#3B82F6" dot="#3B82F6" route="/recon" />
                <OpsSquare label="FIELD REPORT" icon={FileText} color="#388E3C" dot="#388E3C" route="/triage" />
             </View>
             <View style={s.opsRow}>
                <OpsSquare label="AAR REPORTS" icon={ShieldCheck} color="#F59E0B" dot="#F59E0B" route="/report" />
                <OpsSquare label="NDMA SOPs" icon={Heart} color="#E11D48" dot="#E11D48" route="/processing" />
             </View>
          </View>

          {/* BOTTOM STATUS */}
          <View style={s.bottomStatus}>
             <ShieldCheck size={14} color="#546E7A" />
             <Text style={s.bottomText}>ENCRYPTED TACTICAL ENVELOPE · SECURE MODE ACTIVE</Text>
          </View>
          
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

function ActionPod({ label, icon: Icon, color, route }: any) {
  return (
    <TouchableOpacity style={s.actionPod} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route); }}>
       <View style={s.actionIconBox}>
          <Icon size={20} color={color} />
       </View>
       <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResourcePod({ label, icon: Icon, color, route }: any) {
  return (
    <TouchableOpacity style={s.resourcePod} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route); }}>
       <Icon size={18} color={color} />
       <Text style={s.resourceLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatPod({ count, label, route }: any) {
  return (
    <TouchableOpacity style={s.statPod} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if(route) router.push(route); }}>
       <Text style={s.statCount}>{count}</Text>
       <Text style={s.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function FeedCard({ title, severity }: any) {
  return (
    <TouchableOpacity style={s.feedCard} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
       <View style={[s.severityBadge, { backgroundColor: severity === 'HIGH' ? '#FEE2E2' : '#FEF3C7' }]}>
          <Text style={[s.severityText, { color: severity === 'HIGH' ? '#E11D48' : '#D97706' }]}>△ {severity}</Text>
       </View>
       <Text style={s.feedTitleText}>{title}</Text>
       <Text style={s.feedDescText}>Magnitude 4.2 anomaly detected. Distance: 15km.</Text>
       <View style={s.feedFooter}>
          <Text style={s.feedTimeText}>SATELLITE FIXED · 2M AGO</Text>
          <Navigation size={14} color="#CFD8DC" />
       </View>
    </TouchableOpacity>
  );
}

function OpsSquare({ label, icon: Icon, color, dot, route }: any) {
  return (
    <TouchableOpacity style={s.opsSquare} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(route); }}>
       <View style={[s.opsPulseDot, { backgroundColor: dot }]} />
       <View style={s.opsIconBg}>
          <Icon size={24} color={color} />
       </View>
       <Text style={s.opsSquareLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF3EF' },
  mainHUD: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // HEADER
  header: { backgroundColor: '#023f11ff', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 24, paddingBottom: 48, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLabel: { fontFamily: DESIGN.fontLabel, color: '#FFF', fontSize: 10, letterSpacing: 1.5, opacity: 0.6 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  commandLabel: { fontFamily: DESIGN.fontLabel, color: '#FFF', fontSize: 10, letterSpacing: 1.5, opacity: 0.6 },
  logoText: { fontFamily: DESIGN.fontSerif, color: '#FFF', fontSize: 28, letterSpacing: 1 },
  sosBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sosText: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 12, opacity: 0.4 },

  statusHUD: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 10, opacity: 0.8 },
  latencyText: { fontFamily: DESIGN.fontMedium, color: '#FFF', fontSize: 10, opacity: 0.4 },

  // HUD CARDS
  metricsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginTop: -16, marginBottom: 28 },
  hudCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 32, padding: 20, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16 },
  hudLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 8, letterSpacing: 1.5, marginBottom: 10 },
  weatherTemp: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 32, lineHeight: 38 },
  weatherRisk: { fontFamily: DESIGN.fontBold, fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  weatherLoc: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 8, marginTop: 4 },
  gpsText: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 18, letterSpacing: 0.5, lineHeight: 24 },

  // HUB
  hubSection: { paddingHorizontal: 20, marginBottom: 32 },
  hubCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 32, padding: 22, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  hubIconBox: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#1E2F23', alignItems: 'center', justifyContent: 'center', marginRight: 18 },
  hubContent: { flex: 1 },
  hubVersion: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7, letterSpacing: 1.2 },
  hubTitle: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 17, marginTop: 2 },
  tagBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#E8F5E9', marginTop: 8 },
  tagText: { fontFamily: DESIGN.fontBold, color: '#388E3C', fontSize: 8 },

  // ACTIONS
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  actionPod: { flex: 1, alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  actionLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7, letterSpacing: 0.8 },
  actionIconBox: { opacity: 0.8 },

  // STATS GRID
  statsGrid: { paddingHorizontal: 20, marginBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statPod: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 22, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  statCount: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 24 },
  statLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7.5, letterSpacing: 1, marginTop: 4 },

  // RESOURCES
  resourceRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 32 },
  resourcePod: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 1 },
  resourceLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#1E2F23', fontSize: 8.5 },

  // FILTERS
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.02)' },
  pillActive: { backgroundColor: '#1E2F23' },
  pillText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 12 },
  pillTextActive: { color: '#FFF' },

  // SECTIONS
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20, marginTop: 12 },
  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 8.5, letterSpacing: 1.5 },
  viewAll: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 9.5 },

  feedList: { paddingHorizontal: 20, gap: 16, marginBottom: 40 },
  feedCard: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  severityBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 14 },
  severityText: { fontFamily: DESIGN.fontBold, fontSize: 8.5, letterSpacing: 1 },
  feedTitleText: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 18, marginBottom: 6 },
  feedDescText: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 12, lineHeight: 18 },
  feedFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  feedTimeText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#CFD8DC', fontSize: 9, letterSpacing: 1 },

  // OPS GRID
  opsGrid: { paddingHorizontal: 20, marginBottom: 60 },
  opsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  opsSquare: { flex: 1, backgroundColor: '#FFF', borderRadius: 32, padding: 24, minHeight: 140, justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  opsPulseDot: { position: 'absolute', top: 20, right: 20, width: 6, height: 6, borderRadius: 3 },
  opsSquareLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 9, letterSpacing: 1, marginTop: 4 },
  opsIconBg: { opacity: 0.9 },

  bottomStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 },
  bottomText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#546E7A', fontSize: 8, letterSpacing: 1.5 },
});
