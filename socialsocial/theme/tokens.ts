export const tokens = {
  colors: {
    background: '#0E0F13',
    surface: 'rgba(255,255,255,0.04)',
    surfaceStrong: 'rgba(255,255,255,0.08)',
    divider: 'rgba(255,255,255,0.08)',
    accent: '#7A5CFF',
    success: '#22C55E',
    gold: '#F5C542',
    danger: '#FF5D5D',
    text: '#FFFFFF',
    textMuted: '#B6B8C0',
    ringToday: 'rgba(122,92,255,0.35)',
    chipIdle: 'rgba(255,255,255,0.06)',
    chipBorder: 'rgba(255,255,255,0.18)',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
  radii: { chip: 12, card: 16, pill: 999 },
  text: { xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28 },
  motion: { micro: 200, micro2: 240, medium: 360, celebrate: 520 },
  shadow: {
    iosCard: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
    androidElev: 6,
  },
} as const;
export type Tokens = typeof tokens;


