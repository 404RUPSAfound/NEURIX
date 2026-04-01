import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Package, MapPin, AlertCircle, ArrowRight } from 'lucide-react-native';
import api from '@/Store/api';
import { DESIGN } from '@/constants/design';

const CRIMSON = '#E11D48';
const PRESET_ITEMS = ['Rescue team','Medical staff','Boats','Vehicles','Tents','Food packets','Water cans','Medicine kits','Blankets','Body bags'];

export default function ResourcesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'add'|'list'>('list');
  const [form, setForm] = useState({ item:'', available:'', needed:'', unit:'units', location:'' });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/resources/list');
      setData(res.data);
    } catch(e:any) { Alert.alert('Error', e.message); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.item || !form.available || !form.needed) { Alert.alert('All fields are required'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      await api.post('/resources/update', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setTab('list'); load();
      setForm({ item:'', available:'', needed:'', unit:'units', location:'' });
    } catch(e:any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const STATUS_COLOR: Record<string, string> = { CRITICAL: DESIGN.danger, LOW: DESIGN.warning, OK: DESIGN.success };

  return (
    <View style={s.container}>
      <LinearGradient colors={[DESIGN.gradientStart, DESIGN.gradientMid, DESIGN.gradientEnd]} style={StyleSheet.absoluteFill} />
      
      <View style={s.header}>
        <TouchableOpacity 
          style={s.back} 
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/');
          }}
        >
          <ChevronLeft color={DESIGN.textSecondary} size={20} />
          <Text style={s.backTxt}>BACK</Text>
        </TouchableOpacity>
        <Text style={s.title}>Resource Hub</Text>
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab==='list'&&s.tabOn]} onPress={()=>{setTab('list');load();}}>
            <Text style={[s.tabTxt, tab==='list'&&s.tabTxtOn]}>Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab==='add'&&s.tabOn]} onPress={()=>setTab('add')}>
            <Text style={[s.tabTxt, tab==='add'&&s.tabTxtOn]}>+ Update</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {tab === 'list' ? (
          !data ? <ActivityIndicator color={DESIGN.primary} style={{marginTop:40}} /> : (
            <>
              <View style={s.summRow}>
                {[{n:data.critical?.length||0,l:'CRITICAL',c:DESIGN.danger},{n:data.low?.length||0,l:'LOW',c:DESIGN.warning},{n:data.ok?.length||0,l:'OPTIMAL',c:DESIGN.success}].map(st=>(
                  <View key={st.l} style={[s.summCard,{borderTopColor:st.c}]}>
                    <Text style={[s.summN,{color:st.c}]}>{st.n}</Text>
                    <Text style={s.summL}>{st.l}</Text>
                  </View>
                ))}
              </View>
              {['critical','low','ok'].map(status => (
                data[status]?.length > 0 && (
                  <View key={status} style={{ marginBottom: 24 }}>
                    <Text style={[s.sectionHdr,{color:STATUS_COLOR[status.toUpperCase()]}]}>{status.toUpperCase()} PRIORITY</Text>
                    {data[status].map((r:any) => (
                      <View key={r.item} style={[s.resCard,{borderLeftColor:STATUS_COLOR[r.status]}]}>
                        <View style={s.resTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Package color={DESIGN.textPrimary} size={16} />
                            <Text style={s.resName}>{r.item}</Text>
                          </View>
                          <View style={[s.resBadge,{backgroundColor:STATUS_COLOR[r.status]+'15',borderColor:STATUS_COLOR[r.status]+'30'}]}>
                            <Text style={[s.resBadgeTxt,{color:STATUS_COLOR[r.status]}]}>{r.status}</Text>
                          </View>
                        </View>
                        <View style={s.resBar}>
                          <Text style={s.resNum}>{r.available} / {r.needed} {r.unit}</Text>
                          {r.gap > 0 && (
                            <View style={s.gapBadge}>
                              <AlertCircle color={DESIGN.danger} size={10} />
                              <Text style={s.resGap}>SHORTFALL: {r.gap}</Text>
                            </View>
                          )}
                        </View>
                        {r.location && (
                          <View style={s.locRow}>
                            <MapPin color={DESIGN.textMuted} size={12} />
                            <Text style={s.resLoc}>{r.location}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )
              ))}
            </>
          )
        ) : (
          <View style={s.formBox}>
            <Text style={s.lbl}>SELECT ASSET TYPE</Text>
            <View style={s.chips}>
              {PRESET_ITEMS.map(item => (
                <TouchableOpacity key={item} style={[s.chip, form.item===item&&s.chipOn]} onPress={()=>setForm(f=>({...f,item}))}>
                  <Text style={[s.chipTxt, form.item===item&&s.chipTxtOn]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.lbl}>OR DEFINE CUSTOM ASSET</Text>
            <TextInput style={s.input} placeholder="Asset identifier" placeholderTextColor={DESIGN.textMuted} value={form.item} onChangeText={t=>setForm(f=>({...f,item:t}))} />
            
            <View style={s.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>AVAILABLE</Text>
                <TextInput style={s.input} placeholder="0" placeholderTextColor={DESIGN.textMuted} keyboardType="numeric" value={form.available} onChangeText={t=>setForm(f=>({...f,available:t}))} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.lbl}>NEEDED</Text>
                <TextInput style={s.input} placeholder="0" placeholderTextColor={DESIGN.textMuted} keyboardType="numeric" value={form.needed} onChangeText={t=>setForm(f=>({...f,needed:t}))} />
              </View>
            </View>

            <Text style={s.lbl}>DEPLOYMENT LOCATION</Text>
            <TextInput style={s.input} placeholder="e.g. Sector 7, Camp Brave" placeholderTextColor={DESIGN.textMuted} value={form.location} onChangeText={t=>setForm(f=>({...f,location:t}))} />
            
            <TouchableOpacity style={[s.submitBtn, loading&&s.submitDis]} onPress={submit} disabled={loading}>
              <LinearGradient colors={[DESIGN.primary, DESIGN.secondary]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.submitGradient}>
                <Text style={s.submitTxt}>{loading ? 'PROCESSING...' : 'UPDATE LOG'}</Text>
                <ArrowRight color="#0A0E1A" size={18} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:DESIGN.bg},
  header:{padding:24,paddingTop:60},
  back:{flexDirection: 'row', alignItems: 'center', backgroundColor:DESIGN.bgCard,borderRadius:12,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:DESIGN.borderDefault,alignSelf:'flex-start',marginBottom:20},
  backTxt:{fontSize:10,fontFamily:DESIGN.fontLabel,color:DESIGN.textSecondary,marginLeft: 4, letterSpacing: 1},
  title:{fontSize:32,fontFamily:DESIGN.fontDisplayBlack,color:DESIGN.textPrimary,marginBottom:24, letterSpacing: 1},
  tabs:{flexDirection:'row',gap:12, backgroundColor: DESIGN.bgCard, padding: 4, borderRadius: 16, borderWidth: 1, borderColor: DESIGN.borderDefault},
  tab:{flex: 1, alignItems: 'center', paddingVertical:12,borderRadius:12},
  tabOn:{backgroundColor: DESIGN.bgSurface, borderWidth: 1, borderColor: DESIGN.borderDefault},
  tabTxt:{fontSize:12,fontFamily:DESIGN.fontLabel,color:DESIGN.textSecondary,letterSpacing:1, textTransform: 'uppercase'},
  tabTxtOn:{color:DESIGN.primary, fontFamily: DESIGN.fontLabelSemiBold},
  content:{padding:24,paddingBottom:120},
  summRow:{flexDirection:'row',gap:12,marginBottom:32},
  summCard:{flex:1,backgroundColor:DESIGN.bgCard,borderRadius:20,padding:16,alignItems:'center',borderWidth:1,borderColor:DESIGN.borderDefault,borderTopWidth:4},
  summN:{fontSize:32,fontFamily:DESIGN.fontDisplayBlack,color:DESIGN.textPrimary},
  summL:{fontSize:9,fontFamily:DESIGN.fontLabel,color:DESIGN.textSecondary,marginTop:6,letterSpacing:1.5},
  sectionHdr:{fontSize:11,fontFamily:DESIGN.fontLabelSemiBold,letterSpacing:2,marginBottom:16, textTransform: 'uppercase'},
  resCard:{backgroundColor:DESIGN.bgCard,borderRadius:20,padding:18,marginBottom:14,borderWidth:1,borderColor:DESIGN.borderDefault,borderLeftWidth:4},
  resTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  resName:{fontSize:16,fontFamily:DESIGN.fontBold,color:DESIGN.textPrimary},
  resBadge:{borderRadius:8,paddingHorizontal:10,paddingVertical:4,borderWidth:1},
  resBadgeTxt:{fontSize:9,fontFamily:DESIGN.fontLabelSemiBold,letterSpacing:1, textTransform: 'uppercase'},
  resBar:{flexDirection:'row',justifyContent:'space-between', alignItems: 'center'},
  resNum:{fontSize:14,fontFamily:DESIGN.fontMedium,color:DESIGN.textSecondary},
  gapBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.danger + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  resGap:{fontSize:10,fontFamily:DESIGN.fontLabelSemiBold,color:DESIGN.danger, letterSpacing: 0.5},
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  resLoc:{fontSize:12,fontFamily:DESIGN.fontBody,color:DESIGN.textMuted},
  formBox: { marginTop: 8 },
  lbl:{fontSize:10,fontFamily:DESIGN.fontLabelSemiBold,color:DESIGN.textAccent,letterSpacing:2,textTransform:'uppercase',marginBottom:12,marginTop:20},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:8},
  chip:{paddingHorizontal:16,paddingVertical:10,borderRadius:14,borderWidth:1,borderColor:DESIGN.borderDefault,backgroundColor:DESIGN.bgCard},
  chipOn:{borderColor:DESIGN.primary,backgroundColor:DESIGN.primary + '15'},
  chipTxt:{fontSize:12,fontFamily:DESIGN.fontMedium,color:DESIGN.textSecondary},
  chipTxtOn:{color:DESIGN.primary,fontFamily:DESIGN.fontBold},
  input:{backgroundColor:DESIGN.bgCard,borderRadius:16,padding:18,color:DESIGN.textPrimary,fontFamily:DESIGN.fontBody,fontSize:15,borderWidth:1,borderColor:DESIGN.borderDefault},
  rowInputs: { flexDirection: 'row', marginTop: 8 },
  submitBtn:{borderRadius:18, marginTop:40, overflow: 'hidden'},
  submitGradient: { paddingVertical:20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitDis:{opacity: 0.5},
  submitTxt:{fontSize:15,fontFamily:DESIGN.fontDisplay,color:'#0A0E1A',letterSpacing:2},
});

