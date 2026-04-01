import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Image, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Activity, Globe, AlertTriangle, ChevronRight, Radio } from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { router } from 'expo-router';
import { fetchRealDisasters } from '@/Store/realData';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function DisastersDetail() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'india' | 'global'>('india');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const result = await fetchRealDisasters();
    setData(result);
    setLoading(false);
  };

  const getSevColor = (sev: string) => sev === 'CRITICAL' ? '#E11D48' : sev === 'HIGH' ? '#EF4444' : '#F59E0B';
  const getSevBg = (sev: string) => sev === 'CRITICAL' ? '#FEE2E2' : sev === 'HIGH' ? '#FEE2E2' : '#FEF3C7';

  const items = tab === 'india' ? data?.india : data?.global;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image source={require('../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <ArrowLeft color="#1E2F23" size={20} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>LIVE DISASTERS</Text>
          <Text style={s.headerSub}>USGS VERIFIED · REAL-TIME</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={load}>
          <Activity color={DESIGN.primary} size={18} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === 'india' && s.tabActive]} onPress={() => setTab('india')}>
          <Text style={[s.tabText, tab === 'india' && s.tabTextActive]}>INDIA / SOUTH ASIA ({data?.india?.length || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'global' && s.tabActive]} onPress={() => setTab('global')}>
          <Text style={[s.tabText, tab === 'global' && s.tabTextActive]}>GLOBAL SIGNIFICANT ({data?.global?.length || 0})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={DESIGN.primary} size="large" />
            <Text style={s.loadingText}>FETCHING USGS SEISMIC DATA...</Text>
          </View>
        ) : items?.length === 0 ? (
          <View style={s.emptyBox}>
            <Globe color="#B0BEC5" size={48} />
            <Text style={s.emptyTitle}>NO EVENTS DETECTED</Text>
            <Text style={s.emptyDesc}>No significant seismic activity in this region in the past week.</Text>
          </View>
        ) : (
          items?.map((q: any, i: number) => (
            <TouchableOpacity key={q.id || i} style={s.card} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (q.url) Linking.openURL(q.url);
            }}>
              <View style={s.cardTop}>
                <View style={[s.sevBadge, { backgroundColor: getSevBg(q.severity) }]}>
                  <AlertTriangle size={10} color={getSevColor(q.severity)} />
                  <Text style={[s.sevText, { color: getSevColor(q.severity) }]}>{q.severity}</Text>
                </View>
                <Text style={s.timeText}>{q.timeAgo}</Text>
              </View>

              <Text style={s.cardTitle}>{q.title}</Text>

              <View style={s.statsRow}>
                <View style={s.stat}>
                  <Text style={s.statVal}>M{q.magnitude}</Text>
                  <Text style={s.statLabel}>MAGNITUDE</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statVal}>{q.depth}km</Text>
                  <Text style={s.statLabel}>DEPTH</Text>
                </View>
                <View style={s.stat}>
                  <Text style={[s.statVal, { color: q.tsunami ? '#E11D48' : '#388E3C' }]}>{q.tsunami ? 'YES' : 'NO'}</Text>
                  <Text style={s.statLabel}>TSUNAMI</Text>
                </View>
                {q.felt && (
                  <View style={s.stat}>
                    <Text style={s.statVal}>{q.felt}</Text>
                    <Text style={s.statLabel}>FELT BY</Text>
                  </View>
                )}
              </View>

              <View style={s.cardFooter}>
                <View style={s.coordBadge}>
                  <MapPin size={10} color="#90A4AE" />
                  <Text style={s.coordText}>{q.lat?.toFixed(2)}°N, {q.lng?.toFixed(2)}°E</Text>
                </View>
                <View style={s.statusBadge}>
                  <Radio size={10} color={DESIGN.primary} />
                  <Text style={s.statusText}>{q.status?.toUpperCase() || 'VERIFIED'}</Text>
                </View>
              </View>

              {q.url && (
                <View style={s.linkRow}>
                  <Text style={s.linkText}>VIEW ON USGS →</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebfbedff' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 16, letterSpacing: 2 },
  headerSub: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1, marginTop: 2 },
  refreshBtn: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },

  tabRow: { flexDirection: 'row', marginHorizontal: 24, gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.03)' },
  tabActive: { backgroundColor: '#1E2F23' },
  tabText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1 },
  tabTextActive: { color: '#FFF' },

  content: { padding: 24, paddingBottom: 120, gap: 16 },
  loadingBox: { alignItems: 'center', marginTop: 100, gap: 20 },
  loadingText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 10, letterSpacing: 2 },
  emptyBox: { alignItems: 'center', marginTop: 80, gap: 16 },
  emptyTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 16, letterSpacing: 2 },
  emptyDesc: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 13, textAlign: 'center' },

  card: { backgroundColor: '#FFF', borderRadius: 28, padding: 22, ...Platform.select({ web: { boxShadow: '0px 10px 24px rgba(0,0,0,0.04)' }, default: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12 } }) },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  sevText: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9, letterSpacing: 1 },
  timeText: { fontFamily: DESIGN.fontLabel, color: '#B0BEC5', fontSize: 10 },
  cardTitle: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 17, marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#F8FAF8', borderRadius: 14, padding: 12, alignItems: 'center' },
  statVal: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 18 },
  statLabel: { fontFamily: DESIGN.fontLabel, color: '#B0BEC5', fontSize: 7, letterSpacing: 1, marginTop: 4 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coordBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordText: { fontFamily: DESIGN.fontLabel, color: '#90A4AE', fontSize: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, letterSpacing: 0.5 },

  linkRow: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
  linkText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 1, textAlign: 'center' },
});
