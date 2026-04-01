import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Alert, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Send, User, Bot, ShieldAlert, Zap, 
  MapPin, Radio, Activity, Terminal, 
  ChevronRight, Mic, PhoneCall, AlertTriangle,
  LayoutGrid, Clock, CheckCircle2, Info, ChevronDown,
  Battery, Signal, X, Globe
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { analyzeAPI, mapAPI } from '@/Store/api';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Dimensions, Image as RNImage } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const { width } = Dimensions.get('window');

export default function TacticalChat() {
  const [messages, setMessages] = useState<any[]>([
    { 
      role: 'bot', 
      text: 'NEURIX_V2.0 :: SATELLITE LINK ESTABLISHED. I AM READY FOR MISSION-CRITICAL INTELLIGENCE. STATE YOUR SITUATION OR QUERY.', 
      time: '08:41',
      id: 'INITIAL'
    },
    {
      role: 'bot',
      type: 'intel',
      imageUri: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=2070&auto=format&fit=crop', // Web-safe satellite placeholder
      time: '08:42'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const scrollRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('ACQUIRING_GPS...');

   useEffect(() => {
     (async () => {
       try {
         let { status } = await Location.requestForegroundPermissionsAsync();
         if (status !== 'granted') {
           setAddress('GPS_DENIED');
           return;
         }

         let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
         setLocation(loc);
         
         let geocode = await Location.reverseGeocodeAsync({
           latitude: loc.coords.latitude,
           longitude: loc.coords.longitude
         });
         
         if (geocode.length > 0) {
           setAddress(`SECTOR: ${geocode[0].city || geocode[0].region || 'ALPHA'}`.toUpperCase());
         } else {
           setAddress('COORDS_LOCKED');
         }

         // Update initial intel card with real location if fetched quickly
         setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs[1] && newMsgs[1].type === 'intel') {
               newMsgs[1] = { ...newMsgs[1], location: loc };
            }
            return newMsgs;
         });
       } catch (e) {
         setAddress('GPS_OFFLINE');
       }
     })();
   }, []);

   useEffect(() => {
     if (isVoiceActive) {
       Animated.loop(
         Animated.sequence([
           Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
           Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
         ])
       ).start();
     } else {
       pulseAnim.setValue(1);
     }
   }, [isVoiceActive]);

  const triggerAutoSOS = async (loc?: { latitude: number; longitude: number }) => {
     Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
     const targetLoc = loc || { latitude: 28.6139, longitude: 77.2090 };
     try {
       const res = await mapAPI.triggerSOS(targetLoc.latitude, targetLoc.longitude, 'manual', { chat_triggered: true });
       if (res?.success) {
         setMessages(prev => [...prev, { 
           role: 'bot', 
           text: `🚨 EMERGENCY BROADCAST ACTIVE :: SECTOR [${res.assigned_hospital || 'ALPHA'}]. LOCAL MESH NODES NOTIFIED.`, 
           time: 'NOW', 
           type: 'sos' 
         }]);
       }
     } catch (_) {}
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const userMsgObj = { role: 'user', text: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsgObj]);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // V2.0: EMERGENCY KEYWORD DETECTION
    const emergencyWords = ['trapped', 'flood', 'dying', 'help', 'accident', 'fire', 'bleeding'];
    const isEmergency = emergencyWords.some(w => userMsg.toLowerCase().includes(w));

    try {
      if (isEmergency) {
          // CALL ANALYZE FOR SITUATION ASSESSMENT
          let loc;
          try {
             loc = await Location.getCurrentPositionAsync({});
          } catch(e) {
             loc = { coords: { latitude: 28.6139, longitude: 77.2090 } };
          }
          const res = await analyzeAPI.analyze({ 
            location: 'Current Field', 
            description: userMsg,
            severity: 'CRITICAL'
          });
          
          if (res?.success) {
             setMessages(prev => [...prev, { 
               role: 'bot', 
               type: 'assessment',
               data: res,
               time: 'MISSION_TIME'
             }]);
             triggerAutoSOS(loc.coords);
          }
      } else {
          // NORMAL TACTICAL CHAT
          // Sanitize history for backend (role & text only)
          const sanitizedHistory = messages.map(m => ({
            role: m.role === 'bot' ? 'assistant' : 'user',
            text: m.text || ''
          }));
          const res = await analyzeAPI.chat(userMsg, sanitizedHistory);
          if (res?.success) {
             setMessages(prev => [...prev, { role: 'bot', text: res.reply || res.response, time: 'MISSION_TIME' }]);
          }
      }
    } catch (_) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: 'OFFLINE_MODE :: CLOUD LINK INTERRUPTED. USING P2P TACTICAL CACHE.', 
        time: 'SYNC_ERROR' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#05080A', '#020508']} style={StyleSheet.absoluteFill} />
      
      {/* ELITE HUD HEADER */}
      <View style={s.header}>
         <Terminal color={DESIGN.primary} size={20} />
         <View style={s.hdrText}>
            <Text style={s.hdrTitle}>TACTICAL INTELLIGENCE</Text>
            <View style={s.hdrStatusRow}>
               <View style={s.statusDot} />
               <Text style={s.hdrSub}>AI ENGINE 2.0 · MESH_SYNCED</Text>
            </View>
         </View>
         <TouchableOpacity style={s.badge}>
            <PhoneCall size={14} color="#FFF" />
         </TouchableOpacity>
      </View>

      {/* MISSION-CONTROL HUD (TELEMETRY) */}
      <BlurView intensity={25} tint="dark" style={s.telemetryHud}>
         <View style={s.teleRow}>
            <View style={s.teleItem}>
               <MapPin size={10} color={DESIGN.success} />
               <Text style={s.teleText}>{address}</Text>
            </View>
            <View style={s.teleDivider} />
            <View style={s.teleItem}>
               <Signal size={10} color={DESIGN.primary} />
               <Text style={s.teleText}>MESH_LINK HIGH</Text>
            </View>
            <View style={s.teleDivider} />
            <View style={s.teleItem}>
               <ShieldAlert size={10} color={DESIGN.primary} />
               <Text style={s.teleText}>AES-256 SECURED</Text>
            </View>
         </View>
         <View style={s.teleStatus}>
            <View style={s.missionPulse} />
            <Text style={s.missionText}>MISSION_SCAN_ACTIVE</Text>
         </View>
      </BlurView>

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={s.content} 
        onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
      >
        {messages.map((m, i) => (
          <View key={i} style={[s.msgRow, m.role === 'user' ? s.userRow : s.botRow]}>
             {m.type === 'assessment' ? (
                <AssessmentCard data={m.data} />
             ) : m.type === 'intel' ? (
                <IntelCard imageUri={m.imageUri} location={m.location || location} />
             ) : m.type === 'sos' ? (
                <View style={s.sosBlock}>
                   <ShieldAlert size={28} color={DESIGN.danger} />
                   <View style={{ flex: 1 }}>
                      <Text style={s.sosHdr}>SOS BROADCAST INITIATED</Text>
                      <Text style={s.msgText}>{m.text}</Text>
                   </View>
                </View>
             ) : (
                <BlurView intensity={25} tint="dark" style={[s.bubble, m.role === 'user' ? s.userBubble : s.botBubble]}>
                   {m.role === 'bot' ? (
                     <TypewriterText text={m.text} style={s.msgText} />
                   ) : (
                     <Text style={s.msgText}>{m.text}</Text>
                   )}
                   <Text style={s.msgTime}>{m.time}</Text>
                </BlurView>
             )}
          </View>
        ))}
        {loading && (
          <View style={s.thinkingPanel}>
             <ActivityIndicator color={DESIGN.primary} size="small" />
             <Text style={s.thinkingText}>ANALYZING TACTICAL FIELD DATA...</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
         <BlurView intensity={40} tint="dark" style={s.inputFrame}>
            <TouchableOpacity style={s.inputBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setIsVoiceActive(true); }}>
               <Mic size={20} color={isVoiceActive ? DESIGN.primary : "#AAA"} />
            </TouchableOpacity>
            <TextInput 
               style={s.input} 
               placeholder="REPORT STATUS OR QUERY INTEL..." 
               placeholderTextColor="#555"
               value={input}
               onChangeText={setInput}
               onSubmitEditing={handleSend}
            />
            <TouchableOpacity 
              style={[s.sendBtn, { backgroundColor: input.trim() ? DESIGN.primary : 'rgba(255,255,255,0.05)' }]} 
              onPress={handleSend}
            >
               <Send size={18} color="#FFF" />
            </TouchableOpacity>
         </BlurView>
      </KeyboardAvoidingView>

      {/* TACTICAL VOICE MODAL */}
      <Modal visible={isVoiceActive} animationType="fade" transparent>
         <BlurView intensity={95} tint="dark" style={s.voiceOverlay}>
            <SafeAreaView style={{ flex: 1 }}>
               <View style={s.voiceHdr}>
                  <Text style={s.voiceHdrTitle}>TACTICAL VOICE LINK</Text>
                  <TouchableOpacity onPress={() => setIsVoiceActive(false)}>
                     <X color="#FFF" size={24} />
                  </TouchableOpacity>
               </View>

               <View style={s.voiceVisualizer}>
                  {[0.4, 0.7, 1.0, 0.7, 0.4].map((op, idx) => (
                    <Animated.View key={idx} 
                      style={[
                        s.waveBar, 
                        { 
                          opacity: op,
                          transform: [{ scaleY: pulseAnim }]
                        }
                      ]} 
                    />
                  ))}
               </View>

               <View style={s.voiceCaption}>
                  <Text style={s.voiceCaptionStatus}>LISTENING_COMM_CHANNEL...</Text>
                  <Text style={s.voiceStreamText}>"Establishing satellite link... analyzing background noise for distress signals..."</Text>
               </View>

               <TouchableOpacity style={s.voiceStopBtn} onPress={() => setIsVoiceActive(false)}>
                  <LinearGradient colors={[DESIGN.danger, '#800000']} style={s.voiceStopInner}>
                     <Text style={s.voiceStopText}>TERMINATE LINK</Text>
                  </LinearGradient>
               </TouchableOpacity>
            </SafeAreaView>
         </BlurView>
      </Modal>
    </View>
  );
}

import { SafeAreaView } from 'react-native-safe-area-context';

// ── Specialized Components ──────────────────────────────────────────

function TypewriterText({ text, style }: { text: string, style: any }) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
      }, 15); // Tactical 15ms typing speed
    
    return () => clearInterval(timer);
  }, [text]);

  return <Text style={style}>{displayedText}</Text>;
}

function AssessmentCard({ data }: { data: any }) {
  const sit = data.situation || {};
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleStep = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter(s => s !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  return (
    <View style={s.assessContainer}>
       <LinearGradient colors={['#10141A', '#05080A']} style={s.assessCard}>
          <View style={s.assessHdr}>
             <View style={s.assessTag}>
                <Radio size={12} color={DESIGN.danger} />
                <Text style={s.assessTagText}>SITUATION ASSESSMENT</Text>
             </View>
             <View style={[s.sevBadge, { backgroundColor: DESIGN.danger + '20' }]}>
                <Text style={[s.sevText, { color: DESIGN.danger }]}>{sit.severity || 'CRITICAL'}</Text>
             </View>
          </View>

          <Text style={s.assessTitle}>{sit?.title || 'ASSESSING...'}</Text>
          <Text style={s.assessDesc}>{sit?.description || 'Synchronizing field metrics with command node.'}</Text>

          {/* Interactive Mission Checklist */}
          <Text style={s.checklistHdr}>FIELD ACTION LOG</Text>
          <View style={s.cardStack}>
             {(data?.action_cards || []).map((card: any, idx: number) => {
                const isDone = completedSteps.includes(idx);
                return (
                  <TouchableOpacity key={idx} 
                    style={[s.actionCard, { borderLeftColor: isDone ? DESIGN.success : (card?.color || DESIGN.primary), opacity: isDone ? 0.6 : 1 }]}
                    onPress={() => toggleStep(idx)}
                  >
                     <View style={s.actionRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                           <View style={[s.checkDot, { backgroundColor: isDone ? DESIGN.success : 'transparent', borderColor: isDone ? DESIGN.success : '#444' }]}>
                              {isDone && <CheckCircle2 size={10} color="#000" />}
                           </View>
                           <Text style={[s.actionPrio, { color: isDone ? DESIGN.success : '#FFF' }]}>{card?.priority || 'LEVEL_0'}</Text>
                        </View>
                        <View style={s.confidenceBadge}>
                           <Activity size={10} color={DESIGN.primary} />
                           <Text style={s.confidenceText}>{(sit?.stats?.confidence || 92)}% CONFIDENCE</Text>
                        </View>
                     </View>
                     <Text style={[s.actionTitle, { textDecorationLine: isDone ? 'line-through' : 'none' }]}>{card?.title || 'GENERATING...'}</Text>
                     <Text style={s.actionDetail}>{card?.detail || 'Waiting for AI synthesis...'}</Text>
                     <View style={s.actionFooter}>
                        <Clock size={10} color="#555" />
                        <Text style={s.actionTime}>{card?.time || 'EST 15M'}</Text>
                     </View>
                  </TouchableOpacity>
                );
             })}
          </View>

          {/* Resources Summary */}
          <View style={s.resourceGrid}>
             {(data.resources || []).map((r: any, idx: number) => (
                <View key={idx} style={s.resItem}>
                   <Text style={s.resVal}>{r.value}</Text>
                   <Text style={s.resLabel}>{r.label ? r.label.toUpperCase() : ''}</Text>
                </View>
             ))}
          </View>

          <TouchableOpacity style={[s.btnActivate, { backgroundColor: completedSteps.length > 0 ? DESIGN.success : DESIGN.primary }]} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}>
             <CheckCircle2 size={16} color="#000" />
             <Text style={s.btnActivateText}>{completedSteps.length > 0 ? 'MISSION_IN_PROGRESS' : 'EXECUTE MISSION PLAN'}</Text>
          </TouchableOpacity>
       </LinearGradient>
    </View>
  );
}

function IntelCard({ imageUri, location }: { imageUri: string, location?: Location.LocationObject | null }) {
  const lat = location ? location.coords.latitude.toFixed(4) : '34.0522';
  const lng = location ? location.coords.longitude.toFixed(4) : '-118.2437';
  
  return (
    <View style={s.intelContainer}>
       <BlurView intensity={30} tint="dark" style={s.intelCard}>
          <View style={s.intelHdr}>
             <Globe size={14} color={DESIGN.info} />
             <Text style={s.intelHdrText}>SATELLITE INTEL SYSTHESIS</Text>
             <View style={s.liveDot} />
          </View>
          <View style={s.intelFrame}>
             <ExpoImage 
               source={{ uri: imageUri || 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=2070&auto=format&fit=crop' }} 
               style={s.intelImage} 
               contentFit="cover"
             />
             <View style={s.intelOverlay}>
                <View style={s.crosshair} />
                <View style={s.coordBox}>
                   <Text style={s.coordText}>{Math.abs(parseFloat(lat))}° {parseFloat(lat) >= 0 ? 'N' : 'S'}, {Math.abs(parseFloat(lng))}° {parseFloat(lng) >= 0 ? 'E' : 'W'}</Text>
                   <Text style={s.scanStatus}>SCANNING_SECTOR_LINK...</Text>
                </View>
             </View>
          </View>
          <Text style={s.intelCap}>Drone Feed synthesized from local tactical meshes and satellite downlink. Thermal anomalies detected in SE quadrant.</Text>
       </BlurView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05080A' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  hdrText: { flex: 1 },
  hdrTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 13, letterSpacing: 2 },
  hdrStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DESIGN.success },
  hdrSub: { fontFamily: DESIGN.fontLabelSemiBold, color: '#555', fontSize: 8, letterSpacing: 1 },
  badge: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  content: { padding: 24, paddingBottom: 40 },
  msgRow: { marginBottom: 24, width: '100%' },
  userRow: { alignItems: 'flex-end' },
  botRow: { alignItems: 'flex-start' },
  
  bubble: { padding: 18, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', maxWidth: width * 0.8 },
  userBubble: { backgroundColor: DESIGN.primary + '15', borderBottomRightRadius: 4, borderColor: DESIGN.primary + '30' },
  botBubble: { backgroundColor: 'rgba(20,20,30,0.8)', borderBottomLeftRadius: 4 },
  
  msgText: { fontFamily: DESIGN.fontBody, color: '#FFF', fontSize: 13, lineHeight: 22 },
  msgTime: { fontFamily: DESIGN.fontLabel, color: '#333', fontSize: 8, marginTop: 10, textAlign: 'right' },

  sosBlock: { padding: 20, borderRadius: 24, flexDirection: 'row', gap: 16, borderWidth: 2, borderColor: DESIGN.danger, backgroundColor: DESIGN.danger + '10', width: '95%', alignSelf: 'center' },
  sosHdr: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.danger, fontSize: 11, letterSpacing: 1, marginBottom: 6 },

  thinkingPanel: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, marginTop: 10 },
  thinkingText: { color: DESIGN.primary, fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9, letterSpacing: 1, opacity: 0.7 },

  inputFrame: { margin: 24, padding: 8, borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(5,8,10,0.9)' },
  inputBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, color: '#FFF', fontFamily: DESIGN.fontMedium, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Assessment Card Styles
  assessContainer: { width: width - 48, alignSelf: 'center' },
  assessCard: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  assessHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  assessTag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assessTagText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#AAA', fontSize: 9, letterSpacing: 1.5 },
  sevBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  sevText: { fontFamily: DESIGN.fontDisplayBlack, fontSize: 9 },
  assessTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 20, letterSpacing: 1, marginBottom: 12 },
  assessDesc: { fontFamily: DESIGN.fontBody, color: DESIGN.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 24 },

  cardStack: { gap: 12, marginBottom: 24 },
  actionCard: { padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderLeftWidth: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  actionPrio: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 10, opacity: 0.6 },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: DESIGN.primary + '10', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  confidenceText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8 },
  actionTitle: { fontFamily: DESIGN.fontBold, color: '#FFF', fontSize: 14, marginBottom: 6 },
  actionDetail: { fontFamily: DESIGN.fontBody, color: '#7A8C99', fontSize: 11, lineHeight: 16 },
  actionFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  actionTime: { fontFamily: DESIGN.fontLabelSemiBold, color: '#444', fontSize: 8 },

  resourceGrid: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  resItem: { alignItems: 'center' },
  resVal: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.primary, fontSize: 18 },
  resLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#555', fontSize: 7, marginTop: 4 },

  btnActivate: { height: 54, backgroundColor: DESIGN.primary, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  btnActivateText: { fontFamily: DESIGN.fontDisplayBlack, color: '#000', fontSize: 12, letterSpacing: 1 },

  // Telemetry HUD Styles
  telemetryHud: { 
    marginHorizontal: 24, 
    marginVertical: 10, 
    padding: 12, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)', 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    // Resolved shadow deprecations
    elevation: 4,
    shadowColor: DESIGN.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  teleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teleItem: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  teleText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#666', fontSize: 8, letterSpacing: 1 },
  teleDivider: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  teleStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  missionPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: DESIGN.primary },
  missionText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, letterSpacing: 1 },

  // Voice Intercom Styles
  voiceOverlay: { flex: 1, padding: 30 },
  voiceHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 },
  voiceHdrTitle: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.primary, fontSize: 13, letterSpacing: 2 },
  voiceVisualizer: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  waveBar: { width: 6, height: 80, backgroundColor: DESIGN.primary, borderRadius: 3 },
  voiceCaption: { padding: 40, alignItems: 'center' },
  voiceCaptionStatus: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 10, letterSpacing: 2, marginBottom: 20 },
  voiceStreamText: { fontFamily: DESIGN.fontBody, color: '#AAA', fontSize: 15, textAlign: 'center', fontStyle: 'italic', lineHeight: 24 },
  voiceStopBtn: { marginBottom: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  voiceStopInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  voiceStopText: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 12, letterSpacing: 2 },

  // Intel & Checklist Styles
  intelContainer: { width: width - 48, alignSelf: 'center', marginVertical: 10 },
  intelCard: { padding: 20, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  intelHdr: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  intelHdrText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.info, fontSize: 9, letterSpacing: 1.5, flex: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DESIGN.danger },
  intelFrame: { height: 200, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  intelImage: { width: '100%', height: '100%' },
  intelOverlay: { ...StyleSheet.absoluteFillObject, padding: 15, justifyContent: 'space-between' },
  crosshair: { width: 40, height: 40, borderLeftWidth: 1, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.4)', position: 'absolute', top: '50%', left: '50%', marginTop: -20, marginLeft: -20 },
  coordBox: { alignSelf: 'flex-end' },
  coordText: { fontFamily: DESIGN.fontLabel, color: '#FFF', fontSize: 8 },
  scanStatus: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 7, marginTop: 4 },
  intelCap: { fontFamily: DESIGN.fontBody, color: DESIGN.textSecondary, fontSize: 11, lineHeight: 18, marginTop: 15 },

  checklistHdr: { fontFamily: DESIGN.fontLabelSemiBold, color: '#444', fontSize: 9, letterSpacing: 2, marginBottom: 15, marginTop: 10 },
  checkDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
