import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const SkeletonCard = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[s.card, { opacity }]}>
            <View style={s.topRow}>
                <View style={s.badge} />
                <View style={s.smallText} />
            </View>
            <View style={s.title} />
            <View style={s.statsRow}>
                <View style={s.stat} />
                <View style={s.stat} />
                <View style={s.stat} />
            </View>
            <View style={s.footer} />
        </Animated.View>
    );
};

export const SkeletonList = ({ count = 3 }) => (
    <View style={{ gap: 16 }}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </View>
);

const s = StyleSheet.create({
    card: { 
        backgroundColor: 'rgba(0,0,0,0.05)', 
        borderRadius: 28, 
        padding: 22, 
        height: 180, 
        borderWidth: 1, 
        borderColor: 'rgba(0,0,0,0.03)' 
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    badge: { width: 80, height: 20, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
    smallText: { width: 60, height: 12, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.05)' },
    title: { width: '70%', height: 24, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 20 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    stat: { flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
    footer: { width: 100, height: 14, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.05)' }
});
