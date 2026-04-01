import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Image, Linking, Platform, Animated, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  ArrowLeft, Heart, Navigation, Phone, 
  MapPin, Globe, Clock, ShieldCheck, 
  Plus, Hospital, Info, ChevronRight, Activity, Zap, LifeBuoy, UserCheck
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { router } from 'expo-router';
import { fetchNearbyHospitals } from '@/Store/realData';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { SkeletonList } from '@/components/SkeletonCards';

const { width } = Dimensions.get('window');

export default function HospitalsDetail() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    load();
  }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let coords: any = null;
      
      // FAST LOCATION: Last known first
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
         coords = last.coords;
         fetchHospitals(coords);
         if (!silent) setLoading(false);
      }

      // HIGH ACCURACY: Background Sync
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
         const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
         if (!coords || Math.abs(fresh.coords.latitude - coords.latitude) > 0.01) {
            fetchHospitals(fresh.coords);
         }
      }
    } catch (e) {
      console.warn("Medical radar offline");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchHospitals = async (coords: {latitude: number, longitude: number}) => {
    try {
      const result = await fetchNearbyHospitals(coords.latitude, coords.longitude);
      setData(result);
    } catch(e) { console.error("Hospital Fetch Failed", e); }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load(true);
  };

  const openMaps = (lat: number, lng: number, name: string) => {
    // Coordinate Sanitization
    const validLat = typeof lat === 'number' && !isNaN(lat) ? lat : null;
    const validLng = typeof lng === 'number' && !isNaN(lng) ? lng : null;

    if (!validLat || !validLng) {
      // Fallback to searching by name if coordinates are missing
      const searchUrl = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(name)}`,
        android: `geo:0,0?q=${encodeURIComponent(name)}`,
        default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
      });
      if (searchUrl) {
         if (Platform.OS === 'web') window.open(searchUrl, '_blank');
         else Linking.openURL(searchUrl);
      }
      return;
    }

    const latLng = `${validLat},${validLng}`;
    const label = encodeURIComponent(name);
    
    if (Platform.OS === 'web') {
      const url = `https://www.google.com/maps/search/?api=1&query=${latLng}`;
      const win = window.open(url, '_blank');
      if (!win) {
         // Fallback if popup is blocked
         Linking.openURL(url);
      }
      return;
    }

    const scheme = Platform.select({
      ios: `maps:0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`
    });

    if (scheme) {
      if ((Platform.OS as string) !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          "MISSION_NAVIGATE",
          `Deploying route to ${name}. Proceed to external tactical map?`,
          [
            { text: "ABORT", style: "cancel" },
            { text: "PROCEED", onPress: () => {
              Linking.openURL(scheme).catch(() => {
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
              });
            }}
          ]
        );
      } else {
        Linking.openURL(scheme).catch(() => {
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
        });
      }
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image source={require('../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <ArrowLeft color="#1E2F23" size={20} />
        </TouchableOpacity>
        <View style={s.hdrCenter}>
          <Text style={s.headerTitle}>MEDICAL FACILITIES</Text>
          <Text style={s.headerSub}>REAL-TIME NEARBY NODES</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/triage'); }}>
          <UserCheck color={DESIGN.primary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.refreshBtn, { marginLeft: 8 }]} onPress={() => load()}>
          <Zap color={DESIGN.primary} size={18} />
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
          <SkeletonList count={4} />
        ) : data.length === 0 ? (
          <View style={s.emptyBox}>
              <Hospital color="#B0BEC5" size={48} />
              <Text style={s.emptyText}>NO FACILITIES DETECTED WITHIN 10KM</Text>
              <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
                <Text style={s.retryText}>REFETCH STATIONS</Text>
              </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.summaryRow}>
               <View style={s.summaryCard}>
                  <Text style={s.sumVal}>{data.length}</Text>
                  <Text style={s.sumLbl}>TOTAL UNITS</Text>
               </View>
               <View style={s.summaryCard}>
                  <Text style={s.sumVal}>{data.filter(h => h.emergency).length || '0'}</Text>
                  <Text style={s.sumLbl}>EMERGENCY</Text>
               </View>
            </View>

            <Text style={s.sectionTitle}>PRIORITY 1: CLOSEST UNITS</Text>

            {data.map((h, i) => {
              const eta = Math.round((h.distance / 30) * 60) + 2; 
              return (
                <BlurView key={h.id || i} intensity={25} tint="dark" style={s.hCard}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); openMaps(h.lat, h.lng, h.name); }}
                  >
                    <View style={s.cardTop}>
                      <View style={s.hIconContainer}>
                         <PulseIndicator active={h.emergency} />
                         <Hospital size={24} color={DESIGN.primary} />
                      </View>
                      <View style={s.hMain}>
                        <Text style={s.hName} numberOfLines={1}>{h.name.toUpperCase()}</Text>
                        <Text style={s.hSpec}>{h.speciality.toUpperCase()}</Text>
                      </View>
                      {h.emergency && (
                        <View style={s.emergBadge}>
                          <Activity size={10} color="#FFF" />
                          <Text style={s.emergText}>24/7 ER</Text>
                        </View>
                      )}
                    </View>

                    <View style={s.distRow}>
                       <MapPin size={10} color={DESIGN.primary} />
                       <Text style={s.distText}>{h.distanceText} · {h.type.replace('_', ' ').toUpperCase()}</Text>
                       <View style={s.dot} />
                       <Clock size={10} color="#90A4AE" />
                       <Text style={s.hoursText}>{h.hours}</Text>
                    </View>

                    {h.address && (
                      <Text style={s.hAddr} numberOfLines={2}>{h.address}</Text>
                    )}

                    <View style={s.hStats}>
                       <View style={s.hStat}>
                          <Clock size={12} color={DESIGN.primary} />
                          <Text style={s.hStatVal}>{eta} MIN</Text>
                          <Text style={s.hStatLbl}>EST REACH</Text>
                       </View>
                       <View style={s.vDivider} />
                       <View style={s.hStat}>
                          <ShieldCheck size={12} color={DESIGN.primary} />
                          <Text style={s.hStatVal}>{h.operator ? h.operator.toUpperCase().slice(0, 10) : 'OPEN'}</Text>
                          <Text style={s.hStatLbl}>OPERATOR</Text>
                       </View>
                       <View style={s.vDivider} />
                       <View style={s.hStat}>
                          <Activity size={12} color={DESIGN.primary} />
                          <Text style={s.hStatVal}>ACTIVE</Text>
                          <Text style={s.hStatLbl}>PROTOCOL</Text>
                       </View>
                    </View>
                  </TouchableOpacity>

                  <View style={s.actions}>
                     <TouchableOpacity 
                        style={[s.actionBtn, { flex: 1.2, backgroundColor: h.phone ? 'rgba(56, 142, 60, 0.1)' : 'rgba(225, 29, 72, 0.1)' }]} 
                        onPress={() => { 
                           Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
                           Linking.openURL(`tel:${h.phone || '108'}`); 
                        }}
                     >
                        <Phone size={16} color={h.phone ? DESIGN.primary : '#E11D48'} />
                        <Text style={[s.btnText, { color: h.phone ? DESIGN.primary : '#E11D48' }]}>
                           {h.phone ? `CALL ${h.name.split(' ')[0]}` : 'DIAL 108 (EMERGENCY)'}
                        </Text>
                     </TouchableOpacity>

                     <TouchableOpacity 
                        style={[s.actionBtn, s.primaryBtn]} 
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); openMaps(h.lat, h.lng, h.name); }}
                     >
                        <Navigation size={16} color="#FFF" />
                        <Text style={[s.btnText, { color: '#FFF' }]}>START NAV</Text>
                     </TouchableOpacity>
                  </View>
                </BlurView>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PulseIndicator({ active }: { active?: boolean }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.5, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        ])
      ).start();
    }
  }, [active]);

  if (!active) return null;
  return (
    <Animated.View style={[s.pulse, { transform: [{ scale: anim }] }]} />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebfbedff' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  hdrCenter: { marginLeft: 16 },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 16, letterSpacing: 2 },
  headerSub: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1.5, marginTop: 4 },
  refreshBtn: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },

  content: { padding: 24, paddingBottom: 150 },
  loadingBox: { alignItems: 'center', marginTop: 100, gap: 20 },
  loadingText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10, letterSpacing: 2 },

  emptyBox: { alignItems: 'center', marginTop: 100, gap: 20 },
  emptyText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10, letterSpacing: 1.5 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: DESIGN.primary },
  retryText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10 },

  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 20, alignItems: 'center', ...Platform.select({ web: { boxShadow: '0px 10px 20px rgba(0,0,0,0.04)' }, default: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10 } }) },
  sumVal: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 24 },
  sumLbl: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 7, letterSpacing: 1, marginTop: 4 },

  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 9, letterSpacing: 2, marginBottom: 20 },
  
  hCard: { padding: 24, borderRadius: 32, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#FFF', ...Platform.select({ web: { boxShadow: '0px 10px 20px rgba(0,0,0,0.05)' }, default: {} }) },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  hIconContainer: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: DESIGN.primary, opacity: 0.1 },
  hMain: { flex: 1, marginLeft: 16 },
  hName: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 14, letterSpacing: 0.5 },
  hSpec: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, letterSpacing: 1, marginTop: 2 },
  emergBadge: { backgroundColor: '#E11D48', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  emergText: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 8 },

  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  distText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 9, letterSpacing: 0.5 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CFD8DC' },
  hoursText: { fontFamily: DESIGN.fontLabel, color: '#90A4AE', fontSize: 9 },

  hAddr: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 11, marginBottom: 20, lineHeight: 16 },
  
  hStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', padding: 16, borderRadius: 20, marginBottom: 20 },
  hStat: { flex: 1, alignItems: 'center' },
  hStatVal: { fontFamily: DESIGN.fontDisplay, color: '#1E2F23', fontSize: 13, marginTop: 4 },
  hStatLbl: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7, letterSpacing: 1, marginTop: 2 },
  vDivider: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.05)' },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  primaryBtn: { flex: 1, backgroundColor: DESIGN.primary, borderColor: DESIGN.primary },
  btnText: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9, letterSpacing: 1 },

  navBtn: { flex: 1, height: 54, borderRadius: 18, overflow: 'hidden' },
  navInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  navText: { fontFamily: DESIGN.fontDisplay, color: '#FFF', fontSize: 12, letterSpacing: 1 },
  callBtn: { height: 54, width: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  callText: { display: 'none' }
});
