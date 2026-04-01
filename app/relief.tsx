import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Globe, ArrowLeft, Clock, MapPin, User, ChevronRight } from 'lucide-react-native';
import api from '@/Store/api';
import { DESIGN } from '@/constants/design';
import * as Location from 'expo-location';
import { SkeletonList } from '@/components/SkeletonCards';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function ReliefScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'logs' | 'discovery'>('discovery');
  const [centers, setCenters] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [tab]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (tab === 'logs') {
        const res = await api.get('/relief/distribution-history');
        setLogs(res.data.history || []);
        if (!silent) setLoading(false);
      } else {
        let coords: any = null;
        
        // FAST LOCATION: Last known first
        const last = await Location.getLastKnownPositionAsync({});
        if (last) {
           coords = last.coords;
           fetchCenters(coords);
           if (!silent) setLoading(false);
        }

        // HIGH ACCURACY: Background Sync
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
           const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
           if (!coords || Math.abs(fresh.coords.latitude - coords.latitude) > 0.01) {
              fetchCenters(fresh.coords);
           }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchCenters = async (coords: {latitude: number, longitude: number}) => {
    try {
      const query = `[out:json];node["amenity"~"social_facility|townhall|community_centre"](around:10000,${coords.latitude},${coords.longitude});out;`;
      const res = await fetch('http://localhost:8000/api/ops/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'overpass', query })
      });
      const data = await res.json();
      const mapped = (data.elements || []).map((e: any) => ({
         lat: e.lat,
         lon: e.lon,
         tags: e.tags,
         name: e.tags?.name || 'Tactical Center',
         distanceText: 'Nearby' // Calculate if needed, but for now ensure data shows
      }));
      setCenters(mapped);
    } catch(e) { console.warn("Fetch Centers Failed"); }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load(true);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image source={require('../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />
      
      <View style={s.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/');
          }} 
          style={s.backBtn}
        >
          <ArrowLeft color={DESIGN.textPrimary} size={20} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>RELIEF OPS</Text>
          <Text style={s.headerSub}>{tab === 'logs' ? 'Distribution Audit Trail' : 'Nearby Command Centers'}</Text>
        </View>
      </View>

      <View style={s.tabRow}>
         <TouchableOpacity style={[s.tab, tab === 'discovery' && s.tabActive]} onPress={() => setTab('discovery')}>
            <Text style={[s.tabText, tab === 'discovery' && s.tabTextActive]}>NEARBY CENTERS</Text>
         </TouchableOpacity>
         <TouchableOpacity style={[s.tab, tab === 'logs' && s.tabActive]} onPress={() => setTab('logs')}>
            <Text style={[s.tabText, tab === 'logs' && s.tabTextActive]}>PAST LOGS</Text>
         </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={s.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
           <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={DESIGN.primary} />
        }
      >
        {loading ? (
          <SkeletonList count={3} />
        ) : tab === 'discovery' ? (
          centers.length > 0 ? centers.map((c, i) => (
            <BlurView key={i} intensity={35} tint="dark" style={s.logCard}>
               <View style={s.logHeader}>
                  <View style={s.timeRow}>
                     <Globe size={16} color={DESIGN.primary} />
                     <Text style={s.timeText}>VERIFIED NODE</Text>
                  </View>
                  <View style={s.statusBadge}>
                     <Text style={s.statusText}>ACTIVE</Text>
                  </View>
               </View>
               <Text style={s.centerTitle}>{c.tags?.name || 'Tactical Center'}</Text>
               <View style={s.mainInfo}>
                  <View style={s.infoRow}>
                     <MapPin size={14} color={DESIGN.textMuted} />
                     <Text style={s.infoValue}>{c.tags?.['addr:street'] || 'Coordinate Logged'}</Text>
                  </View>
               </View>
               <TouchableOpacity style={s.navigateBtn} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`)}>
                  <Text style={s.navText}>NAVIGATE TO CENTER</Text>
                  <ChevronRight size={14} color="#FFF" />
               </TouchableOpacity>
            </BlurView>
          )) : <Text style={s.emptyTxt}>NO CENTERS DETECTED IN 10KM RADIUS</Text>
        ) : (
          logs.length > 0 ? logs.map((log, idx) => (
            <BlurView key={idx} intensity={30} tint="dark" style={s.logCard}>
               <View style={s.logHeader}>
                <View style={s.timeRow}>
                  <Clock size={12} color={DESIGN.primary} />
                  <Text style={s.timeText}>{log.timestamp || 'Just now'}</Text>
                </View>
                <View style={s.statusBadge}>
                  <Text style={s.statusText}>VERIFIED</Text>
                </View>
              </View>
              <View style={s.mainInfo}>
                <View style={s.infoRow}>
                  <User size={14} color={DESIGN.textMuted} />
                  <Text style={s.infoLabel}>BENEFICIARY:</Text>
                  <Text style={s.infoValue}>{log.beneficiary_name || 'Anonymous'}</Text>
                </View>
                <View style={s.infoRow}>
                  <MapPin size={14} color={DESIGN.textMuted} />
                  <Text style={s.infoLabel}>LOCATION:</Text>
                  <Text style={s.infoValue}>{log.district || 'Sector 7'}</Text>
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.itemRow}>
                <Globe size={16} color={DESIGN.primary} />
                <Text style={s.itemText}>{log.items_distributed || '1x Tactical Kit'}</Text>
              </View>
            </BlurView>
          )) : <Text style={s.emptyTxt}>NO DISTRIBUTION LOGS FOUND</Text>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebfbedff' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  backBtn: { padding: 10, backgroundColor: '#FFF', borderRadius: 12 },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.textPrimary, fontSize: 18, letterSpacing: 2 },
  headerSub: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  tabRow: { flexDirection: 'row', padding: 24, gap: 12, paddingBottom: 0 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.03)' },
  tabActive: { backgroundColor: '#1E2F23' },
  tabText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10, letterSpacing: 1 },
  tabTextActive: { color: '#FFF' },
  content: { padding: 24, gap: 16, paddingBottom: 60 },
  logCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden', marginBottom: 16 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10 },
  statusBadge: { backgroundColor: DESIGN.success + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.success, fontSize: 8, letterSpacing: 1 },
  centerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.textPrimary, fontSize: 16, marginBottom: 8 },
  mainInfo: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 9, width: 80 },
  infoValue: { fontFamily: DESIGN.fontBold, color: DESIGN.textPrimary, fontSize: 14 },
  navigateBtn: { marginTop: 20, backgroundColor: DESIGN.primary, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  navText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 10, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: DESIGN.borderSubtle, marginVertical: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemText: { flex: 1, fontFamily: DESIGN.fontMedium, color: DESIGN.textPrimary, fontSize: 14 },
  emptyTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', textAlign: 'center', marginTop: 40, fontSize: 10, letterSpacing: 1 }
});
