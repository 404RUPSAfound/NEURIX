import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { DESIGN } from '@/constants/design';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface PriorityCardProps {
  title: string;
  description: string;
  why: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isNew?: boolean;
  isModified?: boolean;
}

export const PriorityCard: React.FC<PriorityCardProps> = ({ title, description, why, priority, isNew, isModified }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const priorityColor = (priority as any) === 'CRITICAL' || priority === 'HIGH' ? DESIGN.primary : priority === 'MEDIUM' ? DESIGN.secondary : DESIGN.success;
  const statusColor = isNew ? DESIGN.danger : isModified ? DESIGN.warning : 'transparent';

  return (
    <View style={s.card}>
      {statusColor !== 'transparent' && (
        <View style={{ backgroundColor: statusColor, height: 4, width: '100%' }} />
      )}
      
      <Pressable onPress={toggleExpand} style={s.cardBody}>
        <View style={s.headerRow}>
          <View style={s.titleBox}>
            <View style={[s.badgeBadge, { backgroundColor: priorityColor + '15', borderColor: priorityColor + '30' }]}>
              <Text style={[s.badgeText, { color: priorityColor }]}>{priority}</Text>
            </View>
            <Text style={s.title}>{title}</Text>
          </View>
          {expanded ? <ChevronUp color={DESIGN.textMuted} size={20} /> : <ChevronDown color={DESIGN.textMuted} size={20} />}
        </View>

        <Text style={s.desc}>{description}</Text>

        <View style={s.footerRow}>
          <View style={s.gapRow}>
            {isNew && <Text style={[s.flagText, { color: DESIGN.danger }]}>NEW ALERT</Text>}
            {isModified && <Text style={[s.flagText, { color: DESIGN.warning }]}>UPDATED PLAN</Text>}
          </View>
          
          <Pressable onPress={toggleExpand} style={s.whyBtn}>
            <Info color={priorityColor} size={12} style={{ marginRight: 6 }} />
            <Text style={s.whyTxt}>Why this?</Text>
          </Pressable>
        </View>

        {expanded && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={s.expandedBox}>
            <Text style={s.expandedLabel}>AI Rationale</Text>
            <View style={s.rationaleBox}>
              <Text style={s.rationaleTxt}>"{why}"</Text>
            </View>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  card: { backgroundColor: DESIGN.bgCard, marginBottom: 16, borderRadius: 24, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden', shadowColor: DESIGN.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardBody: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  titleBox: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  badgeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginRight: 12 },
  badgeText: { fontFamily: DESIGN.fontBlack, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: DESIGN.fontBold, fontSize: 16, color: DESIGN.textPrimary, flex: 1, lineHeight: 22 },
  desc: { fontFamily: DESIGN.fontMedium, fontSize: 13, color: DESIGN.textSecondary, marginBottom: 16, lineHeight: 20 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gapRow: { flexDirection: 'row', gap: 8 },
  flagText: { fontFamily: DESIGN.fontBlack, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  whyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.bgSurface, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: DESIGN.borderSubtle },
  whyTxt: { fontFamily: DESIGN.fontBold, fontSize: 10, color: DESIGN.textMuted },
  expandedBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: DESIGN.borderSubtle },
  expandedLabel: { fontFamily: DESIGN.fontBlack, fontSize: 9, color: DESIGN.primary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  rationaleBox: { backgroundColor: DESIGN.primary + '05', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: DESIGN.primary + '10' },
  rationaleTxt: { fontFamily: DESIGN.fontMedium, fontSize: 13, color: DESIGN.textSecondary, fontStyle: 'italic', lineHeight: 20 }
});
