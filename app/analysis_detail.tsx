import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ShieldCheck, Zap, ArrowLeft, AlertTriangle } from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { PriorityCard } from '@/components/PriorityCard';
import { ConfidenceBox } from '@/components/ConfidenceBox';
import { Timeline, ResourceGrid } from '@/components/MissionAssets';
import { StatusBar } from '@/components/TacticalStatus';

const { width } = Dimensions.get('window');

export default function AnalysisDetailScreen() {
  const { data } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (data) {
      setResult(JSON.parse(data as string));
      setLoading(false);
    }
  }, [data]);

  if (loading || !result) return (
    <View style={s.loadCenter}>
      <ActivityIndicator size="large" color={DESIGN.primary} />
    </View>
  );

  return (
    <View style={s.container}>
      <LinearGradient colors={[DESIGN.bg, DESIGN.bgSurface]} style={StyleSheet.absoluteFill} />
      
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={DESIGN.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>MISSION PARAMETERS</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <StatusBar status="LINK_STABLE" />

        <View style={s.sectionHeader}>
           <Text style={s.sectionTitle}>TACTICAL ACTION CARDS</Text>
        </View>

        {(result.action_cards || result.actions)?.map((item: any, idx: number) => (
          <PriorityCard 
            key={idx}
            title={item.title}
            description={item.task || item.description}
            why={`Assigned to: ${item.team_assigned || 'LOCAL_UNIT'}. Mission critical path identified by Rule #42.`}
            priority={item.priority || 'MEDIUM'}
          />
        ))}

        <View style={s.sectionHeader}>
           <Text style={s.sectionTitle}>MISSION TIMELINE</Text>
        </View>
        <Timeline items={result.timeline || []} />

        <View style={s.sectionHeader}>
           <Text style={s.sectionTitle}>RESOURCE ALLOCATION</Text>
        </View>
        {/* Helper to convert object resources to list */}
        <ResourceGrid 
          items={Array.isArray(result.resources) ? result.resources : 
                 Object.entries(result.resources || {}).map(([k, v]) => ({ label: k.toUpperCase(), value: String(v) }))} 
        />

        <TouchableOpacity style={s.confirmBtn} onPress={() => alert("MISSION_DEPLOYED: Deployment protocol authorized and transmitted to field devices.")}>
          <LinearGradient colors={DESIGN.accentGradient as any} style={s.confirmGradient}>
             <ShieldCheck color="#FFF" size={20} />
             <Text style={s.confirmText}>AUTHORIZE DEPLOYMENT</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGN.bg },
  loadCenter: { flex: 1, backgroundColor: DESIGN.bg, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 20, borderBottomWidth: 1, borderBottomColor: DESIGN.borderSubtle },
  backBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.textPrimary, fontSize: 18, letterSpacing: 2 },
  
  scroll: { padding: 24, paddingBottom: 100 },
  sectionHeader: { marginTop: 32, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: DESIGN.primary, paddingLeft: 12 },
  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 11, letterSpacing: 2 },
  
  confirmBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 40 },
  confirmGradient: { paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  confirmText: { fontFamily: DESIGN.fontDisplay, color: '#FFF', fontSize: 14, letterSpacing: 1 },
});