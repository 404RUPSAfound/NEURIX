import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Image, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  ArrowLeft, AlertTriangle, CloudRain, 
  Sun, Wind, Thermometer, Droplets, 
  Bell, Activity, Zap, Info, ShieldAlert,
  CloudLightning, Waves, Flame
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { router } from 'expo-router';
import { fetchWeatherAlerts } from '@/Store/realData';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function AlertsDetail() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const result = await fetchWeatherAlerts(loc.coords.latitude, loc.coords.longitude);
      setData(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getAlertIcon = (type: string) => {
    if (type.includes('RAIN')) return CloudRain;
    if (type.includes('WIND') || type.includes('STORM') || type.includes('CYCLONE')) return Wind;
    if (type.includes('HEAT')) return Thermometer;
    if (type.includes('FLOOD')) return Waves;
    if (type.includes('FIRE')) return Flame;
    if (type.includes('LIGHTNING')) return CloudLightning;
    return AlertTriangle;
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
          <Text style={s.headerTitle}>TACTICAL ALERTS</Text>
          <Text style={s.headerSub}>INDIA SECTOR MONITORING</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={load}>
          <Activity color={DESIGN.primary} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={DESIGN.primary} size="large" />
            <Text style={s.loadingText}>SCANNING ATMOSPHERIC THREATS...</Text>
          </View>
        ) : (
          <>
            {/* CURRENT WEATHER OVERVIEW */}
            <BlurView intensity={30} tint="dark" style={s.weatherSummary}>
                <View style={s.summaryLeft}>
                   <Text style={s.tempText}>{data?.current?.temp}</Text>
                   <Text style={s.condText}>{data?.current?.condition.toUpperCase()}</Text>
                   <Text style={s.locText}>FEELS LIKE {data?.current?.feelsLike}</Text>
                </View>
                <View style={s.summaryRight}>
                   <View style={s.metricItem}>
                      <Droplets size={12} color={DESIGN.primary} />
                      <Text style={s.metricVal}>{data?.current?.humidity}</Text>
                   </View>
                   <View style={s.metricItem}>
                      <Wind size={12} color={DESIGN.primary} />
                      <Text style={s.metricVal}>{data?.current?.windSpeed}</Text>
                   </View>
                   <View style={s.metricItem}>
                      <CloudRain size={12} color={DESIGN.primary} />
                      <Text style={s.metricVal}>{data?.current?.rain}</Text>
                   </View>
                </View>
            </BlurView>

            <Text style={s.sectionTitle}>ACTIVE THREAT LEVEL: {data?.alertCount > 0 ? 'ADVISORY' : 'OPTIMAL'}</Text>

            {data?.alerts?.map((alert: any, i: number) => {
              const Icon = getAlertIcon(alert.type);
              const isCrit = alert.severity === 'CRITICAL';
              const cardColor = isCrit ? '#E11D48' : '#D97706';
              const cardBg = isCrit ? 'rgba(225, 29, 72, 0.05)' : 'rgba(217, 119, 6, 0.05)';

              return (
                <BlurView key={i} intensity={25} tint="dark" style={[s.alertCard, { borderColor: cardColor }]}>
                  <View style={s.cardHdr}>
                     <View style={[s.iconBox, { backgroundColor: cardColor }]}>
                        <Icon size={20} color="#FFF" />
                     </View>
                     <View style={s.hdrInfo}>
                        <Text style={[s.alertType, { color: cardColor }]}>{alert.type.replace('_', ' ')}</Text>
                        <Text style={s.alertTime}>{alert.time}</Text>
                     </View>
                     <View style={[s.sevBadge, { backgroundColor: cardColor }]}>
                        <Text style={s.sevText}>{alert.severity}</Text>
                     </View>
                  </View>
                  <Text style={s.alertDetail}>{alert.detail}</Text>
                  
                  <View style={s.actionRow}>
                     <TouchableOpacity style={[s.actionBtn, { borderColor: cardColor }]}>
                        <Info size={14} color={cardColor} />
                        <Text style={[s.actionTxt, { color: cardColor }]}>SOP ANALYSIS</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[s.actionBtn, { backgroundColor: cardColor, borderColor: cardColor }]}>
                        <ShieldAlert size={14} color="#FFF" />
                        <Text style={[s.actionTxt, { color: '#FFF' }]}>ACTION PLAN</Text>
                     </TouchableOpacity>
                  </View>
                </BlurView>
              );
            })}

            <Text style={s.sectionTitle}>72-HOUR OUTLOOK</Text>
            
            <View style={s.forecastGrid}>
               {data?.forecast?.map((f: any, i: number) => (
                 <View key={i} style={s.forecastCol}>
                    <Text style={s.fDate}>{i === 0 ? 'TODAY' : new Date(f.date).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</Text>
                    <Text style={s.fTemp}>{f.maxTemp}°</Text>
                    <Text style={s.fCond}>{f.condition.split(' ')[0]}</Text>
                 </View>
               ))}
            </View>

            <View style={s.disclaimerBox}>
               <Activity size={12} color="#90A4AE" />
               <Text style={s.disclaimerText}>DATA AGGREGATED FROM OPEN-METEO & WORLD METEOROLOGICAL ORGANIZATION. LIVE MONITORING ENABLED.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
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

  weatherSummary: { borderRadius: 32, padding: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryLeft: { flex: 1 },
  tempText: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 42, lineHeight: 50 },
  condText: { fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 12, letterSpacing: 1.5, marginTop: 4 },
  locText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1, marginTop: 4 },
  summaryRight: { gap: 12 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  metricVal: { fontFamily: DESIGN.fontLabelSemiBold, color: '#1E2F23', fontSize: 10 },

  sectionTitle: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 9, letterSpacing: 2, marginBottom: 20 },
  
  alertCard: { padding: 24, borderRadius: 32, marginBottom: 20, borderLeftWidth: 6, overflow: 'hidden' },
  cardHdr: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hdrInfo: { flex: 1, marginLeft: 16 },
  alertType: { fontFamily: DESIGN.fontDisplayBlack, fontSize: 14, letterSpacing: 1 },
  alertTime: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1, marginTop: 4 },
  sevBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sevText: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 8, letterSpacing: 1 },
  
  alertDetail: { fontFamily: DESIGN.fontBody, color: '#1E2F23', fontSize: 12, lineHeight: 18, marginBottom: 20 },
  
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionTxt: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9, letterSpacing: 1 },

  forecastGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  forecastCol: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 16, alignItems: 'center', ...Platform.select({ web: { boxShadow: '0px 4px 10px rgba(0,0,0,0.03)' }, default: { elevation: 2 } }) },
  fDate: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8, letterSpacing: 1 },
  fTemp: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 18, marginVertical: 8 },
  fCond: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8 },

  disclaimerBox: { flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.6 },
  disclaimerText: { flex: 1, fontFamily: DESIGN.fontLabel, color: '#90A4AE', fontSize: 7, letterSpacing: 1 },
});
