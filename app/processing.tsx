import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { mapAPI } from '@/Store/api';
import { DESIGN } from '@/constants/design';
import { Brain, Terminal, Shield, Zap, Info } from 'lucide-react-native';

const { height, width } = Dimensions.get('window');

/**
 * NEURAL SYNTHESIS ENGINE (HUD)
 * 
 * High-precision situational decomposition interface.
 * Unified ingestion for PDF, Voice, and Visual Field Recon.
 */
export default function Processing() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('INITIALIZING_LINK');
  const [logs, setLogs] = useState<string[]>(['>> NEURIX CORE v4.0 ONLINE', '>> AUTHENTICATED: TACTICAL_COMMAND_1']);
  
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const addLog = (msg: string) => {
    setLogs(prev => [`>> ${msg}`, ...prev].slice(0, 10));
    setStatus(msg);
  };

  useEffect(() => {
    // Holographic Scan Line
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: height, duration: 4000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    ).start();

    // Pulse Logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    handleAnalysis();
  }, []);

  const handleAnalysis = async () => {
    try {
      let situationalIntel = params.description as string || "Baseline Field Report.";
      
      addLog('LIFTING_FIELD_INTEL...');
      await new Promise(r => setTimeout(r, 800));
      
      // PDF DOCUMENT SCANNING
      if (params.fileUri) {
          addLog('PARSING_PDF_TACTICAL_DATA...');
          try {
             let fileToUpload: any;
             if (Platform.OS === 'web') {
                const response = await fetch(params.fileUri as string);
                const blob = await response.blob();
                fileToUpload = new File([blob], params.fileName as string || 'field_intel.pdf', { type: 'application/pdf' });
             } else {
                fileToUpload = { uri: params.fileUri as string, name: params.fileName as string || 'field_intel.pdf', type: 'application/pdf' };
             }
             const scanRes = await mapAPI.scanDocument(fileToUpload);
             if (scanRes.success) {
                situationalIntel += `\n\n[NEURAL_DOC_SCAN]:\n${scanRes.analysis || scanRes.raw_text}`;
                addLog('PDF_INTEL_EXTRACTED_SUCCESS');
             }
          } catch (e) { addLog('DOC_SCAN_BYPASS'); }
      }

      // VISUAL RECON ANALYSIS
      if (params.imageUri) {
          addLog('ANALYZING_FIELD_IMAGERY...');
          try {
             let imgToUpload: any;
             if (Platform.OS === 'web') {
                const response = await fetch(params.imageUri as string);
                const blob = await response.blob();
                imgToUpload = new File([blob], params.imageName as string || 'field_photo.jpg', { type: 'image/jpeg' });
             } else {
                imgToUpload = { uri: params.imageUri as string, name: params.imageName as string || 'field_photo.jpg', type: 'image/jpeg' };
             }
             const imgRes = await mapAPI.scanDocument(imgToUpload);
             if (imgRes.success) {
                situationalIntel += `\n\n[NEURAL_IMAGE_INTEL]:\n${imgRes.analysis || imgRes.raw_text}`;
                addLog('VISUAL_TARGETS_ACQUIRED');
             }
          } catch (e) { addLog('VISUAL_INGESTION_FAILED'); }
      }

      // VOICE DEBRIEF TRANSCRIPTION
      if (params.voiceUri) {
          addLog('DECODING_COMMAND_VOICE...');
          try {
             let audioToUpload: any;
             if (Platform.OS === 'web') {
                const response = await fetch(params.voiceUri as string);
                const blob = await response.blob();
                audioToUpload = new File([blob], 'debrief.m4a', { type: 'audio/m4a' });
             } else {
                audioToUpload = { uri: params.voiceUri as string, name: 'debrief.m4a', type: 'audio/m4a' };
             }
             const voiceRes = await mapAPI.scanVoice(audioToUpload);
             if (voiceRes.success) {
                situationalIntel += `\n\n[VOICE_DEBRIEF]:\n${voiceRes.analysis || voiceRes.transcription}`;
                addLog('VOICE_SENTIMENTS_MAPPED');
             }
          } catch (e) { addLog('VOICE_SYNC_TIMEOUT'); }
      }

      // GLOBAL AI SYNTHESIS
      addLog('CLAUDE_STRATEGIC_PLANNING...');
      const res = await mapAPI.analyze(
        params.location as string || "Unknown Sector",
        situationalIntel,
        parseInt(params.people_affected as string || "0"),
        params.severity as string || "MEDIUM"
      );
      
      addLog('MISSION_PLAN_GENERATED');
      await new Promise(r => setTimeout(r, 1500));

      router.push({
        pathname: '/analysis_detail',
        params: { data: JSON.stringify(res) }
      });

    } catch (error) {
      addLog('SYSTEM_FAILURE::INIT_RECOVERY');
      setTimeout(() => router.back(), 3000);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#020408', '#050810', '#0A0E1A']} style={StyleSheet.absoluteFill} />
      
      {/* HUD Scanner Grid */}
      <View style={s.gridContainer}>
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={i} style={s.gridRow} />
        ))}
      </View>

      <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineAnim }] }]} />

      <View style={s.main}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={s.brainContainer}>
             <Brain color={DESIGN.primary} size={64} />
          </BlurView>
        </Animated.View>

        <View style={s.HUD}>
          <View style={s.statusHeader}>
             <Zap size={14} color={DESIGN.primary} />
             <Text style={s.statusTitle}>NEURAL_SYNTHESIS_ACTIVE</Text>
          </View>
          
          <View style={s.logWindow}>
             {logs.map((log, i) => (
               <View key={i} style={s.logRow}>
                  <Text style={[s.logText, { opacity: (10-i)/10 }]}>{log}</Text>
               </View>
             ))}
          </View>

          <View style={s.footerHUD}>
             <View style={s.footerItem}>
                <Shield size={12} color={DESIGN.success} />
                <Text style={s.footerText}>SECURE_LINK</Text>
             </View>
             <View style={s.footerDivider} />
             <View style={s.footerItem}>
                <Terminal size={12} color={DESIGN.info} />
                <Text style={s.footerText}>OS_v4.0.2</Text>
             </View>
             <View style={s.footerDivider} />
             <View style={s.footerItem}>
                <ActivityIndicator size="small" color={DESIGN.primary} style={{ transform: [{ scale: 0.6 }] }} />
                <Text style={s.footerText}>PROCESSING</Text>
             </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408' },
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.1 },
  gridRow: { height: 1, backgroundColor: DESIGN.primary, width: '100%', marginBottom: 30, opacity: 0.2 },
  scanLine: { position: 'absolute', height: 100, width: '100%', backgroundColor: DESIGN.primary + '10', borderBottomWidth: 2, borderBottomColor: DESIGN.primary, opacity: 0.5 },
  
  main: { flex: 1, justifyContent: 'center', padding: 24, gap: 40 },
  brainContainer: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: DESIGN.primary + '40', backgroundColor: DESIGN.primary + '05', shadowColor: DESIGN.primary, shadowRadius: 30, shadowOpacity: 0.3 },
  
  HUD: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 24, gap: 20 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 15 },
  statusTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 16, letterSpacing: 1 },
  
  logWindow: { height: 180, gap: 8 },
  logRow: { flexDirection: 'row', alignItems: 'center' },
  logText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 11, letterSpacing: 0.5 },
  
  footerHUD: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 9, letterSpacing: 1 },
  footerDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.1)' }
});
