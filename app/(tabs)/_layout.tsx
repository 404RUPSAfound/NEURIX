import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Home, Clock, User, MessageSquare, Radar, Zap, Users, BrainCircuit, ChevronDown } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { DESIGN } from '@/constants/design';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
        tabBarStyle: s.tabBar,
        tabBarItemStyle: { height: 50, justifyContent: 'center', alignItems: 'center', paddingTop: 8 },
        tabBarBackground: () => (
          <LinearGradient 
            colors={['#0F2027', '#28623A']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 0, y: 1 }} 
            style={s.tabBarBg}
          />
        ),
      }}
      initialRouteName="index"
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <Home color={color} size={18} /> 
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <User color={color} size={18} /> 
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="map" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <Radar color={color} size={18} /> 
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="community" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <Users color={color} size={18} /> 
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="recon" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <Zap color={color} size={18} /> 
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="history" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <Clock color={color} size={18} /> 
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="report" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <BrainCircuit color={color} size={18} /> 
            </View>
          )
        }} 
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <MessageSquare color={color} size={18} /> 
            </View>
          ),
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen 
        name="more" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconBox, focused && s.iconBoxActive]}>
              <View style={{ opacity: 0.5 }}>
                 <ChevronDown color={color} size={18} /> 
              </View>
            </View>
          )
        }} 
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 4,
    right: 4,
    elevation: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  tabBarBg: {
    flex: 1,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 20px rgba(27, 94, 32, 0.3)',
      },
      default: {
        shadowColor: '#1B5E20',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }
    }),
    overflow: 'hidden',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  }
});