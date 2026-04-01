import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn, Easing, withRepeat, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { BrainCircuit, UploadCloud, FileText, AlertTriangle, CheckCircle, Clock, ShieldAlert, ListChecks, MapPin, Database, Users } from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type TabState = 'UPLOAD' | 'PROCESSING' | 'RESULTS';
type ResultTab = 'CARDS' | 'TIMELINE' | 'RESOURCES';

export default function ReportScreen() {
  const [activeTab, setActiveTab] = useState<TabState>('UPLOAD');
  const [resultSubTab, setResultSubTab] = useState<ResultTab>('CARDS');
  
  // Form State
  const [disasterType, setDisasterType] = useState('Flood');
  const [severity, setSeverity] = useState('HIGH');
  const [people, setPeople] = useState('100');
  const [location, setLocation] = useState('Mohali Sector 62');
  const [description, setDescription] = useState('Water rising rapidly. Roads blocked. Expected to breach 4ft.');

  // AI Response Data
  const [aiData, setAiData] = useState<any>(null);

  // Pulse Animation for Processing
  const pulseVal = useSharedValue(0.5);
  useEffect(() => {
    pulseVal.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseVal.value,
    transform: [{ scale: 0.95 + (pulseVal.value * 0.05) }]
  }));

  const handleAnalyze = async () => {
    setActiveTab('PROCESSING');
    
    try {
      const token = await AsyncStorage.getItem('neurix_token');
      const formData = new FormData();
      formData.append('disaster_type', disasterType);
      formData.append('severity', severity);
      formData.append('people_affected', people);
      formData.append('location', location);
      formData.append('description', description);
      formData.append('input_type', 'manual');

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8001';
      
      const res = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      console.log('AI System Response:', data);
      
      if(data.success) {
        setAiData(data);
        setTimeout(() => setActiveTab('RESULTS'), 1000); // Small enforced delay for dramatic effect
      } else {
        alert("Failed to connect to AI Core. Are you offline?");
        setActiveTab('UPLOAD');
      }
    } catch (e) {
      console.error(e);
      alert("System Offline. Falling back to local Tactical Cache...");
      setActiveTab('UPLOAD');
    }
  };

  const renderUploadTab = () => (
    <Animated.ScrollView entering={FadeInUp.duration(600).springify()} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <BrainCircuit color={DESIGN.primary} size={40} />
        <Text style={styles.title}>NEURIX INTELLIGENCE</Text>
        <Text style={styles.subtitle}>Claude-3 / Ollama Synthesis Engine</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FileText color={DESIGN.primary} size={20} />
          <Text style={styles.cardTitle}>TACTICAL INPUT</Text>
        </View>

        <Text style={styles.label}>Disaster Type</Text>
        <View style={styles.rowGrid}>
          {['Flood', 'Earthquake', 'Fire', 'Other'].map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.chip, disasterType === type && styles.chipActive]}
              onPress={() => setDisasterType(type)}
            >
              <Text style={[styles.chipText, disasterType === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Severity Level</Text>
        <View style={styles.rowGrid}>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(level => {
            const isCrit = level === 'CRITICAL';
            return (
              <TouchableOpacity 
                key={level} 
                style={[
                  styles.chip, 
                  severity === level && styles.chipActive,
                  isCrit && severity === level && { backgroundColor: DESIGN.danger, borderColor: DESIGN.danger }
                ]}
                onPress={() => setSeverity(level)}
              >
                <Text style={[styles.chipText, severity === level && styles.chipTextActive]}>{level}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.label}>Location / GPS Target</Text>
        <TextInput 
          style={styles.input} 
          value={location} 
          onChangeText={setLocation} 
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Estimated People Affected</Text>
        <TextInput 
          style={styles.input} 
          value={people} 
          onChangeText={setPeople} 
          keyboardType="numeric" 
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Situation Description (Or wait for OCR upload)</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
          value={description} 
          onChangeText={setDescription} 
          multiline 
          placeholderTextColor="#555"
        />

        <TouchableOpacity style={styles.scanBtn}>
          <UploadCloud color={DESIGN.primary} size={20} style={{marginRight: 8}} />
          <Text style={styles.scanBtnText}>UPLOAD FIELD PDF / IMAGE</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze}>
        <LinearGradient colors={[DESIGN.primary, '#805A00']} style={styles.gradientBg} start={{x: 0, y:0}} end={{x:1, y:1}}>
          <BrainCircuit color="#fff" size={24} style={{marginRight: 10}} />
          <Text style={styles.analyzeBtnText}>INITIATE NEURIX ANALYSIS</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.ScrollView>
  );

  const renderProcessingTab = () => (
    <Animated.View entering={FadeIn.duration(500)} style={styles.processingContainer}>
      <Animated.View style={pulseStyle}>
        <BrainCircuit color={DESIGN.primary} size={120} />
      </Animated.View>
      <Text style={styles.processingTitle}>SYNTHESIZING PROTOCOLS</Text>
      <Text style={styles.processingSub}>Cross-referencing NDRF & Sendai Framework Database</Text>
      
      <View style={styles.progressBox}>
        <View style={styles.progRow}><CheckCircle color={DESIGN.primary} size={16} /><Text style={styles.progText}> Geospatial parameters locked</Text></View>
        <View style={styles.progRow}><CheckCircle color={DESIGN.primary} size={16} /><Text style={styles.progText}> Threat vector analyzed</Text></View>
        <View style={styles.progRow}><ActivityIndicator color={DESIGN.primary} size="small" /><Text style={[styles.progText, {color: DESIGN.primary}]}> Generating Tactical Action Cards...</Text></View>
      </View>
    </Animated.View>
  );

  const renderResultsTab = () => {
    if(!aiData) return null;
    
    return (
      <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.resultsContainer}>
        {/* Results Header */}
        <View style={styles.resultsHeader}>
          <Text style={{color: '#999', fontSize: 12}}>SITUATION CLASSIFICATION</Text>
          <Text style={styles.resDocTitle}>{aiData.situation?.title}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap'}}>
            <View style={styles.statusBadge}><AlertTriangle color={DESIGN.primary} size={14} /><Text style={styles.statusBadgeText}>{aiData.situation?.severity}</Text></View>
            <View style={styles.statusBadge}><Users color={DESIGN.primary} size={14} /><Text style={styles.statusBadgeText}>{aiData.situation?.stats?.affected} AT RISK</Text></View>
            <View style={[styles.statusBadge, {borderColor: DESIGN.success}]}><CheckCircle color={DESIGN.success} size={14} /><Text style={[styles.statusBadgeText, {color: DESIGN.success}]}>NEURIX ACCURACY: {aiData.situation?.stats?.confidence}%</Text></View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.resTabsRow}>
          <TouchableOpacity style={[styles.resTab, resultSubTab === 'CARDS' && styles.resTabActive]} onPress={() => setResultSubTab('CARDS')}>
            <ListChecks color={resultSubTab === 'CARDS' ? DESIGN.primary : '#666'} size={18} />
            <Text style={[styles.resTabText, resultSubTab === 'CARDS' && {color: DESIGN.primary}]}>ACTION CARDS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.resTab, resultSubTab === 'TIMELINE' && styles.resTabActive]} onPress={() => setResultSubTab('TIMELINE')}>
            <Clock color={resultSubTab === 'TIMELINE' ? DESIGN.primary : '#666'} size={18} />
            <Text style={[styles.resTabText, resultSubTab === 'TIMELINE' && {color: DESIGN.primary}]}>TIMELINE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.resTab, resultSubTab === 'RESOURCES' && styles.resTabActive]} onPress={() => setResultSubTab('RESOURCES')}>
            <Database color={resultSubTab === 'RESOURCES' ? DESIGN.primary : '#666'} size={18} />
            <Text style={[styles.resTabText, resultSubTab === 'RESOURCES' && {color: DESIGN.primary}]}>RESOURCES</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{paddingBottom: 150}}>
          {resultSubTab === 'CARDS' && (
            <View style={{padding: 20}}>
              {(aiData.action_cards || []).map((card: any, idx: number) => (
                <View key={idx} style={styles.actionCard}>
                  <View style={styles.acHeaderRow}>
                    <Text style={[styles.acPriority, {color: card.color || DESIGN.primary}]}>● {card.priority}</Text>
                    <Text style={styles.acTime}>{card.time}</Text>
                  </View>
                  <Text style={styles.acTitle}>{card.title}</Text>
                  <Text style={styles.acDetail}>{card.detail}</Text>
                  <TouchableOpacity style={styles.acBtn}>
                    <Text style={styles.acBtnText}>ASSIGN TEAM</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {resultSubTab === 'TIMELINE' && (
            <View style={{padding: 20}}>
              {(aiData.timeline || []).map((t: any, idx: number) => (
                <View key={idx} style={styles.timelineRow}>
                  <View style={styles.tlTimeCol}><Text style={styles.tlTime}>{t.time}</Text></View>
                  <View style={styles.tlLine}><View style={[styles.tlDot, t.active && {backgroundColor: DESIGN.primary, borderColor: DESIGN.primary}]} /></View>
                  <View style={styles.tlLabelCol}><Text style={[styles.tlLabel, t.active && {color: '#fff'}]}>{t.label}</Text></View>
                </View>
              ))}
            </View>
          )}

          {resultSubTab === 'RESOURCES' && (
            <View style={{padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
              {(aiData.resources || []).map((r: any, idx: number) => (
                <View key={idx} style={styles.resourceCard}>
                  <Text style={styles.resVal}>{r.value}</Text>
                  <Text style={styles.resLabel}>{r.label}</Text>
                  <Text style={styles.resUnit}>{r.unit}</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
        
        {/* Floating Action */}
        <View style={styles.fabBottom}>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => setActiveTab('UPLOAD')}>
            <ShieldAlert color="#fff" size={20} />
            <Text style={styles.confirmBtnText}>COMMANDER CONFIRMS PLAN</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {activeTab === 'UPLOAD' && renderUploadTab()}
      {activeTab === 'PROCESSING' && renderProcessingTab()}
      {activeTab === 'RESULTS' && renderResultsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070A',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 150,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginTop: 15,
    letterSpacing: 2,
  },
  subtitle: {
    color: DESIGN.textMuted,
    fontSize: 12,
    fontFamily: 'Roboto_400Regular',
    marginTop: 5,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: DESIGN.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  label: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Roboto_500Medium',
    marginBottom: 8,
    marginTop: 15,
    textTransform: 'uppercase',
  },
  rowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: DESIGN.primary,
  },
  chipText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  chipTextActive: {
    color: DESIGN.primary,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontFamily: 'Roboto_400Regular',
    fontSize: 14,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: DESIGN.primary,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(212,175,55,0.05)',
  },
  scanBtnText: {
    color: DESIGN.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: 1,
  },
  analyzeBtn: {
    marginTop: 30,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: DESIGN.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  gradientBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  analyzeBtnText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  
  // Processing Tab
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  processingTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginTop: 40,
    letterSpacing: 2,
  },
  processingSub: {
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'Roboto_400Regular',
  },
  progressBox: {
    marginTop: 40,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  progText: {
    color: '#aaa',
    marginLeft: 15,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },

  // Results Tab
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: DESIGN.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  resDocTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginTop: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN.primary,
    backgroundColor: 'rgba(212,175,55,0.1)',
    marginRight: 10,
    marginTop: 10,
  },
  statusBadgeText: {
    color: DESIGN.primary,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    marginLeft: 6,
  },
  resTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  resTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  resTabActive: {
    borderBottomColor: DESIGN.primary,
  },
  resTabText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
    letterSpacing: 1,
  },

  // Cards
  actionCard: {
    backgroundColor: 'rgba(20, 20, 22, 0.8)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderLeftWidth: 4,
  },
  acHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  acPriority: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  acTime: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Roboto_400Regular',
  },
  acTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  acDetail: {
    color: '#999',
    fontSize: 13,
    fontFamily: 'Roboto_400Regular',
    lineHeight: 20,
    marginBottom: 15,
  },
  acBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  acBtnText: {
    color: '#ddd',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    minHeight: 60,
  },
  tlTimeCol: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: 15,
    paddingTop: 2,
  },
  tlTime: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  tlLine: {
    width: 20,
    alignItems: 'center',
  },
  tlDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555',
    backgroundColor: '#05070A',
    zIndex: 2,
  },
  tlLabelCol: {
    flex: 1,
    paddingLeft: 15,
    paddingBottom: 30,
    marginTop: -2,
  },
  tlLabel: {
    color: '#777',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },

  // Resources
  resourceCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  resVal: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  resLabel: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  resUnit: {
    color: '#555',
    fontSize: 10,
    fontFamily: 'Roboto_400Regular',
    marginTop: 2,
  },

  fabBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5,7,10,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    paddingBottom: 40,
  },
  confirmBtn: {
    backgroundColor: DESIGN.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#fff',
    marginLeft: 10,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 1,
  }
});
