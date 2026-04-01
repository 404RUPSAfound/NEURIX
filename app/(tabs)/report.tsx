import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Dimensions, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  FileText, ArrowLeft, Mic, Image as ImageIcon, 
  Upload, Send, MapPin, Zap, Brain, ShieldAlert,
  Clock, Trash2, CheckCircle2, Info, RefreshCcw,
  Database, Activity, Scan
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { mapAPI } from '@/Store/api';

const { width } = Dimensions.get('window');

/**
 * UNIFIED TACTICAL HYBRID (CLASSIC + ELITE)
 * 
 * Merges the classic "Manual Entry" aesthetic with high-fidelity "Elite Asset Grid".
 * Provides real-time visual feedback during neural scanning.
 */
export default function TacticalHybrid() {
  const router = useRouter();
  
  // Data States
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('high');
  const [peopleAffected, setPeopleAffected] = useState('100');
  const [locationName, setLocationName] = useState('Search Sector 4-D');
  
  // Asset States
  const [file, setFile] = useState<any>(null);
  const [image, setImage] = useState<any>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);

  // Elite Scanning States
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('READY');
  const scanProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocationName(`${loc.coords.latitude.toFixed(4)}N, ${loc.coords.longitude.toFixed(4)}E`);
      }
    })();
  }, []);

  const runNeuralExtraction = async (uri: string, name: string, type: string) => {
    try {
      setScanning(true);
      setScanStatus('UPLOADING...');
      Animated.timing(scanProgress, { toValue: 1, duration: 4000, useNativeDriver: false }).start();
      
      let fileToUpload: any;
      if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          fileToUpload = new File([blob], name, { type });
      } else {
          fileToUpload = { uri, name, type };
      }

      setScanStatus('PARSING...');
      const res = await mapAPI.scanDocument(fileToUpload);
      if (res.success) {
          setScanStatus('SYNTHESIZING...');
          const intel = res.analysis || res.raw_text || "";
          setDescription(prev => (prev ? prev + "\n\n" : "") + "[NEURAL_INTEL]: " + intel.slice(0, 800));
          if (intel.match(/\d+/)) setPeopleAffected(intel.match(/\d+/)![0]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setScanning(false);
      scanProgress.setValue(0);
    } catch (e) {
      setScanning(false);
      console.log("Intel link failure.");
    }
  };

  const pickPDF = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!res.canceled) {
      setFile(res.assets[0]);
      await runNeuralExtraction(res.assets[0].uri, res.assets[0].name, 'application/pdf');
    }
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled) {
      setImage(res.assets[0]);
      await runNeuralExtraction(res.assets[0].uri, res.assets[0].fileName || 'recon.jpg', 'image/jpeg');
    }
  };

  const goAnalysis = () => {
    if (!description && !file) {
      Alert.alert('DATA_REQUIRED', 'Intelligence link requires documentation or a situation report.');
      return;
    }
    router.push({
      pathname: '/processing',
      params: { description, severity, people_affected: peopleAffected, location: locationName, fileUri: file?.uri || '' }
    });
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#02050A', '#050A19', '#081033']} style={StyleSheet.absoluteFill} />
      
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>NEURIX HUB</Text>
          <Text style={s.headerSub}>SITUATIONAL_HYBRID_ENGINE</Text>
        </View>
        <TouchableOpacity style={s.refreshCircle}>
          <RefreshCcw color="#D4AF37" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* SECTION: PEOPLE (CLASSIC) */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ESTIMATED PEOPLE AFFECTED</Text>
          <View style={s.classicInputBox}>
              <TextInput style={s.classicInput} value={peopleAffected} onChangeText={setPeopleAffected} keyboardType="numeric" />
          </View>
        </View>

        {/* SECTION: DESCRIPTION (CLASSIC) */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>MISSION DEBRIEF (LIVE TRANSCRIPTION OR MANUAL)</Text>
          <View style={s.classicTextAreaBox}>
              <TextInput 
                style={s.textArea} 
                multiline 
                value={description} 
                onChangeText={setDescription}
                placeholder="Sector Delta experiencing breach. Tactical dispatch required..."
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
          </View>
        </View>

        {/* SECTION: ASSET INGESTION (ELITE GRID) */}
        <View style={s.section}>
          <View style={s.assetHeader}>
            <Text style={s.sectionLabel}>MISSION ASSET INGESTION</Text>
            {scanning && <View style={s.liveBadge}><ActivityIndicator size="small" color={DESIGN.primary} /><Text style={s.liveText}>{scanStatus}</Text></View>}
          </View>

          {/* ELITE SCAN FEEDBACK BAR */}
          {scanning && (
            <View style={s.progressBarWrapper}>
              <Animated.View style={[s.progressBar, { width: scanProgress.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }) }]} />
            </View>
          )}

          <View style={s.assetGrid}>
             <TouchableOpacity style={[s.assetBtn, file && s.assetBtnSynced]} onPress={pickPDF}>
                <FileText color={file ? DESIGN.info : DESIGN.textMuted} size={28} />
                <Text style={s.assetBtnText}>UPLOAD PDF</Text>
                {file && <View style={s.checkBadge}><CheckCircle2 size={10} color="#FFF" /></View>}
             </TouchableOpacity>
             <TouchableOpacity style={[s.assetBtn, image && s.assetBtnSynced]} onPress={pickPhoto}>
                <ImageIcon color={image ? DESIGN.primary : DESIGN.textMuted} size={28} />
                <Text style={s.assetBtnText}>PHOTO RECON</Text>
                {image && <View style={s.checkBadge}><CheckCircle2 size={10} color="#FFF" /></View>}
             </TouchableOpacity>
             <TouchableOpacity style={s.assetBtn}>
                <Mic color={DESIGN.textMuted} size={28} />
                <Text style={s.assetBtnText}>VOICE_NET</Text>
             </TouchableOpacity>
          </View>
        </View>

        {/* SECTION: CORE TRIGGER (CLASSIC GRADIENT) */}
        <TouchableOpacity style={s.launchBtn} onPress={goAnalysis}>
           <LinearGradient colors={[DESIGN.danger, '#C1870B']} start={{x:0, y:0}} end={{x:1, y:1}} style={s.launchInner}>
              <Scan color="#FFF" size={26} />
              <Text style={s.launchText}>INITIATE NEURAL SYNTHESIS</Text>
           </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02050A' },
  header: { paddingTop: 60, paddingHorizontal: 30, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 24, letterSpacing: 2 },
  headerSub: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 9, letterSpacing: 1, marginTop: 4 },
  refreshCircle: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

  scroll: { paddingHorizontal: 24, paddingTop: 10 },
  section: { marginBottom: 32 },
  sectionLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1.5, marginBottom: 12 },
  
  classicInputBox: { height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 20, justifyContent: 'center' },
  classicInput: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 22 },

  classicTextAreaBox: { height: 140, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.01)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 20 },
  textArea: { fontFamily: DESIGN.fontBold, color: 'rgba(255,255,255,0.8)', fontSize: 15, height: '100%', textAlignVertical: 'top' },

  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8 },

  progressBarWrapper: { width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, marginBottom: 20 },
  progressBar: { height: '100%', backgroundColor: DESIGN.primary },

  assetGrid: { flexDirection: 'row', gap: 12 },
  assetBtn: { flex: 1, height: 90, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  assetBtnSynced: { borderColor: DESIGN.primary + '40', backgroundColor: DESIGN.primary + '05' },
  assetBtnText: { fontFamily: DESIGN.fontDisplayBlack, color: 'rgba(255,255,255,0.4)', fontSize: 7, letterSpacing: 1 },
  checkBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: DESIGN.success, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  launchBtn: { height: 72, borderRadius: 24, overflow: 'hidden', marginVertical: 15, marginBottom: 20 },
  launchInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, paddingHorizontal: 20 },
  launchText: { fontFamily: DESIGN.fontDisplay, color: '#FFF', fontSize: 13, letterSpacing: 2 },
});
