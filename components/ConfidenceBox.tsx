import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert, Database, Cpu, Zap } from 'lucide-react-native';
import { DESIGN } from '@/constants/design';

interface ConfidenceBoxProps {
  data: number;
  rule: number;
  ai: number;
}

export const ConfidenceBox: React.FC<ConfidenceBoxProps> = ({ data, rule, ai }) => {
  const overall = Math.round((data + rule + ai) / 3);

  const StatBar = ({ label, value, icon: Icon, color }: any) => (
    <View style={s.statRow}>
      <View style={s.statLeft}>
        <Icon color={color} size={14} style={{ marginRight: 8 }} />
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <View style={s.statRight}>
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${value}%`, backgroundColor: color }]} />
        </View>
        <Text style={[s.statVal, { color }]}>{value}%</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.bgIcon}>
        <ShieldAlert color={DESIGN.borderDefault} size={80} />
      </View>

      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>Analysis Confidence</Text>
          <Text style={s.headerTitle}>{overall}%</Text>
        </View>
        <View style={s.statusBadge}>
          <Text style={s.statusText}>VERIFIED</Text>
        </View>
      </View>

      <View style={s.statsContainer}>
        <StatBar label="Data Integrity" value={data} icon={Database} color={DESIGN.primary} />
        <StatBar label="Rule Certainty" value={rule} icon={Zap} color={DESIGN.warning} />
        <StatBar label="Neural Inference" value={ai} icon={Cpu} color={DESIGN.primaryDeep || DESIGN.primary} />
      </View>

      <Text style={s.footerNote}>
        * Based on local RAG context + cross-verified safety rules.
      </Text>
    </View>
  );
};

const s = StyleSheet.create({
  container: { backgroundColor: DESIGN.bgCard, borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden', shadowColor: DESIGN.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  bgIcon: { position: 'absolute', top: -10, right: -10, opacity: 0.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  headerSub: { fontFamily: DESIGN.fontBlack, color: DESIGN.primary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontFamily: DESIGN.fontBlack, color: DESIGN.textPrimary, fontSize: 36 },
  statusBadge: { backgroundColor: DESIGN.primary + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: DESIGN.primary + '20' },
  statusText: { fontFamily: DESIGN.fontBlack, color: DESIGN.primary, fontSize: 9, letterSpacing: 1.5 },
  statsContainer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: DESIGN.borderSubtle },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  statLeft: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontFamily: DESIGN.fontBold, fontSize: 11, color: DESIGN.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  statRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barTrack: { width: 80, height: 6, backgroundColor: DESIGN.bgSurface, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  statVal: { fontFamily: DESIGN.fontBlack, fontSize: 11 },
  footerNote: { fontFamily: DESIGN.fontBold, fontSize: 9, color: DESIGN.textMuted, marginTop: 8, letterSpacing: 1, fontStyle: 'italic', textTransform: 'uppercase' }
});
