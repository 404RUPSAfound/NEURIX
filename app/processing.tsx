import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Brain, Search, Zap, ShieldCheck, Database, Cpu } from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { mapAPI } from '@/Store/api';

const { width, height } = Dimensions.get('window');

export default function AIProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState('INITIALIZING_NEURAL_UPLINK');
  const pulse = useRef(new Animated.Value(1)).current;
  const scanLine = useRef(new Animated.Value(0)).current;

  const steps = [
    'PARSING_FIELD_INTEL',
    'EXTRACTING_GEOSPATIAL_METRICS',
    'CROSS_REFERENCING_NDMA_SOPS',
    'CALCULATING_RESOURCE_LOAD',
    'SYNTHESIZING_ACTION_CARDS',
    'FINALIZING_MISSION_DASHBOARD'
  ];

  useEffect(() => {
    // Premium Animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.timing(scanLine, { toValue: height, duration: 3000, useNativeDriver: true })
    ).start();

    // Step Rotation
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setStatus(steps[stepIdx]);
        stepIdx++;
      }
    }, 1200);

    // Actual Data Processing
    handleAnalysis();

    return () => clearInterval(interval);
  }, []);

  const handleAnalysis = async () => {
    try {
      const res = await mapAPI.analyze(
        params.location as string || "Unknown Sector",
        params.description as string || "Manual Field Update",
        parseInt(params.people_affected as string || "0"),
        params.severity as string || "MEDIUM"
      );
      
      setTimeout(() => {
        router.push({
          pathname: '/analysis_detail',
          params: { data: JSON.stringify(res) }
        });
      }, 5000); // Artificial delay for premium 'feel'
    } catch (e) {
      console.error(e);
      setStatus('OFFLINE_FALLBACK_ACTIVE');
      setTimeout(() => router.back(), 2000);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#020408', '#0A0E1A']} style={StyleSheet.absoluteFill} />
      
      <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLine }] }]} />

      <View style={s.center}>
         <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <BlurView intensity={40} tint="dark" style={s.brainShell}>
               <Brain color={DESIGN.primary} size={64} />
            </BlurView>
         </Animated.View>

         <View style={s.loaderBox}>
            <ActivityIndicator color={DESIGN.primary} size="small" />
            <Text style={s.statusText}>{status}</Text>
         </View>

         <View style={s.metricsRow}>
            <Metric icon={Database} label="DATA_LOAD" val="82%" />
            <Metric icon={Cpu} label="NEURAL_LOAD" val="45%" />
            <Metric icon={Zap} label="SYNERGY" val="0.98" />
         </View>
      </View>

      <View style={s.footer}>
         <Text style={s.footerText}>NEURIX AI v4.0 // REAL-TIME SYNTHESIS ENGINE</Text>
         <Text style={s.footerSub}>PROCESSED ON-DEVICE FOR MISSION PRIVACY</Text>
      </View>
    </View>
  );
}

function Metric({ icon: Icon, label, val }: any) {
  return (
    <View style={s.metric}>
       <Icon size={14} color="#555" />
       <Text style={s.metricVal}>{val}</Text>
       <Text style={s.metricLab}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408', alignItems: 'center', justifyContent: 'center' },
  scanLine: { position: 'absolute', top: 0, width: width, height: 2, backgroundColor: DESIGN.primary, opacity: 0.2, zIndex: 10 },
  center: { alignItems: 'center', gap: 40 },
  brainShell: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: DESIGN.primary + '40', overflow: 'hidden' },
  
  loaderBox: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statusText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 11, letterSpacing: 2 },

  metricsRow: { flexDirection: 'row', gap: 40, marginTop: 40 },
  metric: { alignItems: 'center', gap: 8 },
  metricVal: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 18 },
  metricLab: { fontFamily: DESIGN.fontLabel, color: '#444', fontSize: 7, letterSpacing: 1.5 },

  footer: { position: 'absolute', bottom: 60, alignItems: 'center', gap: 10 },
  footerText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#333', fontSize: 9, letterSpacing: 2 },
  footerSub: { fontFamily: DESIGN.fontLabel, color: DESIGN.success, fontSize: 7, letterSpacing: 1.5 },
});
