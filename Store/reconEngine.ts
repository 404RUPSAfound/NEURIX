import { useState, useEffect, useCallback } from 'react';
import { reconAPI } from '@/Store/api';

export interface TacticalNode {
  id: string;
  name: string;
  type: 'FIELD_UNIT' | 'ANOMALY' | 'RECON_DRONE';
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  vitals: {
    hr: number;
    o2: number;
    battery?: number;
  };
  status: 'ACTIVE' | 'WARNING' | 'CRITICAL';
  lastSeen: string;
}

export const INITIAL_NODES: TacticalNode[] = [
  { 
    id: 'DELTA-1', 
    name: 'TEAM_DELTA_PRIMARY', 
    type: 'FIELD_UNIT', 
    x: 45, y: 30, 
    vitals: { hr: 78, o2: 98 }, 
    status: 'ACTIVE', 
    lastSeen: 'NOW' 
  },
  { 
    id: 'VECTOR-9', 
    name: 'UNIT_VECTOR_RESCUE', 
    type: 'FIELD_UNIT', 
    x: 60, y: 75, 
    vitals: { hr: 92, o2: 96 }, 
    status: 'WARNING', 
    lastSeen: 'NOW' 
  },
  { 
    id: 'DRONE-X', 
    name: 'SKY_EYE_RECON', 
    type: 'RECON_DRONE', 
    x: 20, y: 40, 
    vitals: { hr: 0, o2: 0, battery: 84 }, 
    status: 'ACTIVE', 
    lastSeen: 'NOW' 
  },
  { 
    id: 'ANOMALY-A', 
    name: 'HEAT_SIGNATURE_DETECTED', 
    type: 'ANOMALY', 
    x: 80, y: 20, 
    vitals: { hr: 0, o2: 0 }, 
    status: 'CRITICAL', 
    lastSeen: '2M_AGO' 
  },
];

export const useReconEngine = () => {
  const [nodes, setNodes] = useState<TacticalNode[]>(INITIAL_NODES);
  const [isGhostSyncing, setIsGhostSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const pullLive = async () => {
      try {
        const res = await reconAPI.liveUnits();
        if (!mounted || !res?.success) return;
        const list = Array.isArray(res.nodes) ? res.nodes : [];

        if (list.length === 0) return;

        const lats = list.map((n: any) => n.lat).filter((v: any) => typeof v === 'number');
        const lngs = list.map((n: any) => n.lng).filter((v: any) => typeof v === 'number');
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const latSpan = Math.max(maxLat - minLat, 0.01);
        const lngSpan = Math.max(maxLng - minLng, 0.01);

        const normalized: TacticalNode[] = list.map((n: any) => {
          const x = ((n.lng - minLng) / lngSpan) * 90 + 5;
          const y = ((n.lat - minLat) / latSpan) * 90 + 5;
          return {
            id: n.id,
            name: n.name || n.id,
            type: (n.type || n.unit_type || 'FIELD_UNIT') as TacticalNode['type'],
            x: Number.isFinite(x) ? x : 50,
            y: Number.isFinite(y) ? y : 50,
            vitals: {
              hr: 80,
              o2: 98,
              battery: typeof n.battery === 'number' ? n.battery : 100,
            },
            status: (String(n.status || 'ACTIVE').toUpperCase() as TacticalNode['status']) || 'ACTIVE',
            lastSeen: n.updated_at ? 'LIVE' : 'NOW',
          };
        });
        setNodes(normalized);
      } catch {
        // Keep previous data if backend unreachable.
      }
    };

    pullLive();
    const interval = setInterval(pullLive, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const triggerGhostSync = useCallback(() => {
    setIsGhostSyncing(true);
    
    // Web Audio API for tactical radar sweep sound
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 1.5);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      }
    } catch (e) {
      console.warn('GhostSync Audio failed or not supported in this environment');
    }

    setTimeout(() => {
      setIsGhostSyncing(false);
    }, 1500);
  }, []);

  return { nodes, triggerGhostSync, isGhostSyncing };
};
