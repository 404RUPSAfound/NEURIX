import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, Alert, LayoutAnimation,
  UIManager, Platform, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Clock, ShieldCheck, Zap, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Share2, Printer } from 'lucide-react-native';
import { DESIGN } from '@/constants/design';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function ActionCard({ card }: { card: any }) {
  const [expanded, setExpanded] = useState(false);
  const color = card.priority === 'CRITICAL' ? DESIGN.danger : card.priority === 'HIGH' ? DESIGN.warning : DESIGN.success;

  return (
    <BlurView intensity={30} tint="dark" style={[s.card, { borderLeftColor: color }]}>
      <View style={s.cardHeader}>
        <View style={[s.prioBadge, { backgroundColor: color + '20' }]}>
          <Text style={[s.prioText, { color: color }]}>{card.priority}</Text>
        </View>
        <Text style={s.cardTime}>{card.time || 'T+00:00'}</Text>
      </View>

      <Text style={s.cardTitle}>{card.title}</Text>
      <Text style={s.cardDetail}>{card.detail}</Text>

      {card.why && (
        <TouchableOpacity style={s.expandBtn} onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpanded(!expanded);
        }}>
          <Text style={[s.expandText, { color: color }]}>{expanded ? 'COLLAPSE INTEL' : 'VIEW RATIONALE'}</Text>
          {expanded ? <ChevronUp size={14} color={color} /> : <ChevronDown size={14} color={color} />}
        </TouchableOpacity>
      )}

      {expanded && (
        <View style={s.intelBox}>
          <Text style={s.intelTitle}>NEURAL RATIONALE</Text>
          <Text style={s.intelText}>{card.why}</Text>
          {card.sop_ref && (
            <View style={s.sopRow}>
              <Text style={s.sopLabel}>REF:</Text>
              <Text style={s.sopValue}>{card.sop_ref}</Text>
            </View>
          )}
        </View>
      )}
    </BlurView>
  );
}

export default function ResultsScreen() {
  const router = useRouter();
  const { data: rawData } = useLocalSearchParams();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (rawData) {
      try {
        setData(JSON.parse(rawData as string));
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }).start();
      } catch (e) {
        Alert.alert('Data Error', 'Could not parse mission results.');
      }
    }
  }, [rawData]);

  if (!data) return (
    <View style={s.loadCenter}>
      <ActivityIndicator size="large" color={DESIGN.primary} />
    </View>
  );

  const { situation, action_cards, resources, timeline } = data;

  return (
    <View style={s.container}>
      <LinearGradient colors={[DESIGN.bg, DESIGN.bgSurface]} style={StyleSheet.absoluteFill} />
      
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/')}>
          <ArrowLeft color={DESIGN.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>MISSION INTEL</Text>
        <TouchableOpacity style={s.iconBtn}>
          <Share2 color={DESIGN.textPrimary} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Situation Summary */}
          <BlurView intensity={40} tint="dark" style={s.sitCard}>
            <View style={s.sitHeader}>
               <Text style={s.sitLabel}>SITUATION ANALYSIS</Text>
               <View style={[s.sevBadge, { backgroundColor: situation.severity === 'CRITICAL' ? DESIGN.danger + '20' : DESIGN.warning + '20' }]}>
                 <Text style={[s.sevText, { color: situation.severity === 'CRITICAL' ? DESIGN.danger : DESIGN.warning }]}>{situation.severity}</Text>
               </View>
            </View>
            <Text style={s.sitTitle}>{situation.title}</Text>
            <Text style={s.sitDesc}>{situation.description}</Text>
            
            <View style={s.statGrid}>
              {[
                { label: 'AFFECTED', val: situation.stats.affected },
                { label: 'INJURED', val: situation.stats.injured },
                { label: 'VILLAGES', val: situation.stats.villages },
                { label: 'CONFIDENCE', val: `${situation.stats.confidence}%` },
              ].map((st, i) => (
                <View key={i} style={s.statItem}>
                  <Text style={s.statVal}>{st.val}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
          </BlurView>

          {/* Action Plan */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>DEPLOYMENT PLAN</Text>
            <Text style={s.sectionBadge}>{action_cards?.length || 0} TASKS</Text>
          </View>

          {action_cards?.map((card: any, i: number) => (
            <ActionCard key={i} card={card} />
          ))}

          {/* Logistics Summary */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>LOGISTICS REQUIREMENTS</Text>
          </View>
          <View style={s.resGrid}>
            {resources?.map((r: any, i: number) => (
              <BlurView key={i} intensity={30} tint="dark" style={s.resCard}>
                <Text style={s.resVal}>{r.value}</Text>
                <Text style={s.resLbl}>{r.label}</Text>
                <Text style={s.resUnit}>{r.unit}</Text>
              </BlurView>
            ))}
          </View>

          <TouchableOpacity style={s.actionBtn} onPress={() => router.replace('/')}>
            <LinearGradient colors={DESIGN.accentGradient as any} style={s.btnGradient}>
               <CheckCircle2 color="#FFF" size={20} />
               <Text style={s.btnText}>ACKNOWLEDGE MISSION PLAN</Text>
            </LinearGradient>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGN.bg },
  loadCenter: { flex: 1, backgroundColor: DESIGN.bg, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: DESIGN.borderSubtle },
  backBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.textPrimary, fontSize: 18, letterSpacing: 2 },
  iconBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
  
  scroll: { padding: 24, paddingBottom: 100 },
  sitCard: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden', marginBottom: 40 },
  sitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sitLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 2 },
  sevBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sevText: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9, letterSpacing: 1 },
  sitTitle: { fontFamily: DESIGN.fontDisplay, color: DESIGN.textPrimary, fontSize: 24, marginBottom: 12 },
  sitDesc: { fontFamily: DESIGN.fontBody, color: DESIGN.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 24 },
  
  statGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 20 },
  statItem: { alignItems: 'center' },
  statVal: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.textPrimary, fontSize: 18 },
  statLabel: { fontFamily: DESIGN.fontLabel, color: DESIGN.textMuted, fontSize: 8, marginTop: 4, letterSpacing: 1 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 11, letterSpacing: 2 },
  sectionBadge: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10 },
  
  card: { padding: 20, borderRadius: 24, borderLeftWidth: 6, borderWidth: 1, borderColor: DESIGN.borderDefault, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  prioBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  prioText: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 10, letterSpacing: 1 },
  cardTime: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 10 },
  cardTitle: { fontFamily: DESIGN.fontBold, color: DESIGN.textPrimary, fontSize: 16, marginBottom: 6 },
  cardDetail: { fontFamily: DESIGN.fontBody, color: DESIGN.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  expandText: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 11, letterSpacing: 1 },
  intelBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  intelTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 9, letterSpacing: 2, marginBottom: 8 },
  intelText: { fontFamily: DESIGN.fontBody, color: DESIGN.textSecondary, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  sopRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sopLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 10 },
  sopValue: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10 },
  
  resGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
  resCard: { width: (width - 60) / 2, padding: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden' },
  resVal: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.textPrimary, fontSize: 32 },
  resLbl: { fontFamily: DESIGN.fontBold, color: DESIGN.textSecondary, fontSize: 12, textAlign: 'center' },
  resUnit: { fontFamily: DESIGN.fontLabel, color: DESIGN.textMuted, fontSize: 9, marginTop: 4 },
  
  actionBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 20 },
  btnGradient: { paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  btnText: { fontFamily: DESIGN.fontDisplay, color: '#FFF', fontSize: 14, letterSpacing: 1 },
});
