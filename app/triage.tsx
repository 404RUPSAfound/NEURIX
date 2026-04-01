import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Zap, ArrowLeft, User, MapPin, Activity, ShieldAlert, Heart, Calendar, Plus, X, Thermometer, UserCheck } from 'lucide-react-native';
import { medicalAPI, authAPI } from '@/Store/api';
import { DESIGN } from '@/constants/design';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function TriageScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', tag: 'YELLOW', heart: '80', spo2: '98', bp: '120/80', condition: '' });

  useEffect(() => {
    fetchTriage();
  }, []);

  const sortPatients = (list: any[]) => {
    return (list || []).sort((a, b) => {
       const prio: any = { 'RED': 1, 'YELLOW': 2, 'GREEN': 3 };
       const aTag = (a.tag || a.triage_level || '').toUpperCase();
       const bTag = (b.tag || b.triage_level || '').toUpperCase();
       return (prio[aTag] || 99) - (prio[bTag] || 99);
    });
  };

  const fetchTriage = async () => {
    setLoading(true);
    try {
      const res = await medicalAPI.getTriageList();
      if (res?.success) {
        setPatients(sortPatients(res.data));
      }
    } catch (_) {
      const cached = await authAPI.loadTriageCache();
      setPatients(sortPatients(cached));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTriage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!newPatient.name) return Alert.alert("REQUIRED", "Patient Name is mandatory.");
    
    setLoading(true);
    let locStr = "Sector Alpha (Default)";
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
         let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
         let geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
         if (geocode.length > 0) locStr = `${geocode[0].city || ''} [${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}]`;
      }
    } catch (_) {}

    const casualtyPayload = { ...newPatient, location: locStr, timestamp: new Date().toISOString() };

    try {
      const res = await medicalAPI.submitTriage(casualtyPayload);
      if (res?.success) {
        Alert.alert("RECORD ESTABLISHED", "Casualty tagged and synchronized with Tactical HQ.");
        setIsModalOpen(false);
        fetchTriage();
      }
    } catch (_) {
      Alert.alert("OFFLINE CACHE", "Network restricted. Record saved to local triage cache.");
      const updatedCache = sortPatients([casualtyPayload, ...patients]);
      authAPI.saveTriageCache(updatedCache);
      setPatients(updatedCache);
      setIsModalOpen(false);
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#05080A', '#020508']} style={StyleSheet.absoluteFill} />
      
      <View style={s.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/');
          }} 
          style={s.backBtn}
        >
          <ArrowLeft color="#FFF" size={20} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>CASUALTY TRIAGE</Text>
          <Text style={s.headerSub}>Tactical Field Assessment Engine</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsModalOpen(true); }}>
           <Plus color="#FFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.statsRowHUD}>
           <StatMini label="RED" val={(patients || []).filter(p => (p?.tag || p?.triage_level) === 'RED').length} color={DESIGN.danger} />
           <StatMini label="YELLOW" val={(patients || []).filter(p => (p?.tag || p?.triage_level) === 'YELLOW').length} color={DESIGN.warning} />
           <StatMini label="GREEN" val={(patients || []).filter(p => (p?.tag || p?.triage_level) === 'GREEN').length} color={DESIGN.success} />
           <StatMini label="TOTAL" val={(patients || []).length} color="#7A8C99" />
        </View>

        {loading ? (
          <ActivityIndicator color={DESIGN.primary} style={{ marginTop: 100 }} />
        ) : (
          patients.length === 0 ? (
            <View style={s.emptyState}>
               <UserCheck size={48} color={DESIGN.textMuted} />
               <Text style={s.emptyText}>No casualties recorded in this sector.</Text>
               <TouchableOpacity style={s.scanBtn} onPress={fetchTriage}>
                  <Text style={s.scanBtnText}>RE-SCAN SECTOR</Text>
               </TouchableOpacity>
            </View>
          ) : (
            patients.map((p, idx) => (
              <CasualtyCard key={idx} patient={p} />
            ))
          )
        )}
      </ScrollView>

      {/* NEW CASUALTY MODAL */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
         <BlurView intensity={90} tint="dark" style={s.modalOverlay}>
            <View style={s.modalContent}>
               <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>NEW FIELD TAG</Text>
                  <TouchableOpacity onPress={() => setIsModalOpen(false)}><X color="#FFF" size={24} /></TouchableOpacity>
               </View>

               <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={s.label}>CASUALTY NAME</Text>
                  <TextInput 
                    style={s.input} 
                    placeholder="Enter Name or ID-Tag" 
                    placeholderTextColor="#555"
                    onChangeText={(t) => setNewPatient({ ...newPatient, name: t })}
                  />

                  <Text style={s.label}>PRIMARY TAG</Text>
                  <View style={s.tagRow}>
                     {['RED', 'YELLOW', 'GREEN'].map(t => {
                        const tagColor: string = t === 'RED' ? DESIGN.danger : (t === 'YELLOW' ? DESIGN.warning : DESIGN.success);
                        const isActive = t === newPatient.tag;
                        return (
                          <TouchableOpacity key={t} 
                            style={[s.tagBtn, { backgroundColor: isActive ? tagColor + '30' : 'transparent', borderColor: isActive ? tagColor : '#222' }]}
                            onPress={() => setNewPatient({ ...newPatient, tag: t })}
                          >
                             <Text style={[s.tagBtnText, { color: isActive ? tagColor : '#555' }]}>{t}</Text>
                          </TouchableOpacity>
                        );
                     })}
                  </View>

                  <View style={s.vitalsInputRow}>
                     <View style={{ flex: 1 }}>
                        <Text style={s.label}>HEART (BPM)</Text>
                        <TextInput style={s.input} keyboardType="numeric" value={newPatient.heart} onChangeText={(t) => setNewPatient({ ...newPatient, heart: t })} />
                     </View>
                     <View style={{ flex: 1 }}>
                        <Text style={s.label}>SpO2 (%)</Text>
                        <TextInput style={s.input} keyboardType="numeric" value={newPatient.spo2} onChangeText={(t) => setNewPatient({ ...newPatient, spo2: t })} />
                     </View>
                  </View>

                  <Text style={s.label}>FIELD OBSERVATIONS</Text>
                  <TextInput 
                    style={[s.input, { height: 80, textAlignVertical: 'top' }]} 
                    multiline 
                    placeholder="Describe wounds, status..." 
                    placeholderTextColor="#555"
                    onChangeText={(t) => setNewPatient({ ...newPatient, condition: t })}
                  />

                  <TouchableOpacity style={s.submitBtn} onPress={handleCreateTriage}>
                     <Text style={s.submitBtnText}>FINALIZE FIELD TAG</Text>
                  </TouchableOpacity>
               </ScrollView>
            </View>
         </BlurView>
      </Modal>
    </View>
  );
}

function CasualtyCard({ patient }: { patient: any }) {
  if (!patient) return null;
  const isRed = (patient.tag || patient.triage_level || '').toUpperCase() === 'RED';
  const color = isRed ? DESIGN.danger : ((patient.tag === 'YELLOW' || patient.triage_level === 'yellow') ? DESIGN.warning : DESIGN.success);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isRed]);

  const timeDisplay = patient.timestamp ? new Date(patient.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) : '2M AGO';

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 14 }}>
      <BlurView intensity={25} tint="dark" style={[s.card, { borderLeftColor: color, backgroundColor: isRed ? color + '08' : 'transparent', marginBottom: 0 }]}>
         <View style={s.cardHeader}>
            <View style={s.nameRow}>
               <View style={[s.dotIndicator, { backgroundColor: color }]} />
               <View>
                 <Text style={s.patientName}>{patient.name || patient.patient_name || 'UNIDENTIFIED'}</Text>
                 <Text style={s.gpsTag}>{patient.location || 'SECTOR_UNKNOWN'}</Text>
               </View>
            </View>
            <Text style={s.timestamp}>{timeDisplay}</Text>
         </View>

         <View style={s.vitals}>
            <Vital item={Heart} val={patient?.heart || patient?.heart_rate || '--'} label="BPM" color={DESIGN.danger} />
            <Vital item={Activity} val={patient?.spo2 || patient?.sp_o2 || '--'} label="SpO2" color={DESIGN.success} />
            <Vital item={ShieldAlert} val={patient?.bp || '--'} label="BP" color={DESIGN.warning} />
         </View>

         <Text style={s.conditionText}>{patient?.condition || patient?.primary_condition || 'No observation recorded.'}</Text>
      </BlurView>
    </Animated.View>
  );
}

function Vital({ item: Icon, val, label, color }: any) {
  return (
    <View style={s.vitalBox}>
       <Icon size={12} color={color} />
       <Text style={s.vitalVal}>{val}</Text>
       <Text style={s.vitalLbl}>{label}</Text>
    </View>
  );
}

function StatMini({ label, val, color }: any) {
  return (
    <View style={s.statMini}>
       <Text style={[s.statMiniVal, { color }]}>{val}</Text>
       <Text style={s.statMiniLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05080A' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: DESIGN.primary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 16, letterSpacing: 2, marginLeft: 20 },
  headerSub: { fontFamily: DESIGN.fontLabelSemiBold, color: '#555', fontSize: 8, letterSpacing: 1, marginLeft: 20, textTransform: 'uppercase' },

  scroll: { paddingBottom: 100 },
  statsRowHUD: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, paddingBottom: 12 },
  statMini: { alignItems: 'center' },
  statMiniVal: { fontFamily: DESIGN.fontDisplayBlack, fontSize: 20 },
  statMiniLbl: { fontFamily: DESIGN.fontLabel, color: '#555', fontSize: 7, letterSpacing: 1.5, marginTop: 4 },

  content: { padding: 20, gap: 14 },
  card: { padding: 22, borderRadius: 28, borderLeftWidth: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dotIndicator: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  patientName: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 13, letterSpacing: 0.5 },
  gpsTag: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.info, fontSize: 8, marginTop: 4, letterSpacing: 0.5 },
  timestamp: { fontFamily: DESIGN.fontLabel, color: '#444', fontSize: 8 },

  vitals: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  vitalBox: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  vitalVal: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 14 },
  vitalLbl: { fontFamily: DESIGN.fontLabel, color: '#555', fontSize: 7, letterSpacing: 1 },

  conditionText: { fontFamily: DESIGN.fontBody, color: '#7A8C99', fontSize: 11, lineHeight: 18 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A0F14', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28, maxHeight: height * 0.8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  modalTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 20, letterSpacing: 2 },
  
  label: { fontFamily: DESIGN.fontLabelSemiBold, color: '#555', fontSize: 9, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, color: '#FFF', fontFamily: DESIGN.fontMedium, fontSize: 14, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  
  tagRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  tagBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tagBtnText: { fontFamily: DESIGN.fontBold, fontSize: 11, letterSpacing: 1 },

  vitalsInputRow: { flexDirection: 'row', gap: 14 },
  submitBtn: { height: 60, backgroundColor: DESIGN.primary, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 40 },
  submitBtnText: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 14, letterSpacing: 2 },

  emptyState: { alignItems: 'center', gap: 20, marginTop: 120, opacity: 0.8 },
  emptyText: { fontFamily: DESIGN.fontBody, color: '#7A8C99', fontSize: 13, letterSpacing: 1 },
  scanBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: DESIGN.primary + '40', backgroundColor: DESIGN.primary + '10' },
  scanBtnText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 2 },
});
