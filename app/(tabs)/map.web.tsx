import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import {
  AlertTriangle, Navigation, MapPin, Zap, Radio, LayoutDashboard, Globe, Clock, ShieldAlert, X,
  LocateFixed, RefreshCw, Hospital, Truck, Activity, Bell, Map, Users, Target, TargetIcon, Droplets
} from 'lucide-react-native';

import { mapAPI, opsAPI } from '@/Store/api';
import { DESIGN } from '@/constants/design';

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#05070A',
  card: 'rgba(12, 16, 26, 0.85)',
  border: 'rgba(255,255,255,0.06)',
  text: '#FFF',
  muted: '#7A8498',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  green: '#22c55e',
  yellow: '#EAB308',
  purple: '#A855F7',
};

export default function DisasterCommandCenter() {
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('Sector 78, Mohali');
  const [lastSync, setLastSync] = useState(0);
  
  // HUD Data
  const [disasters, setDisasters] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [temperature, setTemperature] = useState<string>('--');

  // Tactical Actions State
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [isDispatchingRed, setIsDispatchingRed] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Render Map Scaling
  const MAP_SCALE = 3000;
  const getPosition = (targetLat: number, targetLng: number) => {
    if (!myLocation) return { left: 0, top: 0 };
    const dx = (targetLng - myLocation.longitude) * 111; 
    const dy = (targetLat - myLocation.latitude) * 111;
    return {
      left: (width / 2) + (dx * MAP_SCALE),
      top: (height / 2) - (dy * MAP_SCALE),
    };
  };

  useEffect(() => {
    setupLocation();
    
    // Animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 2000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: Platform.OS !== 'web' })
      ])
    ).start();
    
    Animated.loop(
      Animated.timing(radarAnim, { toValue: 1, duration: 8000, useNativeDriver: false })
    ).start();

    const tTimer = setInterval(() => setLastSync(prev => prev + 1), 1000);
    return () => clearInterval(tTimer);
  }, []);

  const setupLocation = async () => {
    setLoading(true);
    let coords = { latitude: 30.7333, longitude: 76.7794 }; // Chandigarh/Mohali Center Hub
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
         const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
         coords = loc.coords;
      }
    } catch (_) {}
    setMyLocation(coords);
    await syncBackend(coords.latitude, coords.longitude);
    setLoading(false);
  };

  const syncBackend = async (lat: number, lng: number) => {
    setIsSyncing(true);
    try {
      // 1. Fetch Real USGS Earthquake Data
      let usgsDisasters: any[] = [];
      try {
         const usgsRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
         const usgsData = await usgsRes.json();
         // Filter for South Asia / India bounds roughly
         const indiaEqs = usgsData.features.filter((f: any) => {
            const [elon, elat] = f.geometry.coordinates;
            return elat >= 5.0 && elat <= 40.0 && elon >= 65.0 && elon <= 100.0;
         }).slice(0, 5); // Take top 5 recent
         
         usgsDisasters = indiaEqs.map((eq: any) => ({
            id: eq.id,
            title: eq.properties.place.split(' of ').pop(),
            type: 'Earthquake',
            severity: eq.properties.mag >= 5.0 ? 'CRIT' : 'HIGH',
            mag: `M${eq.properties.mag.toFixed(1)}`,
            lat: eq.geometry.coordinates[1],
            lng: eq.geometry.coordinates[0]
         }));
      } catch (e) {
         console.warn("USGS Fetch Failed", e);
      }

      // 2. Fetch Real Weather Data via Open-Meteo
      try {
         const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
         const weatherData = await weatherRes.json();
         if (weatherData.current_weather) {
            setTemperature(`${weatherData.current_weather.temperature}°C`);
         }
      } catch (e) {
         console.warn("Open-Meteo Failed", e);
      }

      // 3. Fetch Real Backend Ops Data
      const res = await mapAPI.live(lat, lng);
      
      // Merge USGS with Backend Disasters
      let finalDisasters = usgsDisasters;
      if (res?.success && res.layers?.disasters?.length) {
         finalDisasters = [...finalDisasters, ...res.layers.disasters];
      }
      setDisasters(finalDisasters);

      if (res?.success) {
        if (res.layers?.hospitals?.length) {
            setHospitals(res.layers.hospitals);
        } else {
            // Demo Real coordinates fallback if backend empty
            setHospitals([
               { id: 'H1', name: 'AIIMS Delhi', beds: 43, lat: 28.5672, lng: 77.2100 },
               { id: 'H2', name: 'PGIMER Chandigarh', beds: 18, lat: 30.7628, lng: 76.7725 },
               { id: 'H3', name: 'KEM Mumbai', beds: 8, lat: 19.0163, lng: 72.8407 }
            ]);
        }

        if (res.layers?.ambulances?.length) {
            setAmbulances(res.layers.ambulances);
        } else {
            // Spawn some nearby relative to myLocation
            setAmbulances([
               { id: 'AMB-001', status: 'standby', lat: lat + 0.005, lng: lng - 0.005 },
               { id: 'AMB-002', status: 'moving', lat: lat - 0.007, lng: lng + 0.008 }
            ]);
        }

        if (res.layers?.blocked_roads?.length) setBlocks(res.layers.blocked_roads);
      }
      setLastSync(0);
    } finally { setIsSyncing(false); }
  };

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = window.speechSynthesis.getVoices().find(v => v.name.includes('Google US English')) || null;
      utterance.rate = 1.05;
      utterance.pitch = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDispatchRed = () => {
    if (!myLocation) return;
    setIsDispatchingRed(true);
    setCountdown(5);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    // Voice Warning Initiated
    speak("WARNING. RED TRIAGE AUTHORIZED. INITIALIZING MISSION CRITICAL DISPATCH.");

    let t = 4;
    const interval = setInterval(() => {
       setCountdown(t);
       if (t <= 0) {
          clearInterval(interval);
          executeRedAlert();
       }
       t--;
    }, 1000);
  };

  const executeRedAlert = async () => {
     try {
        const res = await opsAPI.dispatchRed(myLocation!.latitude, myLocation!.longitude, "CRITICAL_TRAUMA");
        speak(`EMERGENCY ALERT. All units mobilize immediately. ${res.ambulance || 'AMB-002'} dispatched to ${res.hospital || 'Gian Sagar'} with safe route lock.`);
        
        Animated.sequence([
           Animated.timing(flashAnim, { toValue: 0.6, duration: 100, useNativeDriver: false }),
           Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: false })
        ]).start();

        setDispatchResult({
           ambulance: res.ambulance || 'AMB-002',
           hospital: res.hospital || 'Gian Sagar',
           status: 'Safe route active',
           eta: res.eta || 'Fastest Route Lock'
        });
        
        // Add visual safe route locally for the dispatched ambulance
        setAmbulances(prev => prev.map(a => 
           a.id === (res.ambulance || 'AMB-002') ? { ...a, status: 'dispatched' } : a
        ));

     } catch (e: any) {
        Alert.alert("DISPATCH FAILED", e.message || "Failed to establish command link.");
     } finally {
        setIsDispatchingRed(false);
     }
  };

  const handleBootstrap = async () => {
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
     try {
       setIsSyncing(true);
       await opsAPI.bootstrap('MOHALI_SECTOR_78');
       Alert.alert("BOOTSTRAP INITIATED", "All AMB units activated.");
       await syncBackend(myLocation!.latitude, myLocation!.longitude);
     } catch (_) {}
     finally { setIsSyncing(false); }
  };

  const spin = radarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={s.container}>
      {/* 💥 GLOBAL FLASH LAYER FOR DISPATCH RED */}
      <Animated.View style={[s.flashOverlay, { opacity: flashAnim, backgroundColor: COLORS.red }]} pointerEvents="none" />

      {/* 🗺️ MAP BACKGROUND (LIVE GOOGLE MAPS SATELLITE FEED) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
        {Platform.OS === 'web' ? (
           <iframe 
             src={`https://maps.google.com/maps?q=${myLocation?.latitude || 30.7333},${myLocation?.longitude || 76.7794}&t=k&z=13&ie=UTF8&iwloc=&output=embed`}
             style={{ width: '100%', height: '100%', border: 0, opacity: 0.6, pointerEvents: 'none' }}
             allowFullScreen
           />
        ) : (
           <Image 
             source={{ uri: "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/12/2920/1682.png" }} 
             style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} 
             contentFit="cover" 
           />
        )}
        <View style={s.mapGridOverlay}>
           <View style={s.gridH} /><View style={s.gridV} />
           <Animated.View style={[s.radarSweep, { transform: [{ rotate: spin }] }]}>
              <LinearGradient colors={['rgba(34,197,94,0.3)', 'transparent']} start={{x:0.5,y:0}} end={{x:0,y:1}} style={s.sweepGradient} />
           </Animated.View>
        </View>

        {/* --- MAP NODES --- */}
        {myLocation && (
           <>
             {/* YOU */}
             <View style={[s.mapNode, getPosition(myLocation.latitude, myLocation.longitude)]}>
                <View style={s.youDiamond} />
             </View>

             {/* DISASTERS */}
             {disasters.map(d => (
                <View key={d.id} style={[s.mapNode, getPosition(d.lat, d.lng)]}>
                   <Animated.View style={[s.pulseRing, { borderColor: COLORS.red, transform: [{ scale: pulseAnim }] }]} />
                   <View style={[s.redDot, d.severity !== 'CRIT' && { backgroundColor: COLORS.amber }]} />
                </View>
             ))}

             {/* HOSPITALS */}
             {hospitals.map(h => (
                <View key={h.id} style={[s.mapNode, getPosition(h.lat, h.lng)]}>
                   <View style={s.blueDot} />
                </View>
             ))}

             {/* AMBULANCES */}
             {ambulances.map(a => (
                <View key={a.id} style={[s.mapNode, getPosition(a.lat, a.lng)]}>
                   <View style={s.yellowDot} />
                </View>
             ))}

             {/* BLOCKS */}
             {blocks.map(b => (
                <View key={b.id} style={[s.mapNode, getPosition(b.lat, b.lng)]}>
                   <View style={s.blockMarker}><X size={8} color="#000" /></View>
                </View>
             ))}
             
             {/* SAFELINE SIMULATION IF DISPATCHED */}
             {dispatchResult && (
                 <View style={[s.mapNode, getPosition(myLocation.latitude + 0.005, myLocation.longitude + 0.005), { width: 100, borderTopWidth: 2, borderColor: COLORS.green, transform: [{ rotate: '45deg' }] }]} />
             )}
             {/* BLOCKED LINE SIMULATION */}
             <View style={[s.mapNode, getPosition(myLocation.latitude - 0.003, myLocation.longitude - 0.003), { width: 80, borderTopWidth: 2, borderStyle: 'dashed', borderColor: COLORS.red, transform: [{ rotate: '-30deg' }] }]} />
           </>
        )}
      </View>

      {/* 📱 1. DYNAMIC ISLAND */}
      <View style={s.dynIslandFrame}>
         <BlurView intensity={80} tint="dark" style={s.dynIsland}>
             <View style={s.livePulse} /><Text style={s.islandTxt}>LIVE OPS</Text>
         </BlurView>
      </View>

      {/* 📱 2. COMMAND HEADER */}
      <View style={s.topPanel}>
         <View style={s.sysInfoRow}>
            <Text style={s.clock}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <View style={s.wifiGroup}>
               <Globe size={10} color={COLORS.blue} />
               <Text style={s.wifiTxt}>{temperature} • WIFI • 100%</Text>
            </View>
         </View>
         <View style={s.cmdTitleRow}>
            <Text style={s.cmdTitle}>Disaster Command</Text>
            <View style={s.liveBadge}><Text style={s.liveBadgeTxt}>LIVE</Text></View>
         </View>
         <View style={s.syncRow}>
            <Text style={s.gpsTxt}>GPS · {address}</Text>
            <Text style={s.syncTxt}>Sync {lastSync}s</Text>
         </View>
      </View>

      {/* 📱 3. LIVE STATS ROW */}
      <View style={s.statsRow}>
         <StatTile num={disasters.length} label="DISASTERS" color={COLORS.red} />
         <StatTile num={hospitals.length} label="HOSPITALS" color={COLORS.blue} />
         <StatTile num={ambulances.length} label="AMBULANCE" color={COLORS.yellow} />
         <StatTile num={8} label="FIELD OPS" color={COLORS.green} />
      </View>

      {/* 📱 4. RIGHT SIDEBAR PANELS */}
      <View style={s.rightSidebar}>
         <BlurView intensity={30} tint="dark" style={s.sidePanel}>
            {/* INCIDENTS */}
            <SideSection title="INCIDENTS" color={COLORS.red}>
               {disasters.map(d => (
                  <View key={d.id} style={s.sideRow}>
                     <View style={[s.sIcon, { backgroundColor: COLORS.red + '20' }]}><Globe size={10} color={COLORS.red} /></View>
                     <View>
                        <Text style={s.sItemTitle}>{d.title}</Text>
                        <Text style={[s.sItemSub, { color: COLORS.red }]}>{d.type} · {d.severity}</Text>
                     </View>
                  </View>
               ))}
            </SideSection>
            
            {/* HOSPITALS */}
            <SideSection title="HOSPITALS" color={COLORS.blue}>
               {hospitals.map(h => (
                  <View key={h.id} style={s.sideRow}>
                     <Text style={s.sItemTitle}>{h.name}</Text>
                     <Text style={s.sItemSub}>{h.beds} beds</Text>
                  </View>
               ))}
            </SideSection>

            {/* AMBULANCES */}
            <SideSection title="AMBULANCES" color={COLORS.yellow}>
               {ambulances.map(a => (
                  <View key={a.id} style={s.sideRow}>
                     <Text style={[s.sItemTitle, { color: a.status === 'dispatched' ? COLORS.green : '#FFF' }]}>{a.id}</Text>
                     <Text style={s.sItemSub}>{a.status}</Text>
                  </View>
               ))}
            </SideSection>

            {/* BLOCKED */}
            <SideSection title="BLOCKED" color={COLORS.amber}>
               {blocks.map(b => (
                  <View key={b.id} style={s.sideRow}>
                     <View style={s.sIconSmall} />
                     <Text style={s.sItemTitle}>{b.name}</Text>
                  </View>
               ))}
            </SideSection>
         </BlurView>
      </View>

      {/* 📱 5. QUICK CONTROL BUTTONS */}
      <View style={s.quickBtns}>
         <QBtn icon={Target} color={COLORS.blue} onPress={setupLocation} />
         <QBtn icon={RefreshCw} color={COLORS.purple} onPress={() => syncBackend(myLocation?.latitude || 0, myLocation?.longitude || 0)} />
         <QBtn icon={Activity} color={COLORS.red} onPress={handleDispatchRed} />
         <QBtn icon={MapPin} color={COLORS.amber} onPress={() => {}} />
      </View>

      {/* 📱 6. DISPATCH RESULT BAR */}
      <View style={s.bottomArea}>
         {dispatchResult && (
            <BlurView intensity={50} tint="dark" style={s.dispatchResult}>
               <Text style={s.drTitle}>✔️ {dispatchResult.ambulance} dispatched</Text>
               <Text style={s.drSub}>{dispatchResult.hospital} — {dispatchResult.status}</Text>
            </BlurView>
         )}

         {/* 📱 7. ACTION BAR */}
         <View style={s.actionBar}>
            <TouchableOpacity style={s.actionBtn} onPress={handleBootstrap}>
               <Text style={s.actionBtnTxt}>Bootstrap{'\n'}Assets</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={s.dispatchRedBtn} onPress={handleDispatchRed} disabled={isDispatchingRed}>
               {isDispatchingRed ? (
                 <Text style={s.dispatchCountdown}>{countdown}</Text>
               ) : (
                 <Text style={s.dispatchRedTxt}>Dispatch{'\n'}RED</Text>
               )}
            </TouchableOpacity>

            <TouchableOpacity style={s.actionBtn}>
               <Text style={s.actionBtnTxt}>All Units{'\n'}Status</Text>
            </TouchableOpacity>
         </View>

         {/* 📱 8. LEGEND */}
         <View style={s.legendBar}>
            <LegendItem dot={COLORS.red} label="Critical disaster" />
            <LegendItem dot={COLORS.amber} label="Warning" />
            <LegendItem dot={COLORS.blue} label="Hospital" />
            <LegendItem dot={COLORS.yellow} label="Ambulance" />
            <LegendItem icon="♦" label="You (GPS)" />
            <LegendItem line={COLORS.green} label="Safe route" />
            <LegendItem dLine={COLORS.red} label="Blocked" />
         </View>
      </View>
    </View>
  );
}

// ── Components ───────────────────────────────────────────────

function StatTile({ num, label, color }: any) {
   return (
      <View style={s.statTile}>
         <Text style={[s.stNum, { color }]}>{num}</Text>
         <Text style={s.stLbl}>{label}</Text>
      </View>
   );
}

function SideSection({ title, color, children }: any) {
   return (
      <View style={s.sSection}>
         <Text style={[s.sSecTitle, { color }]}>{title}</Text>
         {children}
      </View>
   );
}

function QBtn({ icon: Icon, color, onPress }: any) {
   return (
      <TouchableOpacity style={[s.qBtn, { borderColor: color + '40' }]} onPress={onPress}>
         <Icon size={14} color={color} />
      </TouchableOpacity>
   );
}

function LegendItem({ dot, icon, line, dLine, label }: any) {
   return (
      <View style={s.lgItem}>
         {dot && <View style={[s.lgDot, { backgroundColor: dot }]} />}
         {icon && <Text style={s.lgIconTxt}>{icon}</Text>}
         {line && <View style={[s.lgLine, { backgroundColor: line }]} />}
         {dLine && <View style={[s.lgLine, { backgroundColor: dLine, borderStyle: 'dashed', borderWidth: 1, height: 1 }]} />}
         <Text style={s.lgTxt}>{label}</Text>
      </View>
   );
}

// ── Styles ───────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flashOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999 },
  
  // -- Map Background --
  mapGridOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  gridH: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  gridV: { position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  radarSweep: { width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, position: 'absolute', overflow: 'hidden', opacity: 0.15 },
  sweepGradient: { flex: 1 },
  
  // -- Map Nodes --
  mapNode: { position: 'absolute', width: 0, height: 0, overflow: 'visible', alignItems: 'center', justifyContent: 'center' },
  youDiamond: { width: 12, height: 12, backgroundColor: '#FFF', transform: [{ rotate: '45deg' }], shadowColor: '#FFF', shadowOpacity: 0.8, shadowRadius: 10 },
  pulseRing: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.red },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.blue },
  yellowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.yellow },
  blockMarker: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.amber, alignItems: 'center', justifyContent: 'center' },

  // -- Top UI --
  dynIslandFrame: { position: 'absolute', top: 10, width: '100%', alignItems: 'center', zIndex: 100 },
  dynIsland: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red, marginRight: 6 },
  islandTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 9, letterSpacing: 1 },

  topPanel: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 100 },
  sysInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  clock: { fontFamily: 'SpaceGrotesk-Bold', color: COLORS.muted, fontSize: 10, letterSpacing: 1 },
  wifiGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wifiTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: COLORS.muted, fontSize: 8, letterSpacing: 1 },
  cmdTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cmdTitle: { fontFamily: 'SpaceGrotesk-Bold', color: '#FFF', fontSize: 18, letterSpacing: 0.5 },
  liveBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)' },
  liveBadgeTxt: { color: COLORS.red, fontSize: 8, fontFamily: DESIGN.fontBold, letterSpacing: 1 },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between' },
  gpsTxt: { color: COLORS.muted, fontSize: 10, fontFamily: DESIGN.fontLabel },
  syncTxt: { color: COLORS.muted, fontSize: 10, fontFamily: DESIGN.fontLabel },

  statsRow: { position: 'absolute', top: 120, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 12, zIndex: 100 },
  statTile: { alignItems: 'center' },
  stNum: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, marginBottom: 2 },
  stLbl: { fontFamily: DESIGN.fontLabelSemiBold, color: COLORS.muted, fontSize: 8, letterSpacing: 1 },

  // -- Sidebar Panels --
  rightSidebar: { position: 'absolute', top: 190, right: 16, bottom: 200, width: 140, zIndex: 100 },
  sidePanel: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, overflow: 'hidden' },
  sSection: { marginBottom: 16 },
  sSecTitle: { fontFamily: DESIGN.fontBold, fontSize: 8, letterSpacing: 1, marginBottom: 8 },
  sideRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  sIcon: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sIconSmall: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.amber },
  sItemTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 9 },
  sItemSub: { fontFamily: DESIGN.fontLabel, color: COLORS.muted, fontSize: 8 },

  // -- Quick Buttons --
  quickBtns: { position: 'absolute', right: 165, top: 190, gap: 12, zIndex: 100 },
  qBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // -- Bottom UI --
  bottomArea: { position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 100 },
  dispatchResult: { backgroundColor: 'rgba(12, 16, 26, 0.9)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', padding: 12, marginBottom: 16 },
  drTitle: { fontFamily: DESIGN.fontBold, color: COLORS.green, fontSize: 12, marginBottom: 4 },
  drSub: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 10 },

  actionBar: { flexDirection: 'row', padding: 8, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  actionBtn: { flex: 1, height: 60, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: COLORS.border },
  actionBtnTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: COLORS.blue, fontSize: 10, textAlign: 'center' },
  
  dispatchRedBtn: { flex: 1, height: 60, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: COLORS.border, backgroundColor: 'rgba(239,68,68,0.1)' },
  dispatchRedTxt: { fontFamily: DESIGN.fontBold, color: COLORS.red, fontSize: 11, textAlign: 'center', letterSpacing: 1 },
  dispatchCountdown: { fontFamily: 'SpaceGrotesk-Bold', color: '#FFF', fontSize: 32 },

  legendBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 16, padding: 12, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  lgItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lgDot: { width: 6, height: 6, borderRadius: 3 },
  lgIconTxt: { color: '#FFF', fontSize: 10, lineHeight: 10 },
  lgLine: { width: 12, height: 2 },
  lgTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: COLORS.muted, fontSize: 8 },
});
