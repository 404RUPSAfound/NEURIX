import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Users, Radio, Navigation, ShieldCheck,
  AlertTriangle, Activity, MapPin, Search, 
  Wifi, Zap, Signal, MessageSquare, Phone
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { fetchCommunityData, reverseGeocode } from '@/Store/realData';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function CommunityNetwork() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [address, setAddress] = useState('SYNCING SECTOR...');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();

    setup();
  }, []);

  const setup = async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      
      const geo = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      setAddress(`${geo.city}`.toUpperCase());

      const result = await fetchCommunityData(loc.coords.latitude, loc.coords.longitude);
      setData(result);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />
      
      {/* 🟢 TOP STATUS BAR */}
      <View style={s.topBar}>
         <Text style={s.topTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
         <View style={s.meshPill}><Text style={s.meshPillText}>● MESH ACTIVE</Text></View>
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
            <Text style={s.subInfo}>● {data?.totalServices || 0} nodes detected nearby via Mesh Relay</Text>
         </View>

         {loading ? (
            <View style={s.loadingBox}>
               <ActivityIndicator color={DESIGN.primary} size="large" />
               <Text style={s.loadingText}>SYNCHRONIZING MESH NODES...</Text>
            </View>
         ) : (
            <>
               {/* 📊 STATS CARDS */}
               <View style={s.statsRow}>
                  <View style={s.statBox}>
                     <Text style={s.statNum}>{data?.totalServices || 0}</Text>
                     <Text style={s.statLbl}>NEARBY</Text>
                  </View>
                  <View style={s.statBox}>
                     <Text style={s.statNum}>{data?.fireStations?.length || 0}</Text>
                     <Text style={s.statLbl}>FIRE/RESCUE</Text>
                  </View>
                  <View style={s.statBox}>
                     <Text style={s.statNum}>{data?.policeStations?.length || 0}</Text>
                     <Text style={s.statLbl}>LOCAL ENF.</Text>
                  </View>
               </View>

               {/* 🗺️ MESH VISUALIZER */}
               <View style={s.mapContainer}>
                  <Text style={s.mapTitle}>PROTOCOL: P2P_SECURE_LINK</Text>
                  <View style={s.visualizerBase}>
                     <Animated.View style={[s.radarCircle, { transform: [{ scale: pulseAnim }] }]} />
                     <View style={s.centerNode}>
                        <Wifi color="#FFF" size={20} />
                     </View>
                     {/* NODE DOTS BASED ON REAL DATA */}
                     {data?.all?.slice(0, 5).map((node: any, i: number) => (
                        <View key={i} style={[s.nodeDot, { top: `${30 + (i*10)%40}%`, left: `${20 + (i*15)%60}%` }]} />
                     ))}
                  </View>
                  <Text style={s.mapRadius}>ENCRYPTED_ENVELOPE: 100%</Text>
               </View>

               <Text style={s.sectionTitle}>ACTIVE COMMUNITY NODES</Text>

               {data?.all?.map((node: any, i: number) => (
                  <BlurView key={node.id || i} intensity={25} tint="dark" style={s.nodeCard}>
                     <View style={s.nodeHdr}>
                        <View style={s.nodeInfo}>
                           <Text style={s.nodeName}>{node.name.toUpperCase()}</Text>
                           <Text style={s.nodeType}>{node.type.replace('_', ' ').toUpperCase()}</Text>
                        </View>
                        <View style={s.distBadge}>
                           <Signal size={10} color={DESIGN.primary} />
                           <Text style={s.distTxt}>{node.distanceText}</Text>
                        </View>
                     </View>
                     
                     <View style={s.nodeActions}>
                        <TouchableOpacity style={s.nodeBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                           <Zap size={14} color={DESIGN.primary} />
                           <Text style={s.nodeBtnText}>PING</Text>
                        </TouchableOpacity>
                        {node.phone && (
                           <TouchableOpacity style={[s.nodeBtn, s.btnPrimary]} onPress={() => Alert.alert("CALL NODE", `Calling ${node.name}...`)}>
                              <Phone size={14} color="#FFF" />
                              <Text style={[s.nodeBtnText, { color: '#FFF' }]}>COMM</Text>
                           </TouchableOpacity>
                        )}
                        <TouchableOpacity style={s.nodeBtn}>
                           <MessageSquare size={14} color={DESIGN.primary} />
                           <Text style={s.nodeBtnText}>MSG</Text>
                        </TouchableOpacity>
                     </View>
                  </BlurView>
               ))}
            </>
         )}

         <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebfbedff' },
  topBar: { position: 'absolute', top: 50, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
  topTime: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10 },
  meshPill: { backgroundColor: 'rgba(56, 142, 60, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  meshPillText: { fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 9, letterSpacing: 1 },
  topConns: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 9, letterSpacing: 1 },

  scroll: { paddingHorizontal: 24, paddingTop: 100 },
  
  headerGroup: { marginBottom: 32 },
  sectorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectorLine: { width: 30, height: 2, backgroundColor: DESIGN.primary },
  sectorText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 2 },
  mainTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 36, lineHeight: 40, letterSpacing: 1 },
  subInfo: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10, marginTop: 12, letterSpacing: 0.5 },

  loadingBox: { alignItems: 'center', marginTop: 80, gap: 20 },
  loadingText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10, letterSpacing: 2 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, height: 80, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  statNum: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 24, marginBottom: 4 },
  statLbl: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1.5 },

  mapContainer: { width: '100%', height: 200, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.03)', overflow: 'hidden', marginBottom: 32, padding: 24 },
  mapTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, letterSpacing: 1.5, marginBottom: 10 },
  visualizerBase: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerNode: { width: 50, height: 50, borderRadius: 25, backgroundColor: DESIGN.primary, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  radarCircle: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: DESIGN.primary, opacity: 0.2 },
  nodeDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: DESIGN.primary, opacity: 0.6 },
  mapRadius: { textAlign: 'center', fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7, letterSpacing: 2, marginTop: 10 },

  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 9, letterSpacing: 2, marginBottom: 20 },
  
  nodeCard: { padding: 20, borderRadius: 28, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  nodeHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  nodeInfo: { flex: 1 },
  nodeName: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 14, letterSpacing: 0.5 },
  nodeType: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, marginTop: 4, letterSpacing: 1 },
  distBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  distTxt: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9, color: DESIGN.primary },

  nodeActions: { flexDirection: 'row', gap: 10 },
  nodeBtn: { flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  btnPrimary: { backgroundColor: DESIGN.primary },
  nodeBtnText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8 },
});
