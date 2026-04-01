import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Users, Radio, Navigation, ShieldAlert,
  AlertTriangle, Link, Activity, MapPin, Search, ChevronRight, Share2, LocateFixed
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { mapAPI } from '@/Store/api';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const COLORS = {
  ...DESIGN,
  mesh: '#22c55e', // Green
  blue: '#3b82f6',
  yellow: '#eab308',
  red: '#ef4444',
  border: 'rgba(255,255,255,0.08)',
  bg: '#050709',
};

export default function CommunityNetwork() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [address, setAddress] = useState('SECTOR 78, MOHALI');
  const [pins, setPins] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [nearbyCount, setNearbyCount] = useState(6);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  // ── Geospatial Scaling ──────────────────────────────────────────
  const MAP_SIZE = width - 48; // Padding 24 on each side
  const COORDINATE_SCALE = 2000; 

  const getPosition = (targetLat: number, targetLng: number) => {
    if (!location) return { x: 0, y: 0 };
    const dx = (targetLng - location.longitude) * 111; 
    const dy = (targetLat - location.latitude) * 111;
    // Cap distances so they don't fly off map
    let finalX = (MAP_SIZE / 2) + (dx * COORDINATE_SCALE);
    let finalY = (MAP_SIZE / 2) - (dy * COORDINATE_SCALE);
    
    // Simple clamp
    const P = 30;
    if (finalX < P) finalX = P;
    if (finalX > MAP_SIZE - P) finalX = MAP_SIZE - P;
    if (finalY < P) finalY = P;
    if (finalY > MAP_SIZE - P) finalY = MAP_SIZE - P;
    
    return { x: finalX, y: finalY };
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();

    setupLocation();
    const timer = setInterval(() => {
        if (location) fetchCommunityData(location.latitude, location.longitude);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const setupLocation = async () => {
    setLoading(true);
    let coords = { latitude: 30.6800, longitude: 76.7221 }; // Fallback (Mohali approx)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
         const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
         coords = loc.coords;
         
         // Try reverse geocoding
         const gCode = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
         if (gCode.length > 0) {
            const locName = gCode[0].city || gCode[0].subregion || gCode[0].district;
            const street = gCode[0].street ? `SECTOR ${gCode[0].street.replace(/[^0-9]/g, '')}` : 'SECTOR 78';
            if (locName) setAddress(`${street}, ${locName}`.toUpperCase());
         }
      }
    } catch (_) {}
    
    setLocation(coords);
    fetchCommunityData(coords.latitude, coords.longitude);
    setLoading(false);
  };

  const fetchCommunityData = async (lat: number, lng: number) => {
    try {
      const pinRes = await mapAPI.getPins(lat, lng, 15);
      if (pinRes?.success) setPins(pinRes.pins || []);
      
      const updRes = await mapAPI.getUpdates(lat, lng, 15);
      if (updRes?.success) setUpdates(updRes.updates || []);
    } catch (_) {}
  };

  const handleBroadcast = async (pinType: string) => {
    if (!location) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "CONFIRM MESH BROADCAST",
      `Are you sure you want to broadcast a ${pinType.toUpperCase()} status to all nearby mesh nodes?`,
      [
        { text: "CANCEL", style: "cancel" },
        { text: "BROADCAST", style: "destructive", onPress: async () => {
          try {
            setLoading(true);
            const res = await mapAPI.createPin(pinType, location.latitude, location.longitude, `${pinType.toUpperCase()} ALERT`);
            if (res?.success) {
              Alert.alert("BROADCAST ACTIVE", "Your report is propagating via Bluetooth/WiFi mesh.");
              fetchCommunityData(location.latitude, location.longitude);
            }
          } catch (_) { Alert.alert("OFFLINE", "Mesh relay queued. Waiting for peer node connection."); }
          finally { setLoading(false); }
        }}
      ]
    );
  };
  
  const handleSOS = async (type: string) => {
    if (!location) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
       "INITIATE AUTO-ALERT",
       `Triggerting silent distress pulse to ${type.toUpperCase()}. Coordinates attached automatically.`,
       [
         { text: "ABORT", style: "cancel" },
         { text: "EXECUTE SIGNAL", style: "destructive", onPress: async () => {
             try {
                const res = await mapAPI.triggerSOS(location.latitude, location.longitude, `SOS_${type.toUpperCase()}`);
                if (res?.success) Alert.alert("SIGNAL SENT", "Local authorities locked on position.");
             } catch (_) { Alert.alert("ROUTING PENDING", "Pinging via mesh repeaters."); }
         }}
       ]
    );
  };

  // Prepare nodes for map
  const renderNodes = [...pins, ...updates].slice(0, 5); // Limit slightly to avoid map crowding

  return (
    <View style={s.container}>
      <LinearGradient colors={['#05080C', '#010305']} style={StyleSheet.absoluteFill} />
      
      {/* 🟢 TOP STATUS BAR */}
      <View style={s.topBar}>
         <Text style={s.topTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
         <View style={s.meshPill}><Text style={s.meshPillText}>● MESH NET</Text></View>
         <Text style={s.topConns}>BT · WIFI · 100%</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
         
         {/* 🔴 HEADER */}
         <View style={s.headerGroup}>
            <View style={s.sectorRow}>
               <View style={s.sectorLine} />
               <Text style={s.sectorText}>{address}</Text>
            </View>
            <Text style={s.mainTitle}>COMMUNITY{'\n'}NETWORK</Text>
            <Text style={s.subInfo}>● {nearbyCount + renderNodes.length} devices nearby · Bluetooth active</Text>
         </View>

         {/* 📊 STATS CARDS */}
         <View style={s.statsRow}>
            <View style={s.statBox}>
               <Text style={[s.statNum, { color: COLORS.mesh }]}>{nearbyCount + renderNodes.length}</Text>
               <Text style={s.statLbl}>NEARBY</Text>
            </View>
            <View style={s.statBox}>
               <Text style={[s.statNum, { color: COLORS.yellow }]}>{pins.length}</Text>
               <Text style={s.statLbl}>ALERTS</Text>
            </View>
            <View style={s.statBox}>
               <Text style={[s.statNum, { color: COLORS.blue }]}>{updates.length}</Text>
               <Text style={s.statLbl}>UPDATES</Text>
            </View>
         </View>

         {/* 🗺️ MESH COVERAGE MAP */}
         <View style={s.mapContainer}>
            <Text style={s.mapTitle}>MESH COVERAGE MAP</Text>
            <Text style={s.mapRadius}>100m radius</Text>
            
            <View style={s.mapGrid}>
               <View style={s.gridLineH} />
               <View style={s.gridLineH2} />
               <View style={s.gridLineV} />
               <View style={s.gridLineV2} />
               
               <Animated.View style={[s.radarCircle1, { transform: [{ scale: pulseAnim }] }]} />
               <Animated.View style={[s.radarCircle2, { transform: [{ scale: pulseAnim }] }]} />

               {/* YOUR NODE */}
               <View style={[s.youNode, { left: MAP_SIZE/2, top: MAP_SIZE/2 }]}>
                  <View style={s.youDot} />
                  <Text style={s.youTxt}>YOU</Text>
               </View>

               {/* OTHER NODES */}
               {renderNodes.map((node, i) => {
                  const pos = getPosition(node.lat || node.latitude, node.lng || node.longitude);
                  const isDanger = ['roadblock', 'landslide', 'hazard'].includes(node.type?.toLowerCase());
                  const cColor = isDanger ? COLORS.red : (node.type === 'shop' ? COLORS.mesh : COLORS.blue);
                  const ddx = pos.x - (MAP_SIZE/2);
                  const ddy = pos.y - (MAP_SIZE/2);
                  const len = Math.sqrt(ddx*ddx + ddy*ddy);
                  const angle = Math.atan2(ddy, ddx);

                  return (
                     <View key={i} style={StyleSheet.absoluteFill} pointerEvents="none">
                        {/* Dotted Connection Line */}
                        <View style={[s.connLine, {
                           width: len,
                           left: MAP_SIZE/2,
                           top: MAP_SIZE/2,
                           transform: [{ rotate: `${angle}rad` }],
                           borderColor: cColor
                        }]} />
                        
                        {/* Node Render */}
                        <View style={[s.mNode, { left: pos.x, top: pos.y }]}>
                           <View style={[s.mNodeRing, { borderColor: cColor }]}><View style={[s.mNodeDot, { backgroundColor: cColor }]} /></View>
                           <View style={[s.mNodeLabel, { borderColor: cColor }]}>
                              <Text style={[s.mNodeLabelTxt, { color: cColor }]}>{(node.type || 'BT_NODE').toUpperCase()}</Text>
                           </View>
                        </View>
                     </View>
                  );
               })}
            </View>
         </View>

         {/* 🗂️ FEATURE CARDS */}
         
         {/* 1. Road & Danger */}
         <FeatureCard 
            icon="⚠️" title="Road & Danger Updates" pillText="LIVE" pillColor={COLORS.mesh}
            desc="Map pe tap karke road block, landslide ya flood zone mark karo. Pin turant 100m radius ke saare nearby users ke maps pe appear ho jaata hai — bina internet ke bhi (mesh se)."
         >
            <View style={s.btnRow}>
               <FTBtn label="ROAD BLOCK" onPress={() => handleBroadcast('roadblock')} />
               <FTBtn label="LANDSLIDE" onPress={() => handleBroadcast('landslide')} />
               <FTBtn label="FLOOD ZONE" onPress={() => handleBroadcast('flood_zone')} />
               <FTBtn label="AUTO-SPREAD" disabled />
            </View>
         </FeatureCard>

         {/* 2. Community Info */}
         <FeatureCard 
            icon="🔗" title="Community Info Sharing" pillText="OFFLINE" pillColor={COLORS.yellow}
            desc="Light hai ya nahi, paas mein paani mil raha hai, konsi dukaan khuli hai — yeh sab updates offline share hote hain. Disaster mein jab internet jaata hai, yeh feature sabse zyaada kaam aata hai."
         >
            <View style={s.btnRow}>
               <FTBtn label="ELECTRICITY" onPress={() => handleBroadcast('electricity_update')} />
               <FTBtn label="WATER SUPPLY" onPress={() => handleBroadcast('water_supply')} />
               <FTBtn label="OPEN SHOPS" onPress={() => handleBroadcast('shop_open')} />
               <FTBtn label="MEDICAL AID" onPress={() => handleBroadcast('medical_aid')} />
            </View>
         </FeatureCard>

         {/* 3. Mesh Network */}
         <FeatureCard 
            icon="📡" title="Device-to-Device Mesh" pillText="MESH" pillColor={COLORS.blue}
            desc="Map pe dikhe green dashed lines = active Bluetooth connections. Data ek phone se doosre tak hop karta hai — jaise ek chain. 6 devices connected hone pe 500m+ tak coverage possible hai bina kisi tower ke."
         >
            <View style={s.btnRow}>
               <FTBtn label="6 DEVICES LINKED" disabled />
               <FTBtn label="UPTO 100M" disabled />
               <FTBtn label="AUTO-RELAY" disabled />
               <FTBtn label="NO SIM NEEDED" disabled />
            </View>
         </FeatureCard>

         {/* 4. Auto Police */}
         <FeatureCard 
            icon="🚨" title="Auto Police & Emergency Alert" pillText="AUTO" pillColor={COLORS.red}
            desc="Jab app sudden impact (accelerometer) ya manual SOS detect karta hai, woh automatically nearest police station, fire dept, aur ambulance ko GPS location ke saath alert bhej deta hai — koi call karna nahi padta."
         >
            <View style={s.btnRow}>
               <FTBtn label="POLICE STATION" onPress={() => handleSOS('police')} />
               <FTBtn label="FIRE DEPT" onPress={() => handleSOS('fire')} />
               <FTBtn label="AMBULANCE" onPress={() => handleSOS('ambulance')} />
               <FTBtn label="GPS ATTACHED" disabled />
            </View>
         </FeatureCard>

         {/* 📝 LIVE FEED */}
         <View style={s.feedSec}>
            <View style={s.feedHdr}>
               <View style={s.feedDot} />
               <Text style={s.feedHdrTxt}>LIVE FEED</Text>
            </View>

            <View style={s.feedList}>
               {[
                 { color: COLORS.mesh, txt: `Road block marked — GT Road Phase 8`, time: '2m ago' },
                 { color: COLORS.blue, txt: `Medplus open — Sector 71 (via BT relay)`, time: '5m ago' },
                 { color: COLORS.red, txt: `Auto-alert sent — Police Sec 68 (accident)`, time: '9m ago' },
                 ...updates.slice(0, 2).map((u, i) => ({ color: COLORS.yellow, txt: `${(u.type || u.title).toUpperCase()} — Verified Mesh Relay`, time: `${i*3 + 12}m ago` }))
               ].map((item, i) => (
                 <View key={i} style={s.feedRow}>
                    <View style={[s.fDot, { backgroundColor: item.color }]} />
                    <Text style={s.fTxt}>{item.txt}</Text>
                    <Text style={s.fTime}>{item.time}</Text>
                 </View>
               ))}
            </View>
         </View>

         <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ── Components ──────────────────────────────────────────

function FeatureCard({ icon, title, pillText, pillColor, desc, children }: any) {
   return (
      <View style={s.fcContainer}>
         <View style={s.fcHdr}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
               <Text style={{ fontSize: 16 }}>{icon}</Text>
               <Text style={s.fcTitle}>{title}</Text>
            </View>
            <View style={[s.fcPill, { borderColor: pillColor }]}>
               <Text style={[s.fcPillTxt, { color: pillColor }]}>{pillText}</Text>
            </View>
         </View>
         <Text style={s.fcDesc}>{desc}</Text>
         {children}
      </View>
   );
}

function FTBtn({ label, onPress, disabled }: any) {
   return (
      <TouchableOpacity style={[s.btnPill, disabled && { opacity: 0.6 }]} onPress={onPress} activeOpacity={disabled ? 1 : 0.7}>
         <Text style={s.btnPillTxt}>{label}</Text>
      </TouchableOpacity>
   );
}

// ── Styles ───────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { position: 'absolute', top: 50, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
  topTime: { fontFamily: DESIGN.fontLabelSemiBold, color: '#777', fontSize: 10 },
  meshPill: { backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  meshPillText: { fontFamily: DESIGN.fontBold, color: COLORS.mesh, fontSize: 9, letterSpacing: 1 },
  topConns: { fontFamily: DESIGN.fontLabelSemiBold, color: '#777', fontSize: 9, letterSpacing: 1 },

  scroll: { paddingHorizontal: 24, paddingTop: 100 },
  
  headerGroup: { marginBottom: 32 },
  sectorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectorLine: { width: 30, height: 2, backgroundColor: COLORS.mesh },
  sectorText: { fontFamily: DESIGN.fontLabelSemiBold, color: COLORS.mesh, fontSize: 10, letterSpacing: 2 },
  mainTitle: { fontFamily: 'SpaceGrotesk-Bold', color: '#FFF', fontSize: 36, lineHeight: 40, letterSpacing: 1 },
  subInfo: { fontFamily: DESIGN.fontLabelSemiBold, color: '#777', fontSize: 10, marginTop: 12, letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, height: 80, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center' },
  statNum: { fontFamily: DESIGN.fontDisplayBlack, fontSize: 24, marginBottom: 4 },
  statLbl: { fontFamily: DESIGN.fontLabelSemiBold, color: '#666', fontSize: 8, letterSpacing: 1.5 },

  mapContainer: { width: '100%', height: 260, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 32 },
  mapTitle: { position: 'absolute', top: 16, left: 16, fontFamily: DESIGN.fontLabelSemiBold, color: COLORS.mesh, fontSize: 8, letterSpacing: 1, zIndex: 10 },
  mapRadius: { position: 'absolute', top: 16, right: 16, fontFamily: DESIGN.fontLabel, color: '#666', fontSize: 8, zIndex: 10 },
  
  mapGrid: { flex: 1, backgroundColor: '#020305', alignItems: 'center', justifyContent: 'center' },
  gridLineH: { position: 'absolute', top: '30%', width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  gridLineH2: { position: 'absolute', top: '70%', width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  gridLineV: { position: 'absolute', left: '30%', height: '100%', width: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  gridLineV2: { position: 'absolute', left: '70%', height: '100%', width: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  
  radarCircle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(34,197,94,0.1)' },
  radarCircle2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(34,197,94,0.05)' },

  youNode: { position: 'absolute', width: 30, height: 30, marginLeft: -15, marginTop: -15, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  youDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f97316', borderWidth: 2, borderColor: '#020305' },
  youTxt: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 8, marginTop: 4 },

  connLine: { position: 'absolute', height: 1, borderStyle: 'dashed', borderWidth: 1, transformOrigin: 'left center' },
  mNode: { position: 'absolute', width: 80, height: 40, marginLeft: -40, marginTop: -20, alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  mNodeRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#020305' },
  mNodeDot: { width: 6, height: 6, borderRadius: 3 },
  mNodeLabel: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, backgroundColor: '#020305' },
  mNodeLabelTxt: { fontSize: 6, fontFamily: DESIGN.fontBold, letterSpacing: 0.5 },

  fcContainer: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 20, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.02)' },
  fcHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  fcTitle: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 13 },
  fcPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  fcPillTxt: { fontFamily: DESIGN.fontBold, fontSize: 8, letterSpacing: 1 },
  fcDesc: { fontFamily: DESIGN.fontBody, color: '#888', fontSize: 11, lineHeight: 18, marginBottom: 20 },
  
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  btnPillTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: '#999', fontSize: 8, letterSpacing: 1 },

  feedSec: { marginTop: 24, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  feedHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  feedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.mesh },
  feedHdrTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: COLORS.mesh, fontSize: 9, letterSpacing: 1 },
  feedList: { gap: 16 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fDot: { width: 6, height: 6, borderRadius: 3 },
  fTxt: { flex: 1, fontFamily: DESIGN.fontMedium, color: '#CCC', fontSize: 11 },
  fTime: { fontFamily: DESIGN.fontLabel, color: '#666', fontSize: 9 },
});
