import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Dimensions, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  FileText, ArrowLeft, Mic, Image as ImageIcon, 
  Upload, Send, MapPin, Zap, Brain, ShieldAlert,
  Clock, Trash2, CheckCircle2, Info
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function AIReportEngine() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);
  
  // Tactical State
  const [description, setDescription] = useState('');
  const [disasterType, setDisasterType] = useState('flood');
  const [severity, setSeverity] = useState('high');
  const [peopleAffected, setPeopleAffected] = useState('100');
  const [locationName, setLocationName] = useState('Unknown Sector');
  
  // Assets
  const [file, setFile] = useState<any>(null);
  const [image, setImage] = useState<any>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);

  // Animations
  const micPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        setLocationName(`Lat: ${loc.coords.latitude.toFixed(4)}, Lng: ${loc.coords.longitude.toFixed(4)}`);
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.4, duration: 500, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) { Alert.alert('Mic Error', 'Could not initialize tactical audio.'); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    micPulse.setValue(1);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setVoiceUri(uri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!res.canceled) {
      setFile(res.assets[0]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled) {
      setImage(res.assets[0]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const processReport = () => {
    if (!description && !file && !image && !voiceUri) {
      Alert.alert('ZERO DATA', 'Neural engine requires at least one data source to synthesize intel.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/processing',
      params: {
        description,
        disaster_type: disasterType,
        severity,
        people_affected: peopleAffected,
        location: locationName,
        fileUri: file?.uri || image?.uri || '',
        fileName: file?.name || 'field_intel.jpg',
        voiceUri: voiceUri || ''
      }
    });
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#02050A', '#050A1A', '#0A1E32']} style={StyleSheet.absoluteFill} />
      
      {/* ELITE HEADER */}
      <View style={s.header}>
        <TouchableOpacity 
          style={s.backBtn} 
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/');
          }}
        >
          <ArrowLeft color="#FFF" size={20} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>AI TACTICAL HUB</Text>
          <Text style={s.headerSub}>MISSION INTEL INGESTION</Text>
        </View>
        <TouchableOpacity style={s.infoBtn}>
          <Brain color={DESIGN.primary} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: VOICE COMMAND */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>VOICE MISSION DEBRIEF</Text>
          <BlurView intensity={40} tint="dark" style={s.voiceCard}>
            <TouchableOpacity 
              style={[s.micBtn, recording && s.micBtnActive]} 
              onPressIn={startRecording} 
              onPressOut={stopRecording}
            >
              <Animated.View style={[s.micPulse, { transform: [{ scale: micPulse }] }, recording && { opacity: 0.3 }]} />
              <Mic color="#FFF" size={32} />
            </TouchableOpacity>
            <View style={s.voiceInfo}>
              <Text style={s.voiceTitle}>{recording ? 'RECORDING DEBRIEF...' : voiceUri ? 'VOICE RECORDED' : 'HOLD TO START VOICE REPORT'}</Text>
              <Text style={s.voiceHint}>{recording ? 'Speak clearly into the tactical mic.' : 'AI will transcribe and extract key metrics.'}</Text>
            </View>
            {voiceUri && <CheckCircle2 color={DESIGN.success} size={20} />}
          </BlurView>
        </View>

        {/* SECTION 2: DIGITAL ASSETS */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>SATELLITE & FIELD DOCUMENTS</Text>
          <View style={s.assetGrid}>
            <TouchableOpacity style={[s.assetBtn, file && s.assetBtnActive]} onPress={pickDocument}>
              <BlurView intensity={30} tint="dark" style={s.assetInner}>
                <FileText color={file ? DESIGN.primary : DESIGN.textMuted} size={28} />
                <Text style={s.assetText}>{file ? 'PDF ATTACHED' : 'UPLOAD PDF'}</Text>
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity style={[s.assetBtn, image && s.assetBtnActive]} onPress={pickImage}>
              <BlurView intensity={30} tint="dark" style={s.assetInner}>
                <ImageIcon color={image ? DESIGN.primary : DESIGN.textMuted} size={28} />
                <Text style={s.assetText}>{image ? 'PHOTO SAVED' : 'FIELD PHOTO'}</Text>
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 3: TACTICAL METRICS */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>FIELD OBSERVATIONS</Text>
          <BlurView intensity={25} tint="dark" style={s.formCard}>
            <TextInput 
              style={s.textArea} 
              placeholder="Desribe situation (e.g. Broken levee near Sector 4...)" 
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            
            <View style={s.divider} />
            
            <View style={s.inputRow}>
              <MapPin color={DESIGN.primary} size={16} />
              <TextInput 
                style={s.rowInput}
                value={locationName}
                onChangeText={setLocationName}
                placeholder="Sector / GPS"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <View style={s.metricGrid}>
               <View style={s.metricItem}>
                  <Text style={s.metricLbl}>POP. AT RISK</Text>
                  <TextInput 
                    style={s.metricVal} 
                    keyboardType="numeric" 
                    value={peopleAffected} 
                    onChangeText={setPeopleAffected}
                  />
               </View>
               <View style={s.metricItem}>
                  <Text style={s.metricLbl}>SEVERITY</Text>
                  <TouchableOpacity onPress={() => setSeverity(s => s === 'high' ? 'critical' : 'high')}>
                    <Text style={[s.metricVal, { color: severity === 'critical' ? DESIGN.danger : DESIGN.warning }]}>{severity.toUpperCase()}</Text>
                  </TouchableOpacity>
               </View>
            </View>
          </BlurView>
        </View>

        <TouchableOpacity style={s.processBtn} onPress={processReport}>
          <LinearGradient colors={DESIGN.accentGradient as any} style={s.btnGradient}>
            <Zap color="#FFF" size={20} />
            <Text style={s.btnText}>INITIATE NEURAL SYNTHESIS</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.offlineHint}>
          <ShieldAlert color={COLORS.mesh} size={14} />
          <Text style={s.offlineText}>OFFLINE ENGINE: ON-DEVICE LLM READY</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const COLORS = {
  mesh: '#D4AF37',
  border: 'rgba(255,255,255,0.08)',
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02050A' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)' },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 13, letterSpacing: 3 },
  headerSub: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 8, marginTop: 2, letterSpacing: 1 },
  infoBtn: { padding: 10, borderRadius: 12, backgroundColor: DESIGN.primary + '10' },

  scroll: { padding: 24, paddingBottom: 60 },
  section: { marginBottom: 32 },
  sectionLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 9, letterSpacing: 2, marginBottom: 16 },
  
  voiceCard: { padding: 20, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', gap: 20, overflow: 'hidden' },
  micBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: DESIGN.primary, alignItems: 'center', justifyContent: 'center' },
  micBtnActive: { backgroundColor: DESIGN.danger },
  micPulse: { ...StyleSheet.absoluteFillObject, borderRadius: 32, backgroundColor: DESIGN.primary, opacity: 0.5 },
  voiceInfo: { flex: 1 },
  voiceTitle: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 13 },
  voiceHint: { fontFamily: DESIGN.fontBody, color: DESIGN.textMuted, fontSize: 11, marginTop: 2 },

  assetGrid: { flexDirection: 'row', gap: 12 },
  assetBtn: { flex: 1, height: 110, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  assetBtnActive: { borderColor: DESIGN.primary, backgroundColor: DESIGN.primary + '05' },
  assetInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  assetText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 9, letterSpacing: 1 },

  formCard: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  textArea: { fontFamily: DESIGN.fontBody, color: '#FFF', fontSize: 15, height: 100, textAlignVertical: 'top' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowInput: { flex: 1, fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 13 },
  
  metricGrid: { flexDirection: 'row', marginTop: 24, gap: 16 },
  metricItem: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  metricLbl: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textMuted, fontSize: 7, letterSpacing: 1, marginBottom: 4 },
  metricVal: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 16 },

  processBtn: { borderRadius: 24, overflow: 'hidden', marginTop: 10 },
  btnGradient: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  btnText: { fontFamily: DESIGN.fontDisplay, color: '#FFF', fontSize: 13, letterSpacing: 2 },

  offlineHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 },
  offlineText: { fontFamily: DESIGN.fontLabelSemiBold, color: COLORS.mesh, fontSize: 8, letterSpacing: 1 },
});
