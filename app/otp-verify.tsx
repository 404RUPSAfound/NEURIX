import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ShieldCheck, ArrowLeft, RefreshCcw, Activity, Lock } from 'lucide-react-native';
import { authAPI } from '@/Store/api';
import { DESIGN } from '@/constants/design';

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;

export default function OTPVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contact = String(params.contact || '');
  const method = String(params.method || 'email');

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<any[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    startCountdown();
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError(null);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (digit && index === OTP_LENGTH - 1 && newOtp.every(d => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length < OTP_LENGTH) {
      setError('Tactical sequence incomplete.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.verifyOTP(contact, code);
      if (res && res.success) {
        // Backend confirms node verification. Rapid Mission Protocol dictates we now authenticate via Login.
        router.replace('/auth');
      } else {
        setError('Verification rejected by command node.');
      }
    } catch (e: any) {
      setError(e.message || 'Verification failure.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    try {
      await authAPI.sendOTP(contact, method);
      startCountdown();
    } catch (e: any) {
      setError('Resend failed.');
    } finally {
      setResendLoading(false);
    }
  };

  const maskedContact = method === 'email'
    ? contact.replace(/(.{2})(.+)(@)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : contact.replace(/(\d{2})\d+(\d{2})/, '$1*****$2');

  return (
    <View style={s.container}>
      <LinearGradient colors={[DESIGN.bg, DESIGN.bgSurface]} style={StyleSheet.absoluteFill} />

      <Animated.View style={[s.content, { opacity: fadeAnim }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={DESIGN.textSecondary} />
          <Text style={s.backText}>RE-AUTHORIZE</Text>
        </Pressable>

        <View style={s.header}>
          <View style={s.iconShell}>
            <Lock size={32} color={DESIGN.primary} />
          </View>
          <Text style={s.title}>VERIFY NODE</Text>
          <Text style={s.subtitle}>
            6-digit secondary key dispatched to{'\n'}
            <Text style={s.contactText}>{maskedContact}</Text>
          </Text>
        </View>

        <View style={s.otpContainer}>
          <View style={s.otpRow}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={ref => { inputRefs.current[i] = ref; }}
                style={[s.otpBox, otp[i] ? s.otpBoxFilled : {}]}
                value={otp[i]}
                onChangeText={text => handleOtpChange(text, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                placeholderTextColor={DESIGN.textMuted}
                selectionColor={DESIGN.primary}
              />
            ))}
          </View>
        </View>

        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.timerSection}>
          {!canResend ? (
            <View style={s.timerBadge}>
              <Activity size={10} color={DESIGN.primary} />
              <Text style={s.timerText}>RESYNC IN {countdown}s</Text>
            </View>
          ) : (
            <Pressable style={s.resendBtn} onPress={handleResend} disabled={resendLoading}>
              {resendLoading ? (
                <ActivityIndicator size="small" color={DESIGN.primary} />
              ) : (
                <>
                  <RefreshCcw size={14} color={DESIGN.primary} />
                  <Text style={s.resendText}>REQUEST NEW KEY</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <Pressable style={s.verifyBtn} onPress={() => handleVerify()} disabled={loading}>
          <LinearGradient 
             colors={DESIGN.accentGradient as any} 
             start={{x:0, y:0}} end={{x:1, y:1}}
             style={s.verifyGradient}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.verifyText}>AUTHENTICATE ACCESS</Text>}
          </LinearGradient>
        </Pressable>

        <View style={s.footer}>
          <ShieldCheck size={12} color={DESIGN.textMuted} />
          <Text style={s.footerText}>SECURE PROTOCOL ACTIVE • DO NOT SHARE KEY</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGN.bg },
  content: { flex: 1, padding: 28, paddingTop: 60, alignItems: 'center' },
  
  backBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 30 },
  backText: { fontFamily: DESIGN.fontLabel, color: DESIGN.textSecondary, fontSize: 10, letterSpacing: 1 },
  
  header: { alignItems: 'center', marginBottom: 40 },
  iconShell: { padding: 20, borderRadius: 24, backgroundColor: 'rgba(225, 29, 72, 0.05)', borderWidth: 1, borderColor: DESIGN.borderStrong, marginBottom: 24 },
  title: { fontFamily: DESIGN.fontDisplayBlack, fontSize: 32, color: '#FFF', letterSpacing: 4, marginBottom: 12 },
  subtitle: { fontFamily: DESIGN.fontBody, textAlign: 'center', color: DESIGN.textSecondary, fontSize: 13, lineHeight: 22, opacity: 0.8 },
  contactText: { color: DESIGN.primary, fontFamily: DESIGN.fontBold },
  
  otpContainer: { width: '100%', alignItems: 'center', marginBottom: 30 },
  otpRow: { flexDirection: 'row', gap: 10 },
  otpBox: { 
    width: 48, height: 64, borderRadius: 14, borderWidth: 1, 
    borderColor: DESIGN.borderDefault, backgroundColor: 'rgba(255,255,255,0.02)', 
    textAlign: 'center', fontSize: 24, fontFamily: DESIGN.fontBold, color: '#FFF' 
  },
  otpBoxFilled: { borderColor: DESIGN.primary, backgroundColor: 'rgba(225, 29, 72, 0.05)' },
  
  errorBox: { backgroundColor: 'rgba(225, 29, 72, 0.1)', borderWidth: 1, borderColor: 'rgba(225, 29, 72, 0.3)', borderRadius: 12, padding: 14, marginBottom: 24, width: '100%', alignItems: 'center' },
  errorText: { fontFamily: DESIGN.fontMedium, color: DESIGN.primary, fontSize: 11 },
  
  timerSection: { height: 40, marginBottom: 30, justifyContent: 'center' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: DESIGN.borderDefault },
  timerText: { fontFamily: DESIGN.fontLabelSemiBold, color: DESIGN.textSecondary, fontSize: 10, letterSpacing: 1 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  resendText: { fontFamily: DESIGN.fontBold, color: DESIGN.primary, fontSize: 11, letterSpacing: 1 },
  
  verifyBtn: { width: '100%', borderRadius: 18, overflow: 'hidden', marginBottom: 32 },
  verifyGradient: { paddingVertical: 20, alignItems: 'center' },
  verifyText: { fontFamily: DESIGN.fontBlack, color: '#FFF', fontSize: 14, letterSpacing: 2 },
  
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.4 },
  footerText: { fontFamily: DESIGN.fontMedium, color: DESIGN.textMuted, fontSize: 8, letterSpacing: 1 },
});

