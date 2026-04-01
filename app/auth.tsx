import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  Animated, KeyboardAvoidingView, Platform, ScrollView,
  Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ShieldCheck, User, Lock, Mail, Phone, ChevronRight, Activity } from 'lucide-react-native';
import { authAPI } from '@/Store/api';
import { DESIGN } from '@/constants/design';

const { width, height } = Dimensions.get('window');

type AuthMode = 'login' | 'signup';
type InputMethod = 'email' | 'phone';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [inputMethod, setInputMethod] = useState<InputMethod>('email');
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Simple animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tabSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    Animated.spring(tabSlide, {
      toValue: newMode === 'login' ? 0 : 1,
      useNativeDriver: false,
    }).start();
    // Reset errors and minor fields if needed
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password.trim()) {
      Alert.alert('Incomplete Credentials', 'Please enter all required identification tokens.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(emailOrPhone.trim().toLowerCase(), password);
      if (res) {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Access Denied', e.message || 'Authentication sequence failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim() || !emailOrPhone.trim() || !password.trim()) {
      Alert.alert('Missing Field Data', 'All personnel identification fields are mandatory.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Encryption Mismatch', 'Verification password does not match primary key.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Security Alert', 'Neural key must be at least 6 characters for protocol compliance.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        name: name.trim(),
        email: inputMethod === 'email' ? emailOrPhone.trim().toLowerCase() : undefined,
        phone: inputMethod === 'phone' ? emailOrPhone.trim() : undefined,
        password,
      });

      router.push({
        pathname: '/otp-verify',
        params: {
          contact: emailOrPhone.trim(),
          method: inputMethod,
          name: name.trim(),
        }
      });
    } catch (e: any) {
      if (e.message && e.message.toLowerCase().includes('already registered')) {
        Alert.alert('Identity Confirmed', 'This operator node is already in our system. Redirecting to initialization link.');
        switchMode('login');
      } else {
        Alert.alert('Protocol Error', e.message || 'Node registration could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tabIndicatorLeft = tabSlide.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  return (
    <View style={s.container}>
      <LinearGradient colors={[DESIGN.bg, DESIGN.bgSurface]} style={StyleSheet.absoluteFill} />
      
      {/* Background ambient orbs */}
      <View style={s.orb1} />
      <View style={s.orb2} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} bounces={false} showsVerticalScrollIndicator={false}>
          <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Header / Logo */}
            <View style={s.header}>
              <View style={s.logoContainer}>
                <ShieldCheck size={42} color={DESIGN.primary} strokeWidth={1.5} />
              </View>
              <Text style={s.brand}>NEURIX</Text>
              <Text style={s.tagline}>OPERATIONAL SECURITY GATEWAY</Text>
            </View>

            {/* Main Auth Card */}
            <View style={s.cardWrapper}>
              <BlurView intensity={DESIGN.glassIntensity} tint="light" style={s.card}>
                
                {/* Mode Selector */}
                <View style={s.tabContainer}>
                  <Animated.View style={[s.tabIndicator, { left: tabIndicatorLeft }]} />
                  <Pressable style={s.tab} onPress={() => switchMode('login')}>
                    <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>LOG IN</Text>
                  </Pressable>
                  <Pressable style={s.tab} onPress={() => switchMode('signup')}>
                    <Text style={[s.tabText, mode === 'signup' && s.tabTextActive]}>CREATE ACCOUNT</Text>
                  </Pressable>
                </View>

                <View style={s.form}>
                  {mode === 'signup' && (
                    <View style={s.inputGroup}>
                      <Text style={s.label}>FULL OPERATOR NAME</Text>
                      <View style={s.inputWrapper}>
                        <User size={18} color={DESIGN.textMuted} style={s.icon} />
                        <TextInput
                          style={s.input}
                          placeholder="Name"
                          placeholderTextColor={DESIGN.textMuted}
                          value={name}
                          onChangeText={setName}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>
                  )}

                  {mode === 'signup' && (
                    <View style={s.methodToggle}>
                      <Pressable 
                        style={[s.methodBtn, inputMethod === 'email' && s.methodBtnActive]}
                        onPress={() => setInputMethod('email')}
                      >
                        <Mail size={14} color={inputMethod === 'email' ? DESIGN.primary : DESIGN.textMuted} />
                        <Text style={[s.methodBtnText, inputMethod === 'email' && s.methodBtnTextActive]}>EMAIL</Text>
                      </Pressable>
                      <Pressable 
                        style={[s.methodBtn, inputMethod === 'phone' && s.methodBtnActive]}
                        onPress={() => setInputMethod('phone')}
                      >
                        <Phone size={14} color={inputMethod === 'phone' ? DESIGN.primary : DESIGN.textMuted} />
                        <Text style={[s.methodBtnText, inputMethod === 'phone' && s.methodBtnTextActive]}>PHONE</Text>
                      </Pressable>
                    </View>
                  )}

                  <View style={s.inputGroup}>
                    <Text style={s.label}>
                      {mode === 'login' ? 'IDENTIFICATION TOKEN' : inputMethod === 'email' ? 'SECURE EMAIL ADDRESS' : 'MOBILE IDENTIFIER'}
                    </Text>
                    <View style={s.inputWrapper}>
                      {inputMethod === 'email' || mode === 'login' ? 
                        <Mail size={18} color={DESIGN.textMuted} style={s.icon} /> : 
                        <Phone size={18} color={DESIGN.textMuted} style={s.icon} />
                      }
                      <TextInput
                        style={s.input}
                        placeholder={inputMethod === 'email' ? "operator@neurix.hq" : "+91 0000 0000"}
                        placeholderTextColor={DESIGN.textMuted}
                        value={emailOrPhone}
                        onChangeText={setEmailOrPhone}
                        keyboardType={inputMethod === 'phone' ? 'phone-pad' : 'email-address'}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.label}>NEURAL ACCESS KEY</Text>
                    <View style={s.inputWrapper}>
                      <Lock size={18} color={DESIGN.textMuted} style={s.icon} />
                      <TextInput
                        style={s.input}
                        placeholder="••••••••••••"
                        placeholderTextColor={DESIGN.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {mode === 'signup' && (
                    <View style={s.inputGroup}>
                      <Text style={s.label}>CONFIRM ACCESS KEY</Text>
                      <View style={s.inputWrapper}>
                        <Lock size={18} color={DESIGN.textMuted} style={s.icon} />
                        <TextInput
                          style={s.input}
                          placeholder="••••••••••••"
                          placeholderTextColor={DESIGN.textMuted}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  )}

                  {mode === 'login' && (
                    <Pressable style={s.forgotLink}>
                      <Text style={s.forgotText}>RESTORE ACCESS?</Text>
                    </Pressable>
                  )}

                  <View style={s.actionRow}>
                    <Pressable 
                      style={[s.submitBtn, loading && { opacity: 0.7 }]}
                      onPress={mode === 'login' ? handleLogin : handleSignup}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={DESIGN.accentGradient as any}
                        start={{x:0, y:0}} end={{x:1, y:1}}
                        style={s.submitGradient}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <>
                            <Text style={s.submitText}>
                              {mode === 'login' ? 'INITIALIZE LINK' : 'REGISTER NODE'}
                            </Text>
                            <ChevronRight size={18} color="#FFF" />
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Security Footer */}
            <View style={s.footer}>
              <View style={s.securityTag}>
                <Activity size={10} color={DESIGN.primary} />
                <Text style={s.securityText}>AES-256 ENCRYPTED CHANNEL</Text>
              </View>
              <Text style={s.versionText}>NEURIX TACTICAL ELITE v2.4.0</Text>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGN.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center' },

  orb1: { position: 'absolute', top: -150, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: DESIGN.primary, opacity: 0.05 },
  orb2: { position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: DESIGN.secondary, opacity: 0.03 },

  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { padding: 16, borderRadius: 24, backgroundColor: 'rgba(225, 29, 72, 0.05)', borderWidth: 1, borderColor: DESIGN.borderStrong, marginBottom: 20 },
  brand: { fontFamily: DESIGN.fontDisplayBlack, color: '#FFF', fontSize: 42, letterSpacing: 6 },
  tagline: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textSecondary, fontSize: 9, letterSpacing: 4, marginTop: 4, opacity: 0.8 },

  cardWrapper: { borderRadius: DESIGN.radiusCard, overflow: 'hidden', borderWidth: 1, borderColor: DESIGN.borderStrong, backgroundColor: DESIGN.bgCard },
  card: { padding: 0 },

  tabContainer: { flexDirection: 'row', height: 60, borderBottomWidth: 1, borderBottomColor: DESIGN.borderDefault, backgroundColor: 'rgba(0,0,0,0.15)' },
  tabIndicator: { position: 'absolute', bottom: 0, width: '50%', height: 2, backgroundColor: DESIGN.primary },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: DESIGN.fontLabel, fontSize: 11, letterSpacing: 1.5, color: DESIGN.textMuted },
  tabTextActive: { color: '#FFF' },

  form: { padding: 30, gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontFamily: DESIGN.fontLabelSemiBold, fontSize: 9, color: DESIGN.textSecondary, letterSpacing: 1.5, marginLeft: 2 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, borderWidth: 1, borderColor: DESIGN.borderDefault },
  icon: { marginLeft: 16, marginRight: 12 },
  input: { flex: 1, fontFamily: DESIGN.fontRegular, color: '#FFF', paddingVertical: 16, paddingRight: 16, fontSize: 14 },

  methodToggle: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  methodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: DESIGN.borderDefault, backgroundColor: 'rgba(0,0,0,0.1)' },
  methodBtnActive: { borderColor: DESIGN.primary, backgroundColor: 'rgba(225, 29, 72, 0.05)' },
  methodBtnText: { fontFamily: DESIGN.fontBold, fontSize: 10, color: DESIGN.textMuted },
  methodBtnTextActive: { color: DESIGN.primary },

  forgotLink: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { fontFamily: DESIGN.fontBold, fontSize: 10, color: DESIGN.textSecondary, letterSpacing: 1 },

  actionRow: { marginTop: 10 },
  submitBtn: { borderRadius: 18, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText: { fontFamily: DESIGN.fontBlack, color: '#FFF', fontSize: 14, letterSpacing: 2 },

  footer: { alignItems: 'center', marginTop: 40, gap: 8 },
  securityTag: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
  securityText: { fontFamily: DESIGN.fontMedium, color: DESIGN.textSecondary, fontSize: 8, letterSpacing: 1.5 },
  versionText: { fontFamily: DESIGN.fontMedium, color: DESIGN.textMuted, fontSize: 8, letterSpacing: 1 },
});
