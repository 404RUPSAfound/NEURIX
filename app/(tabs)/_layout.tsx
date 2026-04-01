import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Home, Clock, User, MessageSquare, Radar, Zap, Users, BrainCircuit } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { DESIGN } from '@/constants/design';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: DESIGN.primary,
        tabBarInactiveTintColor: DESIGN.textMuted,
        tabBarStyle: s.tabBar,
        tabBarBackground: () => (
          <View style={s.tabBarBg}>
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          </View>
        ),
      }}
      initialRouteName="index"
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          tabBarIcon: ({ color }) => <Home color={color} size={24} /> 
        }} 
      />
      <Tabs.Screen 
        name="community" 
        options={{ 
          tabBarIcon: ({ color }) => <Users color={color} size={24} /> 
        }} 
      />
      <Tabs.Screen 
        name="map" 
        options={{ 
          tabBarIcon: ({ color }) => <Radar color={color} size={24} /> 
        }} 
      />
      <Tabs.Screen 
        name="report" 
        options={{ 
          tabBarIcon: ({ color }) => <BrainCircuit color={color} size={24} /> 
        }} 
      />
      <Tabs.Screen 
        name="recon" 
        options={{ 
          tabBarIcon: ({ color }) => <Zap color={color} size={24} /> 
        }} 
      />
      <Tabs.Screen 
        name="history" 
        options={{ 
          tabBarIcon: ({ color }) => <Clock color={color} size={24} /> 
        }} 
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} />,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          tabBarIcon: ({ color }) => <User color={color} size={24} /> 
        }} 
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    elevation: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  tabBarBg: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.85)',
    borderRadius: 36,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: `0px 10px 20px ${DESIGN.primary}4D`,
      },
      default: {
        shadowColor: DESIGN.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      }
    }),
    overflow: 'hidden',
  }
});