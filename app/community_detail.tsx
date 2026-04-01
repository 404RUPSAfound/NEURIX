import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Image, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  ArrowLeft, Users, Radio, MapPin, 
  ShieldCheck, Activity, Wifi, 
  Terminal, Zap, Signal, MessageSquare, 
  Phone
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { router } from 'expo-router';
import { fetchCommunityData } from '@/Store/realData';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function CommunityDetail() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MESH' | 'SERVICES'>('MESH');
  
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    load();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const result = await fetchCommunityData(loc.coords.latitude, loc.coords.longitude);
      setData(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getSignalStrength = (dist: number) => {
    if (dist < 1) return 100;
    if (dist < 5) return 80;
    if (dist < 10) return 60;
    return 40;
  };

  const items = activeTab === 'MESH' ? data?.all?.slice(0, 10) : data?.all;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image source={require('../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />

      {/* TACTICAL HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <ArrowLeft color="#1E2F23" size={20} />
        </TouchableOpacity>
        <View style={s.hdrCenter}>
          <Text style={s.headerTitle}>COMMUNITY MESH</Text>
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.headerSub}>PROTOCOL: P2P_SECURE_LINK</Text>
          </View>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={load}>
          <Wifi color={DESIGN.primary} size={18} />
        </TouchableOpacity>
      </View>

      {/* PROTOCOL SELECTOR */}
      <View style={s.tabFrame}>
        <TouchableOpacity style={[s.tab, activeTab === 'MESH' && s.tabActive]} onPress={() => setActiveTab('MESH')}>
          <Radio size={14} color={activeTab === 'MESH' ? '#FFF' : '#90A4AE'} />
          <Text style={[s.tabText, activeTab === 'MESH' && s.tabTextActive]}>ACTIVE NODES</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab === 'SERVICES' && s.tabActive]} onPress={() => setActiveTab('SERVICES')}>
          <ShieldCheck size={14} color={activeTab === 'SERVICES' ? '#FFF' : '#90A4AE'} />
          <Text style={[s.tabText, activeTab === 'SERVICES' && s.tabTextActive]}>STATIONS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={DESIGN.primary} size="large" />
            <Text style={s.loadingText}>SYNCHRONIZING P2P NODES...</Text>
          </View>
        ) : (
          <>
            {/* MESH VISUALIZER PREVIEW IF IN MESH TAB */}
            {activeTab === 'MESH' && (
              <BlurView intensity={30} tint="dark" style={s.visualizerBox}>
                <View style={s.vHdr}>
                   <Terminal size={12} color={DESIGN.primary} />
                   <Text style={s.vTitle}>NETWORK_TOPOLOGY</Text>
                </View>
                 <View style={s.meshCircleBase}>
                    <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                    <View style={s.centerNode}>
                       <Activity color="#FFF" size={20} />
                    </View>
                    {/* DYNAMIC REAL-WORLD NODES */}
                    {items?.map((item: any, idx: number) => {
                      // Distributed pseudo-randomly within circle based on item index for visual variety
                      const angle = (idx * 137.5) % 360; 
                      const radius = Math.min(60, 20 + (idx * 5)); 
                      const top = 50 + radius * Math.sin(angle * Math.PI / 180);
                      const left = 50 + radius * Math.cos(angle * Math.PI / 180);
                      
                      return (
                        <View 
                          key={`dot-${idx}`} 
                          style={[s.nodeDot, { top: `${top}%`, left: `${left}%` }]} 
                        />
                      );
                    })}
                 </View>
                 <Text style={s.meshStatus}>ACTIVE_NODES: {items?.length || 0} SECTOR_LINK: 100%</Text>
              </BlurView>
            )}

            <Text style={s.sectionTitle}>DETECTED COMMUNITY ENTITIES</Text>
            
            {items?.map((item: any, i: number) => {
              const sig = getSignalStrength(item.distance);
              const sigColor = sig >= 80 ? DESIGN.success : sig >= 60 ? DESIGN.warning : DESIGN.danger;

              return (
                <BlurView key={item.id || i} intensity={25} tint="dark" style={s.nodeCard}>
                  <View style={s.nodeHdr}>
                    <View style={s.nodeInfo}>
                      <Text style={s.nodeName}>{item.name.toUpperCase()}</Text>
                      <Text style={s.nodeType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View style={s.sigBox}>
                       <Signal size={12} color={sigColor} />
                       <Text style={[s.sigText, { color: sigColor }]}>{sig}%</Text>
                    </View>
                  </View>

                  <View style={s.nodeBody}>
                     <View style={s.metaRow}>
                        <MapPin size={10} color="#90A4AE" />
                        <Text style={s.metaText}>{item.distanceText} FROM BASE</Text>
                     </View>
                     <View style={s.metaRow}>
                        <Radio size={10} color="#90A4AE" />
                        <Text style={s.metaText}>ENCRYPTED_ID: {item.id || 'N/A'}</Text>
                     </View>
                  </View>

                  <View style={s.nodeActions}>
                     <TouchableOpacity style={s.actionBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                        <Zap size={14} color={DESIGN.primary} />
                        <Text style={s.actionText}>PING NODE</Text>
                     </TouchableOpacity>
                     {item.phone && (
                        <TouchableOpacity style={[s.actionBtn, s.actionPrimary]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}>
                           <Phone size={14} color="#FFF" />
                           <Text style={[s.actionText, { color: '#FFF' }]}>COMM LINK</Text>
                        </TouchableOpacity>
                     )}
                     <TouchableOpacity style={s.actionBtn}>
                        <MessageSquare size={14} color={DESIGN.primary} />
                        <Text style={s.actionText}>BROADCAST</Text>
                     </TouchableOpacity>
                  </View>
                </BlurView>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* BOTTOM CONTROL BAR */}
      {!loading && (
        <BlurView intensity={80} tint="dark" style={s.bottomPanel}>
           <TouchableOpacity style={s.broadcastAllBtn}>
              <Text style={s.broadcastText}>BROADCAST EMERGENCY SIGNAL TO ENTIRE MESH</Text>
           </TouchableOpacity>
        </BlurView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebfbedff' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  hdrCenter: { marginLeft: 16 },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 16, letterSpacing: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: DESIGN.primary },
  headerSub: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 7, letterSpacing: 1 },
  refreshBtn: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },

  tabFrame: { flexDirection: 'row', marginHorizontal: 24, padding: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 16 },
  tabActive: { backgroundColor: '#1E2F23' },
  tabText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 9, letterSpacing: 1 },
  tabTextActive: { color: '#FFF' },

  content: { padding: 24, paddingBottom: 150 },
  loadingBox: { alignItems: 'center', marginTop: 100, gap: 20 },
  loadingText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10, letterSpacing: 2 },

  visualizerBox: { borderRadius: 32, padding: 24, overflow: 'hidden', marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  vHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  vTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, letterSpacing: 1.5 },
  
  meshCircleBase: { height: 180, alignItems: 'center', justifyContent: 'center' },
  centerNode: { width: 50, height: 50, borderRadius: 25, backgroundColor: DESIGN.primary, alignItems: 'center', justifyContent: 'center', elevation: 10, zIndex: 10 },
  pulseRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: DESIGN.primary, opacity: 0.2 },
  nodeDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', opacity: 0.6 },
  meshStatus: { textAlign: 'center', fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 8, letterSpacing: 2, marginTop: 20 },

  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 9, letterSpacing: 1.5, marginBottom: 20 },
  
  nodeCard: { padding: 20, borderRadius: 28, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  nodeHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  nodeInfo: { flex: 1 },
  nodeName: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 14, letterSpacing: 0.5 },
  nodeType: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, marginTop: 4, letterSpacing: 1 },
  sigBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sigText: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9 },

  nodeBody: { gap: 8, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontFamily: DESIGN.fontLabel, color: '#90A4AE', fontSize: 9 },

  nodeActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  actionPrimary: { backgroundColor: DESIGN.primary },
  actionText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8 },

  bottomPanel: { position: 'absolute', bottom: 30, left: 24, right: 24, borderRadius: 20, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0px 10px 20px rgba(0,0,0,0.1)' }, default: { elevation: 10 } }) },
  broadcastAllBtn: { paddingVertical: 18, alignItems: 'center', backgroundColor: 'rgba(225, 29, 72, 0.1)' },
  broadcastText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#E11D48', fontSize: 9, letterSpacing: 1.5 },
});
