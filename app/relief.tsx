import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Globe, ArrowLeft, Clock, MapPin, User, ChevronRight } from 'lucide-react-native';
import api from '@/Store/api';
import { DESIGN } from '@/constants/design';

export default function ReliefScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/relief/distribution-history');
        setLogs(res.data.history || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={[DESIGN.bg, DESIGN.bgSurface]} style={StyleSheet.absoluteFill} />
      
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
          <Text style={s.headerTitle}>RELIEF LOGS</Text>
          <Text style={s.headerSub}>Distribution Audit Trail</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={DESIGN.primary} style={{ marginTop: 100 }} />
        ) : (
          logs.map((log, idx) => (
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
                <ChevronRight size={14} color={DESIGN.textMuted} />
              </View>
            </BlurView>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGN.bg },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 20, borderBottomWidth: 1, borderBottomColor: DESIGN.borderSubtle },
  backBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.textPrimary, fontSize: 18, letterSpacing: 2 },
  headerSub: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },

  content: { padding: 24, gap: 16, paddingBottom: 60 },
  logCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: DESIGN.borderDefault, overflow: 'hidden' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10 },
  statusBadge: { backgroundColor: DESIGN.success + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.success, fontSize: 8, letterSpacing: 1 },

  mainInfo: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 9, width: 80 },
  infoValue: { fontFamily: DESIGN.fontBold, color: DESIGN.textPrimary, fontSize: 14 },

  divider: { height: 1, backgroundColor: DESIGN.borderSubtle, marginVertical: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemText: { flex: 1, fontFamily: DESIGN.fontMedium, color: DESIGN.textPrimary, fontSize: 14 },
});
