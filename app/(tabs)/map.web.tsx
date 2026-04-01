import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, ScrollView, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Globe, Clock, RefreshCw, Activity, MapPin, X, Target, Zap, Shield, Droplets } from 'lucide-react-native';

import { mapAPI, opsAPI } from '@/Store/api';
import { DESIGN } from '@/constants/design';

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#05070A',
  card: 'rgba(12, 16, 26, 0.9)',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  muted: '#8A94A8',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#EAB308',
  purple: '#A855F7',
};

// ── TACTICAL STYLES (Moved to Top for Transform Protection) ──
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: '#05070A' },
  gridContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  gridH: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  gridV: { position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  radarSweep: { width: width * 1.6, height: width * 1.6, position: 'absolute', opacity: 0.12 },
  
  node: { position: 'absolute', width: 0, height: 0, justifyContent: 'center', alignItems: 'center' },
  userDot: { width: 12, height: 12, backgroundColor: '#FFF', borderRadius: 2, transform: [{ rotate: '45deg' }], shadowColor: '#FFF', shadowOpacity: 0.8, shadowRadius: 10 },
  threatDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.red, shadowColor: COLORS.red, shadowOpacity: 0.8, shadowRadius: 8 },
  unitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  
  labelBox: { position: 'absolute', left: 14, top: -10, backgroundColor: 'rgba(0,0,0,0.85)', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', width: 120 },
  labelText: { color: '#FFF', fontSize: 9, fontFamily: DESIGN.fontBold, textTransform: 'uppercase' },
  labelSub: { color: COLORS.red, fontSize: 8, fontFamily: DESIGN.fontLabel },

  topHUD: { position: 'absolute', top: 50, left: 24, right: 24, zIndex: 100 },
  hudTitle: { color: '#FFF', fontSize: 32, fontFamily: DESIGN.fontBold, letterSpacing: -1, marginBottom: 4 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hudTelem: { color: COLORS.muted, fontSize: 11, fontFamily: DESIGN.fontLabel },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { color: COLORS.blue, fontSize: 9, fontFamily: DESIGN.fontBold },

  statsRow: { position: 'absolute', top: 160, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 24, fontFamily: DESIGN.fontBold, marginBottom: 2 },
  statLbl: { fontSize: 9, color: COLORS.muted, fontFamily: DESIGN.fontLabel },

  sideNav: { position: 'absolute', left: 24, top: 280, gap: 16, zIndex: 100 },
  toolBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  actionDock: { position: 'absolute', bottom: 40, left: 24, right: 24, zIndex: 100 },
  dockContent: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 24, padding: 10, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  dockBtn: { flex: 1, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dockBtnMain: { flex: 1.2, height: 60, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  dockText: { color: COLORS.blue, fontSize: 11, fontFamily: DESIGN.fontLabelSemiBold, textAlign: 'center' },
  dockTextMain: { color: COLORS.red, fontSize: 12, fontFamily: DESIGN.fontBold, textAlign: 'center' },
  countdownText: { color: COLORS.red, fontSize: 28, fontFamily: DESIGN.fontBold },

  modal: { ...StyleSheet.absoluteFillObject, zIndex: 1000, padding: 32, paddingTop: 100 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  modalTitle: { color: '#FFF', fontSize: 28, fontFamily: DESIGN.fontBold },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.04)', padding: 20, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  ledgerTitle: { color: '#FFF', fontSize: 16, fontFamily: DESIGN.fontBold },
  ledgerSub: { color: COLORS.green, fontSize: 11, fontFamily: DESIGN.fontLabel },
});

export default function DisasterCommandCenter() {
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [myLocation, setMyLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [lastSync, setLastSync] = useState(0);
  
  // Data Streams
  const [disasters, setDisasters] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [fieldOps, setFieldOps] = useState<any[]>([]);
  const [temp, setTemp] = useState('--');
  const [stats, setStats] = useState({ disasters: 0, medical: 0, ambulances: 0, ops: 0 });

  // Operational State
  const [showLedger, setShowLedger] = useState(false);
  const [unitNodes, setUnitNodes] = useState<any[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [timer, setTimer] = useState(5);

  const pulse = useRef(new Animated.Value(1)).current;
  const radar = useRef(new Animated.Value(0)).current;

  // Radar Mapping
  const SCALE = 3000;
  const getXY = useMemo(() => (lat: number, lng: number) => {
    if (!myLocation) return { left: 0, top: 0 };
    const dx = (lng - myLocation.longitude) * 111;
    const dy = (lat - myLocation.latitude) * 111;
    return { left: (width / 2) + (dx * SCALE), top: (height / 2) - (dy * SCALE) };
  }, [myLocation]);

  const sync = async (lat: number, lng: number) => {
    setIsSyncing(true);
    try {
      // 1. Live Geo-Data (USGS)
      const usgsRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      const usgsData = await usgsRes.json();
      const localThreats = usgsData.features.filter((f: any) => {
        const [elon, elat] = f.geometry.coordinates;
        return elat >= 5.0 && elat <= 40.0 && elon >= 65.0 && elon <= 100.0;
      }).slice(0, 8).map((eq: any) => ({
        id: eq.id,
        title: eq.properties.place.split(' of ').pop(),
        mag: `M${eq.properties.mag.toFixed(1)}`,
        lat: eq.geometry.coordinates[1],
        lng: eq.geometry.coordinates[0]
      }));

      // 2. Weather Engine
      const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
      const wxData = await wxRes.json();
      if (wxData.current_weather) setTemp(`${Math.round(wxData.current_weather.temperature)}°C`);

      // 3. System Backend
      const [layers, dash] = await Promise.all([
        mapAPI.live(lat, lng),
        mapAPI.getDashboardStats(lat, lng)
      ]);

      if (dash.success) setStats({ ...dash.stats, ops: layers.layers?.field_ops?.length || 0 });
      if (layers.success) {
         setDisasters(localThreats);
         setHospitals(layers.layers?.hospitals || []);
         setAmbulances(layers.layers?.ambulances || []);
         setFieldOps(layers.layers?.field_ops || []);
      }
      setLastSync(0);
    } catch (err) {
      console.warn("Telemetry Sync Warning", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const locate = async () => {
    setLoading(true);
    let coords = { latitude: 30.7333, longitude: 76.7794 };
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = loc.coords;
      }
    } catch (_) {}
    setMyLocation(coords);
    await sync(coords.latitude, coords.longitude);
    setLoading(false);
  };

  useEffect(() => {
    locate();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.25, duration: 1500, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: false })
      ])
    ).start();
    Animated.loop(Animated.timing(radar, { toValue: 1, duration: 10000, useNativeDriver: false })).start();
    const clock = setInterval(() => setLastSync(p => p + 1), 1000);
    return () => clearInterval(clock);
  }, []);

  const handleDispatch = () => {
    if (!myLocation) return;
    setIsDispatching(true);
    setTimer(5);
    let c = 4;
    const interval = setInterval(() => {
      setTimer(c);
      if (c <= 0) {
        clearInterval(interval);
        opsAPI.dispatchRed(myLocation.latitude, myLocation.longitude, "CRITICAL")
          .then(() => Alert.alert("STATUS: DEPLOYED", "Triage units mobilized."))
          .finally(() => setIsDispatching(false));
      }
      c--;
    }, 1000);
  };

  const handleShowLedger = async () => {
    setIsSyncing(true);
    try {
      const res = await mapAPI.getLiveUnits();
      if (res.success) {
        setUnitNodes(res.nodes || []);
        setShowLedger(true);
      }
    } catch (_) {}
    finally { setIsSyncing(false); }
  };

  const handleDropPin = async () => {
    if (!myLocation) return;
    try {
      const res = await mapAPI.createPin("DANGER", myLocation.latitude, myLocation.longitude, "TAC_MARK");
      if (res.success) {
        Alert.alert("TAC_MARK LOCKED", "Incident coordinates logged.");
        sync(myLocation.latitude, myLocation.longitude);
      }
    } catch (_) {}
  };

  const rotation = radar.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={s.container}>
      {/* ── TACTICAL RADAR CANVAS ── */}
      <View style={s.background}>
        <View style={s.gridContainer}>
          <View style={s.gridH} /><View style={s.gridV} />
          <Animated.View style={[s.radarSweep, { transform: [{ rotate: rotation }] }]}>
            <LinearGradient colors={['rgba(16,185,129,0.25)', 'transparent']} start={{x:0.5,y:0}} end={{x:0,y:1}} style={{flex:1}} />
          </Animated.View>
        </View>

        {myLocation && (
          <React.Fragment>
            <View style={[s.node, getXY(myLocation.latitude, myLocation.longitude)]}>
               <View style={s.userDot} />
            </View>

            {disasters.map((d, i) => (
              <View key={`d-${i}`} style={[s.node, getXY(d.lat, d.lng)]}>
                <View style={s.threatDot} />
                <View style={s.labelBox}>
                  <Text style={s.labelText}>{d.title}</Text>
                  <Text style={s.labelSub}>{d.mag}</Text>
                </View>
              </View>
            ))}

            {fieldOps.map((p, i) => (
              <View key={`p-${i}`} style={[s.node, getXY(p.lat, p.lng)]}>
                <View style={s.unitDot} />
              </View>
            ))}
          </React.Fragment>
        )}
      </View>

      {/* ── TOP HUD ── */}
      <View style={s.topHUD}>
        <View style={s.hudRow}>
           <Text style={s.hudTelem}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
           <View style={s.statusBadge}><Globe size={11} color={COLORS.blue} /><Text style={s.statusText}>{temp} • MESH ONLINE</Text></View>
        </View>
        <Text style={s.hudTitle}>Sentinel Radar</Text>
        <View style={s.hudRow}>
           <Text style={s.hudTelem}>LAT: {(myLocation?.latitude || 0).toFixed(4)} LNG: {(myLocation?.longitude || 0).toFixed(4)}</Text>
           <Text style={s.hudTelem}>SYNC: {lastSync}s</Text>
        </View>
      </View>

      {/* ── ANALYTICS BAR ── */}
      <View style={s.statsRow}>
        <Stat num={stats.disasters} label="THREATS" color={COLORS.red} />
        <Stat num={stats.medical} label="MEDICAL" color={COLORS.blue} />
        <Stat num={stats.ambulances} label="AMB" color={COLORS.yellow} />
        <Stat num={stats.ops} label="FIELD OPS" color={COLORS.green} />
      </View>

      {/* ── SIDE TOOLS ── */}
      <View style={s.sideNav}>
        <Tool icon={Target} color={COLORS.blue} onPress={locate} />
        <Tool icon={RefreshCw} color={COLORS.purple} onPress={() => sync(myLocation?.latitude || 0, myLocation?.longitude || 0)} />
        <Tool icon={Activity} color={COLORS.red} onPress={handleDispatch} />
        <Tool icon={MapPin} color={COLORS.amber} onPress={handleDropPin} />
      </View>

      {/* ── ACTION DOCK ── */}
      <View style={s.actionDock}>
        <View style={s.dockContent}>
           <TouchableOpacity style={s.dockBtn} onPress={() => sync(myLocation?.latitude || 0, myLocation?.longitude || 0)}><Text style={s.dockText}>Sector{"\n"}Update</Text></TouchableOpacity>
           <TouchableOpacity style={s.dockBtnMain} onPress={handleDispatch}>
              {isDispatching ? <Text style={s.countdownText}>{timer}</Text> : <Text style={s.dockTextMain}>Dispatch{"\n"}RED</Text>}
           </TouchableOpacity>
           <TouchableOpacity style={s.dockBtn} onPress={handleShowLedger}><Text style={s.dockText}>Unit{"\n"}Ledger</Text></TouchableOpacity>
        </View>
      </View>

      {/* ── MODALS ── */}
      {showLedger && (
        <BlurView intensity={90} tint="dark" style={s.modal}>
           <View style={s.modalHead}><Text style={s.modalTitle}>Mesh Unit Ledger</Text><TouchableOpacity onPress={() => setShowLedger(false)}><X color="#FFF" size={28}/></TouchableOpacity></View>
           <ScrollView>
              {unitNodes.map((u, i) => (
                <View key={i} style={s.ledgerRow}>
                   <View style={{width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.green + '20', alignItems: 'center', justifyContent: 'center'}}><Zap size={18} color={COLORS.green}/></View>
                   <View><Text style={s.ledgerTitle}>NODE_{u.id}</Text><Text style={s.ledgerSub}>{u.status || 'ACTIVE'} • {u.battery || 100}%</Text></View>
                </View>
              ))}
           </ScrollView>
        </BlurView>
      )}
    </View>
  );
}

const Stat = ({ num, label, color }: any) => (
  <View style={s.statItem}><Text style={[s.statNum, { color }]}>{num}</Text><Text style={s.statLbl}>{label}</Text></View>
);

const Tool = ({ icon: Icon, color, onPress }: any) => (
  <TouchableOpacity style={s.toolBtn} onPress={onPress}><Icon size={20} color={color} /></TouchableOpacity>
);
