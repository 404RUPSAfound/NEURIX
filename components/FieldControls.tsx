import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sun, Hand, Battery } from 'lucide-react-native';
import { DESIGN } from '@/constants/design';

interface FieldControlsProps {
  sunlight: boolean;
  setSunlight: (v: boolean) => void;
  gloves: boolean;
  setGloves: (v: boolean) => void;
  lowPower: boolean;
  setLowPower: (v: boolean) => void;
}

export const FieldControls: React.FC<FieldControlsProps> = ({ 
  sunlight, setSunlight, gloves, setGloves, lowPower, setLowPower 
}) => {
  const ControlButton = ({ active, onPress, icon: Icon, label }: any) => (
    <Pressable 
      onPress={onPress}
      style={[
        s.btn,
        active ? s.btnActive : s.btnInactive
      ]}
    >
      <Icon color={active ? '#FFF' : DESIGN.textSecondary} size={14} style={{ marginRight: 8 }} />
      <Text style={[
        s.btnText,
        active ? s.textActive : s.textInactive
      ]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={s.container}>
      <ControlButton active={sunlight} onPress={() => setSunlight(!sunlight)} icon={Sun} label="Sunlight" />
      <ControlButton active={gloves} onPress={() => setGloves(!gloves)} icon={Hand} label="Gloves" />
      <ControlButton active={lowPower} onPress={() => setLowPower(!lowPower)} icon={Battery} label="Power" />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  btnActive: { backgroundColor: DESIGN.primary, borderColor: DESIGN.primary },
  btnInactive: { backgroundColor: DESIGN.bgCard, borderColor: DESIGN.borderDefault, shadowColor: DESIGN.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  btnText: { fontFamily: DESIGN.fontBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  textActive: { color: '#FFF' },
  textInactive: { color: DESIGN.textSecondary }
});
