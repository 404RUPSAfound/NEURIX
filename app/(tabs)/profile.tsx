import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Animated, Image, Dimensions, Platform, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  User, ShieldCheck, ShieldAlert, Cpu, 
  Settings, LogOut, ChevronRight, Activity, 
  Zap, Bell, Lock, Globe, Terminal, 
  Fingerprint, Signal, HardDrive, Database,
  Droplet, PhoneCall, Stethoscope, Play
} from 'lucide-react-native';
import { DESIGN } from '@/constants/design';
import { authAPI, mapAPI } from '@/Store/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { downloadDistrictTiles } from '@/app/offline-maps';

const { width } = Dimensions.get('window');

export default function TacticalProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>({ name: 'OPERATOR_ALPHA', role: 'MISSION_COMMANDER' });
  const [isStealth, setIsStealth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapDownloadProg, setMapDownloadProg] = useState(0);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('Penicillin');
  const [emContact, setEmContact] = useState('Sarah (Wife) - +91 9876543210');

  const stats = [
    { label: 'MISSIONS_LOGGED', value: '142', icon: Activity, color: DESIGN.success },
    { label: 'FIELD_DEVICES', value: '3', icon: Cpu, color: DESIGN.primary },
    { label: 'NODES_DISCOVERED', value: '89', icon: Zap, color: '#D4AF37' },
  ];

  useEffect(() => {
    mapAPI.getSecureStatus().then((res: any) => setIsStealth(res.secure));
  }, []);

  const handleTestSOS = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("SOS TEST INITIATED", "Test SMS broadcasted to Emergency Contacts via localized mesh relay.");
  };

  const handleDownloadMaps = async () => {
    if (Platform.OS === 'web') {
       if (window.confirm("Offline tile generation is optimized for Native Devices (APK/iOS). Proceed anyway?")) {
         setMapDownloadProg(100);
         alert("Simulated download complete (Web environment)");
       }
       return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("CACHING SECTOR MAPS", "Downloading Mohali/Chandigarh offline tiles...");
    setMapDownloadProg(1);
    
    const bounds = { north: 30.8, south: 30.6, east: 76.9, west: 76.6 };
    await downloadDistrictTiles("Mohali_Tricity", bounds, (prog) => {
        setMapDownloadProg(prog);
    });
    
    Alert.alert("CACHE COMPLETE", "Offline Map tiles successfully secured for out-of-bounds operations.");
    setMapDownloadProg(0);
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("DISCONNECT NODE: Are you sure you want to terminate the tactical link?");
      if (confirmed) {
        await authAPI.logout();
        router.replace('/auth');
      }
    } else {
      Alert.alert("DISCONNECT_NODE", "Are you sure you want to terminate the tactical link?", [
        { text: "ABORT", style: "cancel" },
        { text: "TERMINATE", style: "destructive", onPress: async () => {
            await authAPI.logout();
            router.replace('/auth');
        }}
      ]);
    }
  };

  const toggleStealth = async (val: boolean) => {
    setIsStealth(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await mapAPI.setSecureMode(val);
      Alert.alert(val ? "STEALTH_ENGAGED" : "SIGNALS_BROADCASTING", val ? "Device signature masked. Air-gap initialized." : "Tactical node visible to public mesh.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />
      
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ELITE PROFILE HEADER */}
        <View style={s.profileHeader}>
           <View style={s.avatarGroup}>
              <View style={s.avatarRing}>
                 <LinearGradient colors={[DESIGN.primary, '#D4AF37']} style={s.avatarGradient}>
                    <View style={s.avatarInner}>
                       <User size={42} color="#FFF" />
                    </View>
                 </LinearGradient>
              </View>
              <View style={s.statusBadge}>
                 <View style={s.statusDot} />
              </View>
           </View>

           <Text style={s.operatorName}>{profile.name}</Text>
           <View style={s.roleChip}>
              <Terminal size={10} color={DESIGN.primary} />
              <Text style={s.roleText}>{profile.role}</Text>
           </View>
        </View>

        {/* TACTICAL STATS DASHBOARD */}
        <View style={s.statsGrid}>
           {stats.map((st, i) => (
              <BlurView key={i} intensity={20} tint="dark" style={s.statCard}>
                 <st.icon size={16} color={st.color} />
                 <Text style={s.statValue}>{st.value}</Text>
                 <Text style={s.statLabel}>{st.label}</Text>
              </BlurView>
           ))}
        </View>

        {/* MEDICAL PROFILE */}
        <View style={s.section}>
           <Text style={s.sectionTitle}>MEDICAL_INTEL</Text>
           <View style={s.card}>
              <View style={[s.settingRow, { paddingBottom: 10 }]}>
                 <View style={s.settingIconShell}>
                    <Droplet size={18} color={DESIGN.danger} />
                 </View>
                 <View style={s.settingTextShell}>
                    <Text style={s.settingLabel}>Blood Group</Text>
                    <View style={s.bloodGrid}>
                      {['A+', 'O+', 'B+', 'AB+'].map(bg => (
                        <TouchableOpacity 
                          key={bg} 
                          style={[s.bloodChip, bloodGroup === bg && s.bloodChipActive]}
                          onPress={() => setBloodGroup(bg)}
                        >
                          <Text style={[s.bloodText, bloodGroup === bg && s.bloodTextActive]}>{bg}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                 </View>
              </View>
              <View style={s.divider} />
              <View style={s.settingRow}>
                 <View style={s.settingIconShell}>
                    <Stethoscope size={18} color="#D4AF37" />
                 </View>
                 <View style={s.settingTextShell}>
                    <Text style={s.settingLabel}>Allergies</Text>
                    <TextInput 
                      style={s.textInput} 
                      value={allergies} 
                      onChangeText={setAllergies} 
                      placeholderTextColor="#555"
                    />
                 </View>
              </View>
           </View>
        </View>

        {/* EMERGENCY CONTACTS */}
        <View style={s.section}>
           <Text style={s.sectionTitle}>EMERGENCY_ROUTING</Text>
           <View style={s.card}>
              <View style={s.settingRow}>
                 <View style={s.settingIconShell}>
                    <PhoneCall size={18} color={DESIGN.success} />
                 </View>
                 <View style={s.settingTextShell}>
                    <Text style={s.settingLabel}>Primary Contact</Text>
                    <TextInput 
                      style={s.textInput} 
                      value={emContact} 
                      onChangeText={setEmContact} 
                      placeholderTextColor="#555"
                    />
                 </View>
              </View>
              <TouchableOpacity style={s.testSOSBtn} onPress={handleTestSOS}>
                <Play size={16} color="#000" />
                <Text style={s.testSOSText}>TEST SOS ALERT</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* OPERATION SETTINGS */}
        <View style={s.section}>
           <Text style={s.sectionTitle}>PROTOCOL_SETTINGS</Text>
           
           <View style={s.card}>
              <SettingRow 
                 icon={ShieldCheck} 
                 label="Neural Link Stealth" 
                 sub="Mask device signature from public mesh"
                 right={<Switch value={isStealth} onValueChange={toggleStealth} trackColor={{ false: '#333', true: DESIGN.primary }} />}
              />
              <View style={s.divider} />
              <SettingRow 
                 icon={Fingerprint} 
                 label="Biometric Lockdown" 
                 sub="Require identity verification for SOS"
                 right={<ChevronRight size={16} color="#444" />}
                 onPress={() => {}}
              />
              <View style={s.divider} />
              <SettingRow 
                 icon={Database} 
                 label={mapDownloadProg > 0 ? `Caching Maps... ${mapDownloadProg}%` : "Tactical Cache Management"} 
                 sub="Download 400MB of offline terrain data"
                 right={<ChevronRight size={16} color="#444" />}
                 onPress={handleDownloadMaps}
              />
           </View>
        </View>

        {/* SERVICE TIER BANNERS */}
        <View style={s.tierSection}>
           <LinearGradient colors={['#FFF', '#F0F0F0']} style={s.tierBanner}>
              <View style={s.tierInfo}>
                 <Text style={s.tierTitle}>PLAN: TACTICAL_ULTIMATE</Text>
                 <Text style={s.tierSub}>ALL SATELLITE LINKS ACTIVE • P2P UNLIMITED</Text>
              </View>
              <View style={s.tierBadge}>
                 <ShieldAlert size={14} color="#D4AF37" />
                 <Text style={s.tierBadgeText}>ELITE</Text>
              </View>
           </LinearGradient>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
           <LogOut size={18} color={DESIGN.danger} />
           <Text style={s.logoutText}>TERMINATE_SESSION</Text>
        </TouchableOpacity>

        <View style={s.footer}>
           <Text style={s.versionText}>NEURIX_V2.0_ELITE_PROD // BUILD_ID: 9X-224</Text>
           <Text style={s.legalText}>GOVERNMENT_ISSUED_TACTICAL_ASSET</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function SettingRow({ icon: Icon, label, sub, right, onPress }: any) {
   return (
      <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={s.settingRow}>
         <View style={s.settingIconShell}>
            <Icon size={18} color={DESIGN.primary} />
         </View>
         <View style={s.settingTextShell}>
            <Text style={s.settingLabel}>{label}</Text>
            <Text style={s.settingSub}>{sub}</Text>
         </View>
         {right}
      </TouchableOpacity>
   );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebfbedff' },
  scroll: { padding: 24, paddingTop: 80 },
  
  profileHeader: { alignItems: 'center', marginBottom: 40 },
  avatarGroup: { position: 'relative', marginBottom: 20 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, padding: 3, backgroundColor: '#FFF' },
  avatarGradient: { flex: 1, borderRadius: 47, padding: 2 },
  avatarInner: { flex: 1, borderRadius: 45, backgroundColor: '#ebfbedff', alignItems: 'center', justifyContent: 'center' },
  statusBadge: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ebfbedff', alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: DESIGN.success },
  
  operatorName: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 24, letterSpacing: 2 },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  roleText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.primary, fontSize: 8, letterSpacing: 1.5 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  statCard: { flex: 1, padding: 16, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', backgroundColor: '#FFF' },
  statValue: { fontFamily: DESIGN.fontDisplayBlack, color: '#1E2F23', fontSize: 18, marginVertical: 6 },
  statLabel: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7, textAlign: 'center' },

  section: { marginBottom: 32 },
  sectionTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#333', fontSize: 10, letterSpacing: 2, marginBottom: 16, marginLeft: 4 },
  card: { borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  settingRow: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  settingIconShell: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  settingTextShell: { flex: 1 },
  settingLabel: { fontFamily: DESIGN.fontBold, color: '#1E2F23', fontSize: 14 },
  settingSub: { fontFamily: DESIGN.fontBody, color: '#90A4AE', fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#FFF', marginHorizontal: 20 },

  tierSection: { marginBottom: 40 },
  tierBanner: { padding: 24, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D4AF37' + '40' },
  tierInfo: { gap: 4 },
  tierTitle: { fontFamily: DESIGN.fontDisplayBlack, color: '#D4AF37', fontSize: 13, letterSpacing: 1 },
  tierSub: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', fontSize: 8 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D4AF37' + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierBadgeText: { fontFamily: DESIGN.fontDisplayBlack, color: '#D4AF37', fontSize: 9 },

  logoutBtn: { height: 60, borderRadius: 20, backgroundColor: 'rgba(225,29,72,0.1)', borderWidth: 1, borderColor: 'rgba(225,29,72,0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 },
  logoutText: { fontFamily: DESIGN.fontDisplayBlack, color: DESIGN.danger, fontSize: 12, letterSpacing: 2 },

  footer: { alignItems: 'center', gap: 6 },
  versionText: { fontFamily: DESIGN.fontLabel, color: '#222', fontSize: 9, letterSpacing: 1 },
  legalText: { fontFamily: DESIGN.fontLabelSemiBold, color: '#B0BEC5', fontSize: 7, letterSpacing: 2 },

  bloodGrid: { flexDirection: 'row', gap: 6, marginTop: 10 },
  bloodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FFF' },
  bloodChipActive: { backgroundColor: 'rgba(225,29,72,0.15)', borderWidth: 1, borderColor: DESIGN.danger },
  bloodText: { color: '#90A4AE', fontSize: 11, fontFamily: DESIGN.fontBold },
  bloodTextActive: { color: DESIGN.danger },

  textInput: { color: '#1E2F23', fontSize: 13, fontFamily: DESIGN.fontBody, marginTop: 5, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  
  testSOSBtn: { backgroundColor: DESIGN.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 10 },
  testSOSText: { color: '#000', fontFamily: DESIGN.fontDisplayBlack, fontSize: 12, letterSpacing: 1 }
});
