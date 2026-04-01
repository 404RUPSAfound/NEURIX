/** 
 * NEURIX Tactical Elite UI Tokens
 * A high-performance, premium aesthetic for mission-critical operations.
 * Obsidian backgrounds, Crimson accents, and Gold status indicators.
 */
export const DESIGN = {
  // ── Obsidian Palette ─────────────────────────────────────────────
  bg: '#050505',                // Deep Obsidian
  bgSurface: '#0F0F0F',         // Slate Gray
  bgCard: 'rgba(20, 20, 20, 0.85)',   // Translucent Charcoal
  bgCardHover: '#1A1A1A',
  bgGlass: 'rgba(15, 15, 15, 0.75)',

  // ── Gradients ────────────────────────────────────────────────────
  gradientStart: '#000000',
  gradientMid: '#0A0A0E',
  gradientEnd: '#0F111A',
  accentGradient: ['#E11D48', '#9F1239'] as const, // Crimson to Deep Red
  goldGradient: ['#F59E0B', '#D97706'] as const,    // Amber to Gold

  // ── Accents (Tactical High-Visibility) ───────────────────────────
  primary: '#E11D48',           // Crimson Red
  primaryDeep: '#9F1239',
  secondary: '#F59E0B',         // Amber Gold
  secondaryDeep: '#D97706',
  accent: '#F9FAFB',            // Cold White

  // ── Status ────────────────────────────────────────────────────────
  success: '#10B981',           // Emerald
  warning: '#F59E0B',           // Amber
  danger: '#EF4444',            // Rose
  info: '#3B82F6',              // Azure
  
  critical: '#E11D48',          // Same as primary
  high: '#F97316',              // Orange
  medium: '#F59E0B',            // Amber
  low: '#10B981',               // Emerald

  // ── Text (Extreme Legibility) ────────────────────────────────────
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',     // Neutral Gray
  textMuted: '#525252',         // Deep Gray
  textAccent: '#E11D48',        // Crimson
  textGold: '#F59E0B',          // Gold

  // ── Borders & Glass ───────────────────────────────────────────────
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderDefault: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(225, 29, 72, 0.3)', // Crimson Tinted
  borderGlow: 'rgba(225, 29, 72, 0.5)',
  glassIntensity: 50,

  // ── Metrics & Radius ─────────────────────────────────────────────
  radiusCard: 28,
  radiusButton: 24,
  radiusChip: 14,

  // ── ELITE TYPOGRAPHY ──────────────────────────────────────────────
  // Authority Headings → Montserrat Black
  fontDisplay: 'Montserrat_700Bold',
  fontDisplayBlack: 'Montserrat_900Black',

  // Technical Labels → Raleway SemiBold
  fontLabel: 'Raleway_700Bold',
  fontLabelSemiBold: 'Raleway_600SemiBold',

  // Narrative / Insights → Open Sans
  fontBody: 'OpenSans_400Regular',
  fontBodySemiBold: 'OpenSans_600SemiBold',

  // Interactive Elements → Poppins
  fontRegular: 'Poppins_400Regular',
  fontMedium: 'Poppins_500Medium',
  fontBold: 'Poppins_600SemiBold',
  fontBlack: 'Poppins_700Bold',

  fontSerif: 'serif',
} as const;

export const COLORS = DESIGN;
