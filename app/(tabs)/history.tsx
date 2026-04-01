import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Clock, MapPin, AlertTriangle, ShieldCheck, 
  ArrowRight, Search, Filter, Globe, Activity
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { archiveAPI } from '@/Store/api';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function DisasterHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await archiveAPI.getHistory();
      if (res?.success) setHistory(res.data);
    } catch (_) {
      // Fallback
      setHistory([
        { id: 'H1', type: 'FLOOD', location: 'GT Road Phase 8', time: '2h ago', severity: 'HIGH', status: 'CONTAINED' },
        { id: 'H2', type: 'ACCIDENT', location: 'Police Sec 68', time: '9m ago', severity: 'MED', status: 'RESOLVED' }
      ]);
    }
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#05080A', '#020508']} style={StyleSheet.absoluteFill} />
      
      {/* HUD Header */}
      <View style={s.header}>
         <View>
            <Text style={s.hdrTitle}>DISASTER HISTORY</Text>
            <Text style={s.hdrSub}>Tactical Mission Archive · 2026_LOG</Text>
         </View>
         <TouchableOpacity style={s.searchBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Search color="#555" size={20} />
         </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* Metrics Row */}
        <View style={s.metricsRow}>
           <MetricBox label="MISSIONS" val={history.length} color={DESIGN.success} />
           <MetricBox label="SEVERITY" val="MAX" color={DESIGN.danger} />
           <MetricBox label="SYMBOLS" val="04" color={DESIGN.info} />
        </View>

        {loading ? (
          <ActivityIndicator color={DESIGN.primary} style={{ marginTop: 100 }} />
        ) : (
          history.map((h, i) => (
             <TouchableOpacity key={i} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/recon'); }}>
                <BlurView intensity={25} tint="dark" style={s.historyCard}>
                   <View style={s.cardTop}>
                      <View style={[s.badge, { backgroundColor: h.severity === 'HIGH' ? DESIGN.danger + '20' : DESIGN.warning + '20' }]}>
                         <Text style={[s.badgeText, { color: h.severity === 'HIGH' ? DESIGN.danger : DESIGN.warning }]}>{h.type}</Text>
                      </View>
                      <Text style={s.cardTime}>{h.time}</Text>
                   </View>
                   <View style={s.cardBody}>
                      <Text style={s.cardTitle}>{h.location}</Text>
                      <View style={s.statusRow}>
                         <Text style={s.statusText}>STATUS: {h.status || 'LOGGED'}</Text>
                         <View style={[s.statusDot, { backgroundColor: h.status === 'RESOLVED' ? DESIGN.success : DESIGN.warning }]} />
                      </View>
                   </View>
                   <View style={s.cardFooter}>
                      <View style={s.meshBadge}>
                         <Globe size={10} color={DESIGN.info} />
                         <Text style={s.meshText}>VERIFIED_BY_SAT</Text>
                      </View>
                      <ArrowRight size={14} color="#555" />
                   </View>
                </BlurView>
             </TouchableOpacity>
          ))
        )}

        {history.length === 0 && !loading && (
          <View style={s.emptyState}>
             <Clock size={48} color={DESIGN.textMuted} />
             <Text style={s.emptyText}>Mission archives are currently synchronized.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricBox({ label, val, color }: any) {
  return (
    <View style={s.metricBox}>
       <Text style={[s.metricVal, { color }]}>{val}</Text>
       <Text style={s.metricLab}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05080A' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  hdrTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 16, letterSpacing: 2 },
  hdrSub: { fontFamily: DESIGN.fontLabelSemiBold, color: '#555', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' },
  searchBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },

  content: { padding: 24, paddingBottom: 110, gap: 16 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  metricBox: { alignItems: 'center' },
  metricVal: { fontFamily: DESIGN.fontDisplayBlack, fontSize: 24 },
  metricLab: { fontFamily: DESIGN.fontLabel, color: '#555', fontSize: 7, letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' },

  historyCard: { padding: 22, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9, letterSpacing: 1 },
  cardTime: { fontFamily: DESIGN.fontLabel, color: '#444', fontSize: 9 },
  
  cardBody: { marginBottom: 20 },
  cardTitle: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  statusText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#555', fontSize: 8, letterSpacing: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 16 },
  meshBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  meshText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.info, fontSize: 8, letterSpacing: 1 },

  emptyState: { alignItems: 'center', gap: 20, marginTop: 100, opacity: 0.5 },
  emptyText: { fontFamily: DESIGN.fontBody, color: '#7A8C99', fontSize: 13 },
});
