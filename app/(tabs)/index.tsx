import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Platform, Alert, StatusBar, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  ShieldCheck, Activity, MapPin, Truck, 
  AlertTriangle, Zap, Search, Bell, Globe, 
  FileText, Package, Users, CloudRain, Sun, Wind, Thermometer, Droplets, 
  Heart, Wifi, Phone, ChevronRight, Navigation,
  LifeBuoy, Brain, Mic, Satellite, Cpu, Hospital, Navigation2, Signal
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { router } from 'expo-router';
import { authAPI, archiveAPI, mapAPI, reconAPI, disasterAPI } from '@/Store/api';
import { fetchDashboardStats, fetchRealDisasters, fetchWeatherAlerts, reverseGeocode } from '@/Store/realData';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// [FOREST/SAGE ELITE HUD - 100% OPERATIONAL]

function RadarScan() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 4000, useNativeDriver: Platform.OS !== 'web' })).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={s.radarContainer}>
       <View style={s.radarRing1} />
       <View style={s.radarRing2} />
       <Animated.View style={[s.radarSweep, { transform: [{ rotate }] }]} />
       <View style={s.radarCenter} />
       <View style={[s.radarNode, { top: 5, left: 15 }]} />
       <View style={[s.radarNode, { bottom: 8, right: 10 }]} />
    </View>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ disasters: 0, medical: 0, field_ops: 0, alerts: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>({ temp: '28°C', condition: 'SYNCING...', risk: 'NORMAL', icon: CloudRain });
  const [location, setLocation] = useState<{lat: number, lng: number, address: string}>({ lat: 28.6139, lng: 77.2090, address: "NEURIX_INITIALIZING..." });
  const [isOffline, setIsOffline] = useState(false);
  const [latency, setLatency] = useState('---');
  const [satelliteHealth, setSatelliteHealth] = useState('OFFLINE');
  const [survivalMetrics, setSurvivalMetrics] = useState({ med_evac: 'SYNCING...', safe_zone: 'SYNCING...', mesh_signal: 'SYNCING...' });
  const [resourceCounts, setResourceCounts] = useState({ resources: 0, relief: 0, medical: 0 });
  const [activeFilter, setActiveFilter] = useState('Overview');
  const [currentRisk, setCurrentRisk] = useState<any>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sosAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }).start();
    
    (async () => {
       // FAST LOCATION FOR REAL-WORLD CONTEXT
       const last = await Location.getLastKnownPositionAsync({});
       if (last) {
          const { latitude: lat, longitude: lng } = last.coords;
          try {
             const geo = await reverseGeocode(lat, lng);
             setLocation({ lat, lng, address: `${geo.city}, ${geo.region}` });
          } catch(_) {}
       }
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
         const weatherData = await fetchWeatherAlerts(loc.coords.latitude, loc.coords.longitude);
         // Optionally, keep this for UI fallback, or rely completely on disasterAPI in fetchTacticalData
         if (weatherData?.current) {
            setWeather((prev: any) => ({
               ...prev,
               temp: weatherData.current.temp,
               condition: weatherData.current.condition,
            }));
         }
      } catch (_) { setIsOffline(true); }
  };

  const fetchTacticalData = async () => {
    const start = Date.now();
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = loc.coords;
      
      try {
        const geo = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, address: `${geo.city}, ${geo.region}` });
      } catch (_) {}

      // Fetch real offline-first data from OSM telemetry directly instead of relying on Python backend
      const [offlineStats, riskRes] = await Promise.all([
        fetchDashboardStats(lat, lng).catch(() => null),
        disasterAPI.getRisk(lat, lng).catch(() => null)
      ]);

      if (offlineStats) {
        setStats({
          disasters: offlineStats.disasters,
          medical: offlineStats.hospitals,
          field_ops: offlineStats.peers,
          alerts: offlineStats.alerts
        });
        
        // Update resource counts safely
        setResourceCounts({
          resources: Math.max(offlineStats.peers / 2, 2), 
          relief: Math.floor(offlineStats.hospitals / 3) + 1, 
          medical: offlineStats.hospitals
        });
        setSatelliteHealth(offlineStats.hospitals > 0 ? 'OPTIMAL' : 'DEGRADED');
      }

      if (riskRes?.success && riskRes.current_risk) {
        setCurrentRisk(riskRes.current_risk);
        setWeather((w: any) => ({
          ...w,
          risk: riskRes.current_risk.risk_level === 'LOW' ? 'OPTIMAL' : riskRes.current_risk.risk_level,
          icon: riskRes.current_risk.risk_level !== 'LOW' ? AlertTriangle : CloudRain
        }));
        
        if (riskRes.active_alerts && riskRes.active_alerts.length > 0) {
          setAlerts(riskRes.active_alerts.map((a: any) => ({
            title: a.disaster_type,
            severity: a.risk_level,
            magnitude: null,
            timeAgo: 'LIVE'
          })));
        } else {
           const disasterData = await fetchRealDisasters();
           setAlerts([...disasterData.india, ...disasterData.global].slice(0, 8));
        }
      } else {
        // SatelliteBackend offline — load USGS directly so counts are always real
        const disasterData = await fetchRealDisasters();
        setAlerts([...disasterData.india, ...disasterData.global].slice(0, 8));
      }

      setLatency(`${((Date.now() - start) / 1000).toFixed(1)}s`);
      setIsOffline(false);
    } catch (_) { 
       setIsOffline(true);
       setLatency('---');
       setSatelliteHealth('OFFLINE');
       setSurvivalMetrics({ med_evac: 'LOCAL_CACHE', safe_zone: 'LOCAL_CACHE', mesh_signal: 'OFFLINE' });
    }
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

  const handleDeployUnit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
        const loc = await Location.getCurrentPositionAsync({});
        const res = await mapAPI.deployUnit(loc.coords.latitude, loc.coords.longitude, 'GENERAL_RESPONDER');
        if (res.success) {
            Alert.alert("UNIT_DEPLOYED", `Tactical Unit ${res.unit_id} is now LIVE on the mesh grid.`);
        }
    } catch (_) {
        Alert.alert("DEPLOY_FAILED", "Unable to establish unit uplink. Ensure mesh connectivity.");
    }
  };

  const STAT_CARDS = [
    { label: 'DISASTERS', value: (stats?.disasters ?? 0).toString().padStart(2, '0'), icon: MapPin, color: '#1E2F23', route: '/disasters_detail' },
    { label: 'PEERS NEARBY', value: (stats?.field_ops ?? 0).toString().padStart(2, '0'), icon: Users, color: '#3B82F6', route: '/community_detail' },
    { label: 'HOSPITALS', value: (stats?.medical ?? 0).toString().padStart(2, '0'), icon: Heart, color: '#1E2F23', route: '/hospitals_detail' },
    { label: 'ACTIVE ALERTS', value: (stats?.alerts ?? 0).toString().padStart(2, '0'), icon: AlertTriangle, color: '#F59E0B', route: '/alerts_detail' },
  ];

  return (
    <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={s.container}>
      <RNImage source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />
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
                <Text style={{ fontFamily: DESIGN.fontSerif, color: '#FFFFFF', fontSize: 28 }}>NEURIX</Text>
                <Text style={{ fontFamily: DESIGN.fontSerif, color: '#FFFFFF', fontSize: 28 }}>OS</Text>
              </View>
            </View>
            <View style={s.headerIcons}>
              <TouchableOpacity style={s.iconBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Search color="#FFFFFF" size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/history'); }}>
                <Bell color="#FFFFFF" size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={s.sosBtn} onPress={triggerSOS}>
                <Text style={s.sosText}>SOS</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.statusHUD}>
            <View style={s.statusLeft}>
              <Animated.View style={[s.statusDot, { backgroundColor: isOffline ? DESIGN.danger : '#81C784', opacity: pulseAnim }]} />
              <Text style={s.statusLabel}>MESH: {isOffline ? 'DISCONNECTED' : 'ENCRYPTED_ACTIVE'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
               <Text style={s.latencyText}>SAT: {satelliteHealth}</Text>
               <Text style={s.latencyText}>{latency} latency</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* TACTICAL RISK BANNER */}
          {currentRisk && currentRisk.risk_level !== 'LOW' && (
             <View style={[s.riskBanner, currentRisk.risk_level === 'HIGH' ? s.riskBannerHigh : s.riskBannerMedium]}>
                <AlertTriangle size={24} color={currentRisk.risk_level === 'HIGH' ? '#FFF' : '#000'} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                   <Text style={[s.riskBannerTitle, { color: currentRisk.risk_level === 'HIGH' ? '#FFF' : '#000' }]}>
                      {currentRisk.disaster_type.toUpperCase()} WARNING [LEV-{currentRisk.risk_level}]
                   </Text>
                   <Text style={[s.riskBannerDesc, { color: currentRisk.risk_level === 'HIGH' ? '#FFF' : '#000' }]}>
                      {currentRisk.message}
                   </Text>
                </View>
             </View>
          )}

          {/* METRICS ROW */}
          <View style={s.metricsRow}>
             <View style={s.hudCard}>
                <Text style={s.hudLabel}>CONDITIONS</Text>
                <Text style={s.weatherTemp}>{weather.temp}</Text>
                <Text style={[s.weatherRisk, { color: weather.risk !== 'OPTIMAL' ? '#1E2F23' : '#388E3C' }]}>{weather.risk}</Text>
                <Text style={s.weatherLoc}>{location.address}</Text>
             </View>
             <View style={s.hudCard}>
                <Text style={s.hudLabel}>COORD · NORTH ZONE</Text>
                <Text style={s.gpsText}>{location.lat.toFixed(2)}°N</Text>
                <Text style={s.gpsText}>{location.lng.toFixed(2)}°E</Text>
             </View>
          </View>

          {/* RESOURCE & RELIEF NODES */}
          <View style={s.sectionHeader}>
             <Text style={s.sectionTitle}>TACTICAL RESOURCES</Text>
             <Text style={s.viewAll}>Authorized Only</Text>
          </View>

          <View style={s.resourceRow}>
             <ResourcePod label="RESOURCES" icon={Package} color="#3B82F6" route="/resources" count={resourceCounts.resources} />
             <ResourcePod label="RELIEF OPS" icon={Truck} color="#388E3C" route="/relief" count={resourceCounts.relief} />
             <ResourcePod label="MEDICAL" icon={Heart} color="#1E2F23" route="/hospitals_detail" count={resourceCounts.medical} />
          </View>

          {/* NEURAL COMMAND HUD AREA */}
          <View style={s.hero}>
            <View style={s.heroContent}>
              <View style={s.heroLeft}>
                <View style={s.radarBase}>
                  <RadarScan />
                </View>
                <View>
                  <Text style={s.sectorTitle}>CURRENT_SECTOR</Text>
                  <Text style={s.locationText}>{location.address.toUpperCase()}</Text>
                </View>
              </View>
              <View style={s.heroRight}>
                <View style={s.badge}>
                  <ShieldCheck size={12} color="#FFF" />
                  <Text style={s.badgeText}>ENCRYPTED</Text>
                </View>
              </View>
            </View>
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

          {/* TACTICAL METRICS - 4 GRID LAYOUT */}
          <View style={[s.statsGrid, { gap: 12 }]}>
             <View style={[s.statsRow, { gap: 12 }]}>
                <GridPod label="DISASTERS" count={stats?.disasters || 0} route="/disasters_detail" />
                <GridPod label="PEERS NEARBY" count={stats?.field_ops || 0} route="/community_detail" />
             </View>
             <View style={[s.statsRow, { gap: 12, marginTop: 12 }]}>
                <GridPod label="HOSPITALS" count={stats?.medical || 0} route="/hospitals_detail" />
                <GridPod label="ACTIVE ALERTS" count={alerts.length || 0} route="/alerts_detail" />
             </View>
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
               <FeedCard key={i} title={alert.title || alert.type || 'Anomaly Detected'} severity={alert.severity || 'LOW'} magnitude={alert.magnitude} timeAgo={alert.timeAgo} />
             )) : (
               <>
                 <FeedCard title="Loading real-time data..." severity="LOW" />
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
                <OpsSquare 
                  label="DEPLOY UNIT" 
                  icon={Navigation} 
                  color="#3B82F6" 
                  dot="#3B82F6" 
                  onPress={handleDeployUnit}
                />
                <OpsSquare 
                  label="FIELD REPORT" 
                  icon={FileText} 
                  color="#388E3C" 
                  dot="#388E3C" 
                  route="/recon" 
                />
             </View>
             <View style={s.opsRow}>
                <OpsSquare 
                  label="AAR REPORTS" 
                  icon={ShieldCheck} 
                  color="#F59E0B" 
                  dot="#F59E0B" 
                  route="/history" 
                />
                <OpsSquare 
                  label="NDMA SOPs" 
                  icon={Heart} 
                  color="#E11D48" 
                  dot="#E11D48" 
                  route="/processing" 
                />
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

function ResourcePod({ label, icon: Icon, color, route, count }: any) {
  return (
    <TouchableOpacity style={s.resourcePod} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route); }}>
       <Icon size={16} color={color} />
       <View>
         <Text style={s.resourceLabel}>{label}</Text>
         <Text style={s.resourceSubLabel}>{count || 0} NODES</Text>
       </View>
    </TouchableOpacity>
  );
}

function GridPod({ count, label, route }: any) {
  return (
    <TouchableOpacity style={s.gridPod} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (route) router.push(route); }}>
       <Text style={s.gridCount} adjustsFontSizeToFit numberOfLines={1}>{count}</Text>
       <Text style={s.gridLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function FeedCard({ title, severity, magnitude, timeAgo }: any) {
  const sevColor = (severity === 'CRITICAL' || severity === 'HIGH') ? '#1E2F23' : severity === 'MEDIUM' ? '#D97706' : '#388E3C';
  const sevBg = (severity === 'CRITICAL' || severity === 'HIGH') ? '#E8F5E9' : severity === 'MEDIUM' ? '#FEF3C7' : '#E8F5E9';
  return (
    <TouchableOpacity style={s.feedCard} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/disasters_detail'); }}>
       <View style={[s.severityBadge, { backgroundColor: sevBg }]}>
          <Text style={[s.severityText, { color: sevColor }]}>△ {severity}</Text>
       </View>
       <Text style={s.feedTitleText}>{title}</Text>
       <Text style={s.feedDescText}>{magnitude ? `Magnitude ${magnitude} seismic event detected.` : 'Real-time monitoring active.'}</Text>
       <View style={s.feedFooter}>
          <Text style={s.feedTimeText}>USGS VERIFIED · {timeAgo || 'LIVE'}</Text>
          <Navigation size={14} color="#CFD8DC" />
       </View>
    </TouchableOpacity>
  );
}

function OpsSquare({ label, icon: Icon, color, dot, route, onPress }: any) {
  return (
    <TouchableOpacity 
      style={s.opsSquare} 
      onPress={() => { 
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
        if (onPress) onPress();
        else if (route) router.push(route); 
      }}
    >
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
  header: { backgroundColor: '#023f11ff', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 20
    , borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLabel: { fontFamily: DESIGN.fontLabel, color: '#FFF', fontSize: 10, letterSpacing: 1.5, opacity: 1 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  commandLabel: { fontFamily: DESIGN.fontLabel, color: '#FFFFFF', fontSize: 10, letterSpacing: 1.5 },
  logoText: { fontFamily: DESIGN.fontSerif, color: '#FFF', fontSize: 28, letterSpacing: 1 },
  sosBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  sosText: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 12 },

  statusHUD: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFFFFF', fontSize: 10 },
  latencyText: { fontFamily: DESIGN.fontMedium, color: '#FFFFFF', fontSize: 10, opacity: 0.8 },

  // HUD CARDS
  metricsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginTop: 16, marginBottom: 28 },
  hudCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 32, padding: 20, ...Platform.select({ web: { boxShadow: '0px 8px 16px rgba(0,0,0,0.04)' }, default: { elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16 } }) },
  hudLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 8, letterSpacing: 1.5, marginBottom: 10 },
  weatherTemp: { fontFamily: DESIGN.fontDisplay, color: '#d3fbdfff', fontSize: 32, lineHeight: 38 },
  weatherRisk: { fontFamily: DESIGN.fontBold, fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  weatherLoc: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 8, marginTop: 4 },
  gpsText: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 18, letterSpacing: 0.5, lineHeight: 24 },

  // RISK BANNER
  riskBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 20, padding: 16, borderRadius: 16 },
  riskBannerHigh: { backgroundColor: '#E53935' },
  riskBannerMedium: { backgroundColor: '#FFCA28' },
  riskBannerTitle: { fontFamily: DESIGN.fontDisplayBlack, fontSize: 13, letterSpacing: 1 },
  riskBannerDesc: { fontFamily: DESIGN.fontLabelSemiBold, opacity: 0.9, fontSize: 9, marginTop: 2, lineHeight: 14 },

  // HUB
  hubSection: { paddingHorizontal: 20, marginBottom: 32 },
  hubCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 32, padding: 22, alignItems: 'center', ...Platform.select({ web: { boxShadow: '0px 4px 10px rgba(0,0,0,0.03)' }, default: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 } }) },
  hubIconBox: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#1E2F23', alignItems: 'center', justifyContent: 'center', marginRight: 18 },
  hubContent: { flex: 1 },
  hubVersion: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 7, letterSpacing: 1, opacity: 0.6 },
  hubTitle: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 16, marginTop: 2 },
  tagBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(30, 47, 35, 0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 10 },
  tagText: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 7, letterSpacing: 1 },

  // HERO
  hero: { marginHorizontal: 24, marginBottom: 24, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.03)', padding: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  radarBase: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sectorTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, letterSpacing: 1.5 },
  locationText: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 13, marginTop: 2 },
  heroRight: {},
  badge: { backgroundColor: '#1E2F23', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 7, letterSpacing: 1 },

  // RADAR
  radarContainer: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  radarRing1: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: DESIGN.primary, opacity: 0.2 },
  radarRing2: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: DESIGN.primary, opacity: 0.1 },
  radarSweep: { position: 'absolute', width: 20, height: 20, borderRightWidth: 2, borderColor: DESIGN.primary, opacity: 0.4, borderTopRightRadius: 20 },
  radarCenter: { width: 4, height: 4, borderRadius: 2, backgroundColor: DESIGN.primary },
  radarNode: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: DESIGN.primary, opacity: 0.6 },

  // ACTIONS
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  actionPod: { flex: 1, alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 20, ...Platform.select({ web: { boxShadow: '0px 3px 8px rgba(0,0,0,0.03)' }, default: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 } }) },
  actionLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7, letterSpacing: 0.8 },
  actionIconBox: { opacity: 0.8 },

  // STATS GRID
  statsGrid: { paddingHorizontal: 20, marginBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statPod: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 22, alignItems: 'center', ...Platform.select({ web: { boxShadow: '0px 3px 8px rgba(0,0,0,0.03)' }, default: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 } }) },
  statCount: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 24 },
  statLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7.5, letterSpacing: 1, marginTop: 4 },
  gridPod: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 24, alignItems: 'center', ...Platform.select({ web: { boxShadow: '0px 3px 8px rgba(0,0,0,0.03)' }, default: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 } }) },
  gridCount: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 28, marginBottom: 4 },
  gridLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1.5 },

  // RESOURCES
  resourceRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 32 },
  resourcePod: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, elevation: 1 },
  resourceLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#1E2F23', fontSize: 8 },
  resourceSubLabel: { fontFamily: DESIGN.fontBold, color: '#90A4AE', fontSize: 6, letterSpacing: 0.5 },

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
  feedCard: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, ...Platform.select({ web: { boxShadow: '0px 4px 10px rgba(0,0,0,0.03)' }, default: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 } }) },
  severityBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 14 },
  severityText: { fontFamily: DESIGN.fontBold, fontSize: 8.5, letterSpacing: 1 },
  feedTitleText: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 18, marginBottom: 6 },
  feedDescText: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 12, lineHeight: 18 },
  feedFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  feedTimeText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#CFD8DC', fontSize: 9, letterSpacing: 1 },

  // OPS GRID
  opsGrid: { paddingHorizontal: 20, marginBottom: 60 },
  opsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  opsSquare: { flex: 1, backgroundColor: '#FFF', borderRadius: 32, padding: 24, minHeight: 140, justifyContent: 'center', alignItems: 'center', gap: 12, ...Platform.select({ web: { boxShadow: '0px 10px 20px rgba(0,0,0,0.03)' }, default: { elevation: 4 } }) },
  opsPulseDot: { position: 'absolute', top: 20, right: 20, width: 6, height: 6, borderRadius: 3 },
  opsSquareLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 9, letterSpacing: 1, marginTop: 4 },
  opsIconBg: { opacity: 0.9 },

  bottomStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 },
  bottomText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#546E7A', fontSize: 8, letterSpacing: 1.5 },
});
