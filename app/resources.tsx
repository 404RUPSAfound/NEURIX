import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Package, MapPin, AlertCircle, ArrowRight, Truck, ShoppingCart } from 'lucide-react-native';
import api from '@/Store/api';
import { DESIGN } from '@/constants/design';
import { SkeletonList } from '@/components/SkeletonCards';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const PRESET_ITEMS = ['Rescue team','Medical staff','Boats','Vehicles','Tents','Food packets','Water cans','Medicine kits','Blankets','Body bags'];

export default function ResourcesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'list'|'add'|'discovery'>('discovery');
  const [form, setForm] = useState({ item:'', available:'', needed:'', unit:'units', location:'' });
  const [data, setData] = useState<any>(null);
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let coords: any = null;
      
      // FAST LOCATION STRATEGY: Try last known first (instant)
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
        coords = last.coords;
        // Start an immediate fetch with last known to populate UI fast
        fetchData(coords);
        if (!silent) setLoading(false); 
      }

      // HIGH ACCURACY SYNC (Background)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        // Only re-fetch if we didn't have last known or if it's a significant shift
        if (!coords || Math.abs(fresh.coords.latitude - coords.latitude) > 0.01) {
           fetchData(fresh.coords);
        }
      }
    } catch(e:any) { 
      console.warn('Location/Discovery bypass');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchData = async (coords: {latitude: number, longitude: number}) => {
    try {
      if (tab === 'list') {
        const res = await api.get('/resources/list');
        setData(res.data);
      } else if (tab === 'discovery') {
        const query = `[out:json];node["shop"~"hardware|supermarket|pharmacy"](around:5000,${coords.latitude},${coords.longitude});out;`;
        const res = await fetch('http://localhost:8000/api/ops/proxy', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ service: 'overpass', query })
        });
        const raw = await res.json();
        const mapped = (raw.elements || []).map((e: any) => ({
           id: e.id,
           lat: e.lat,
           lon: e.lon,
           tags: e.tags,
           name: e.tags?.name || 'Local ResourceHub',
           distanceText: 'Nearby'
        }));
        setNearby(mapped);
      }
    } catch(e) { console.error("Fetch Data Failed", e); }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load(true);
  };

  useEffect(() => { load(); }, [tab]);

  const submit = async () => {
    if (!form.item || !form.available || !form.needed) { Alert.alert('All fields are required'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v as string));
      await api.post('/resources/update', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setTab('list'); load();
      setForm({ item:'', available:'', needed:'', unit:'units', location:'' });
    } catch(e:any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const STATUS_COLOR: Record<string, string> = { CRITICAL: DESIGN.danger, LOW: DESIGN.warning, OK: DESIGN.success };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />
      <Image source={require('../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode="cover" />
      
      <View style={s.header}>
        <TouchableOpacity 
          style={s.back} 
          onPress={() => router.canGoBack() ? router.back() : router.push('/')}
        >
          <ChevronLeft color={DESIGN.textSecondary} size={20} />
          <Text style={s.backTxt}>BACK</Text>
        </TouchableOpacity>
        <Text style={s.title}>Resource Hub</Text>
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab==='discovery'&&s.tabOn]} onPress={()=>setTab('discovery')}>
            <Text style={[s.tabTxt, tab==='discovery'&&s.tabTxtOn]}>Market</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab==='list'&&s.tabOn]} onPress={()=>setTab('list')}>
            <Text style={[s.tabTxt, tab==='list'&&s.tabTxtOn]}>Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab==='add'&&s.tabOn]} onPress={()=>setTab('add')}>
            <Text style={[s.tabTxt, tab==='add'&&s.tabTxtOn]}>+ Update</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={s.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
           <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={DESIGN.primary} />
        }
      >
        {loading ? <SkeletonList count={4} /> : (
          tab === 'discovery' ? (
            nearby.length > 0 ? nearby.map((n, i) => (
              <BlurView key={i} intensity={25} tint="dark" style={s.resCard}>
                 <View style={s.resTop}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                     <ShoppingCart color={DESIGN.primary} size={18} />
                     <Text style={s.resName}>{n.tags?.name || 'Local Provision Store'}</Text>
                   </View>
                   <View style={[s.resBadge,{backgroundColor: '#E3F2FD', borderColor: '#BBDEFB'}]}>
                     <Text style={[s.resBadgeTxt,{color: '#1976D2'}]}>{n.tags?.shop?.toUpperCase() || 'SHOP'}</Text>
                   </View>
                 </View>
                 <View style={s.locRow}>
                   <MapPin color={DESIGN.textMuted} size={12} />
                   <Text style={s.resLoc}>{n.tags?.['addr:street'] || 'Nearby Tactical Node'}</Text>
                 </View>
                 <TouchableOpacity style={s.navBtnSmall} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${n.lat},${n.lon}`)}>
                    <Text style={s.navTextSmall}>NAVIGATE</Text>
                 </TouchableOpacity>
              </BlurView>
            )) : <Text style={s.emptyTxt}>NO PROCUREMENT SOURCES IN 5KM</Text>
          ) : tab === 'list' ? (
            !data ? <ActivityIndicator color={DESIGN.primary} /> : (
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
              <Text style={s.lbl}>DEPLOYMENT LOCATION</Text>
              <TextInput style={s.input} placeholder="e.g. Sector 7, Camp Brave" placeholderTextColor={DESIGN.textMuted} value={form.location} onChangeText={t=>setForm(f=>({...f,location:t}))} />
              <TouchableOpacity style={[s.submitBtn, loading&&s.submitDis]} onPress={submit} disabled={loading}>
                <LinearGradient colors={[DESIGN.primary, DESIGN.secondary]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.submitGradient}>
                  <Text style={s.submitTxt}>{loading ? 'PROCESSING...' : 'UPDATE LOG'}</Text>
                  <ArrowRight color="#0A0E1A" size={18} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#ebfbedff'},
  header:{padding:24,paddingTop:60},
  back:{flexDirection: 'row', alignItems: 'center', backgroundColor:'#FFF',borderRadius:12,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:DESIGN.borderSubtle,alignSelf:'flex-start',marginBottom:20},
  backTxt:{fontSize:10,fontFamily:DESIGN.fontLabel,color:DESIGN.textSecondary,marginLeft: 4, letterSpacing: 1},
  title:{fontSize:32,fontFamily:DESIGN.fontDisplayBlack,color:DESIGN.textPrimary,marginBottom:24, letterSpacing: 1},
  tabs:{flexDirection:'row',gap:8, backgroundColor: 'rgba(0,0,0,0.04)', padding: 4, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)'},
  tab:{flex: 1, alignItems: 'center', paddingVertical:10,borderRadius:12},
  tabOn:{backgroundColor: '#FFF', elevation: 2},
  tabTxt:{fontSize:11,fontFamily:DESIGN.fontLabel,color:DESIGN.textSecondary},
  tabTxtOn:{color:DESIGN.primary, fontFamily: DESIGN.fontLabelSemiBold},
  content:{padding:24,paddingBottom:120},
  summRow:{flexDirection:'row',gap:12,marginBottom:32},
  summCard:{flex:1,backgroundColor:'#FFF',borderRadius:20,padding:16,alignItems:'center',borderWidth:1,borderColor:'rgba(0,0,0,0.05)',borderTopWidth:4},
  summN:{fontSize:32,fontFamily:DESIGN.fontDisplayBlack,color:DESIGN.textPrimary},
  summL:{fontSize:9,fontFamily:DESIGN.fontLabel,color:DESIGN.textSecondary,marginTop:6,letterSpacing:1.5},
  sectionHdr:{fontSize:11,fontFamily:DESIGN.fontLabelSemiBold,letterSpacing:2,marginBottom:16},
  resCard:{backgroundColor:'#FFF',borderRadius:20,padding:18,marginBottom:14,borderWidth:1,borderColor:'rgba(0,0,0,0.05)'},
  resTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  resName:{fontSize:15,fontFamily:DESIGN.fontBold,color:DESIGN.textPrimary},
  resBadge:{borderRadius:8,paddingHorizontal:10,paddingVertical:4,borderWidth:1},
  resBadgeTxt:{fontSize:9,fontFamily:DESIGN.fontLabelSemiBold},
  resBar:{flexDirection:'row',justifyContent:'space-between', alignItems: 'center'},
  resNum:{fontSize:14,fontFamily:DESIGN.fontMedium,color:DESIGN.textSecondary},
  gapBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: DESIGN.danger + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  resGap:{fontSize:10,fontFamily:DESIGN.fontLabelSemiBold,color:DESIGN.danger},
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  resLoc:{fontSize:12,fontFamily:DESIGN.fontBody,color:DESIGN.textMuted},
  formBox: { marginTop: 8 },
  lbl:{fontSize:10,fontFamily:DESIGN.fontLabelSemiBold,color:DESIGN.primary,letterSpacing:2,textTransform:'uppercase',marginBottom:12,marginTop:20},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:8},
  chip:{paddingHorizontal:16,paddingVertical:10,borderRadius:14,borderWidth:1,borderColor:'#EEE',backgroundColor:'#FFF'},
  chipOn:{borderColor:DESIGN.primary,backgroundColor:DESIGN.primary + '15'},
  chipTxt:{fontSize:12,fontFamily:DESIGN.fontMedium,color:DESIGN.textSecondary},
  chipTxtOn:{color:DESIGN.primary,fontFamily:DESIGN.fontBold},
  input:{backgroundColor:'#FFF',borderRadius:16,padding:18,color:DESIGN.textPrimary,fontFamily:DESIGN.fontBody,fontSize:15,borderWidth:1,borderColor:DESIGN.borderSubtle},
  submitBtn:{borderRadius:18, marginTop:40, overflow: 'hidden'},
  submitGradient: { paddingVertical:20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitDis:{opacity: 0.5},
  submitTxt:{fontSize:15,fontFamily:DESIGN.fontDisplay,color:'#1E2F23',letterSpacing:2},
  navBtnSmall: { marginTop: 16, backgroundColor: DESIGN.primary, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  navTextSmall: { fontFamily: DESIGN.fontLabelSemiBold, color: '#FFF', fontSize: 9, letterSpacing: 1 },
  emptyTxt: { fontFamily: DESIGN.fontLabelSemiBold, color: '#90A4AE', textAlign: 'center', marginTop: 40, fontSize: 10, letterSpacing: 1 }
});
