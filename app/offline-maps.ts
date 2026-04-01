import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TILE_SERVER = 'https://tile.openstreetmap.org';
// Ensure a safe directory for offline tiles
const docDir = (FileSystem as any).documentDirectory;
const TILES_DIR = Platform.OS !== 'web' && docDir ? `${docDir}map_tiles/` : '';

// Helper to calculate tile X/Y from Lat/Lng
function lon2tile(lon: number, zoom: number) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat: number, zoom: number) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

function getTileRange(bounds: { north: number; south: number; east: number; west: number }, z: number) {
  const xMin = lon2tile(bounds.west, z);
  const xMax = lon2tile(bounds.east, z);
  const yMin = lat2tile(bounds.north, z);
  const yMax = lat2tile(bounds.south, z);
  
  const tiles = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

export const downloadDistrictTiles = async (
  districtName: string,
  bounds: { north: number; south: number; east: number; west: number },
  onProgress: (percent: number) => void
) => {
  if (Platform.OS === 'web') {
    console.warn("Offline caching via FileSystem is not supported on Web. Please run Native Android/iOS.");
    onProgress(100);
    return;
  }

  const zoomLevels = [8, 9, 10, 11, 12, 13];
  let totalTiles = 0;
  let downloadedTiles = 0;
  
  // Count total required operations
  for (const z of zoomLevels) {
    const tiles = getTileRange(bounds, z);
    totalTiles += tiles.length;
  }
  
  // Create root dir if not exists
  const dirInfo = await FileSystem.getInfoAsync(TILES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(TILES_DIR, { intermediates: true });
  }

  // Iterate and download strictly
  for (const z of zoomLevels) {
    const tiles = getTileRange(bounds, z);
    
    for (const { x, y } of tiles) {
      const localPath = `${TILES_DIR}${z}/${x}/${y}.png`;
      const dir = `${TILES_DIR}${z}/${x}/`;
      
      const subDirInfo = await FileSystem.getInfoAsync(dir);
      if (!subDirInfo.exists) {
         await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      
      try {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (!fileInfo.exists) {
            await FileSystem.downloadAsync(`${TILE_SERVER}/${z}/${x}/${y}.png`, localPath);
        }
      } catch (e) {
        console.error(`Tile Download Failed for ${z}/${x}/${y}`, e);
      }
      
      downloadedTiles++;
      onProgress(Math.round((downloadedTiles / totalTiles) * 100));
    }
  }
  
  // Save manifest
  await AsyncStorage.setItem(`district_map:${districtName}`, JSON.stringify({
    bounds,
    downloadedAt: Date.now(),
    tileCount: totalTiles
  }));
  
  console.log(`✅ Cached ${totalTiles} map tiles for offline zone: ${districtName}`);
};

export const getLocalTileUrl = async (z: number, x: number, y: number): Promise<string | null> => {
  if (Platform.OS === 'web') return null;
  const localPath = `${TILES_DIR}${z}/${x}/${y}.png`;
  try {
     const info = await FileSystem.getInfoAsync(localPath);
     return info.exists ? localPath : null;
  } catch (e) {
     return null;
  }
};
export default function OfflineMapsModule() {
  return null;
}
