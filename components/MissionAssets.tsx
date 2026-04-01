import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Navigation } from 'lucide-react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { DESIGN } from '@/constants/design';

interface TimelineItem {
  time: string;
  task: string;
}

export const Timeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  return (
    <View style={s.container}>
      <Text style={s.sectionTitle}>Timeline & Milestones</Text>
      
      {items.map((item, idx) => (
        <Animated.View 
          key={idx}
          entering={FadeInRight.delay(idx * 100).duration(400)}
          style={s.timelineRow}
        >
          <View style={s.iconCol}>
            <View style={s.iconBox}>
              <Clock color={DESIGN.primary} size={12} />
            </View>
            {idx < items.length - 1 && <View style={s.line} />}
          </View>
          
          <View style={s.taskBox}>
            <Text style={s.timeText}>{item.time}</Text>
            <Text style={s.taskText}>{item.task}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

export const ResourceGrid: React.FC<{ items: any[] }> = ({ items }) => (
  <View style={s.container}>
    <Text style={s.sectionTitle}>Required Resources</Text>
    <View style={s.grid}>
      {items.map((it, idx) => {
        const displayText = typeof it === 'string' ? it : `${it.label || 'RESOURCE'}: ${it.value || '0'}${it.unit || ''}`;
        return (
          <View key={idx} style={s.gridItem}>
            <Navigation color={DESIGN.primary} size={12} style={{ marginRight: 8 }} />
            <Text style={s.gridText}>{displayText}</Text>
          </View>
        );
      })}
    </View>
  </View>
);

const s = StyleSheet.create({
  container: { marginBottom: 32 },
  sectionTitle: { fontFamily: DESIGN.fontBlack, color: DESIGN.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  iconCol: { alignItems: 'center', marginRight: 16 },
  iconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: DESIGN.primary + '15', borderWidth: 1, borderColor: DESIGN.primary + '30', alignItems: 'center', justifyContent: 'center' },
  line: { width: 1, height: 40, backgroundColor: DESIGN.primary + '20', marginTop: 8 },
  taskBox: { flex: 1, backgroundColor: DESIGN.bgCard, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: DESIGN.borderDefault, shadowColor: DESIGN.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  timeText: { fontFamily: DESIGN.fontBlack, color: DESIGN.primary, fontSize: 10, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' },
  taskText: { fontFamily: DESIGN.fontBold, color: DESIGN.textPrimary, fontSize: 14, lineHeight: 20 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { backgroundColor: DESIGN.bgCard, borderWidth: 1, borderColor: DESIGN.borderDefault, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: DESIGN.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  gridText: { fontFamily: DESIGN.fontBlack, color: DESIGN.textPrimary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }
});
