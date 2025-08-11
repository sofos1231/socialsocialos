// Theme constants for SocialGym app
export const theme = {
  colors: {
    // Primary colors
    primary: '#6366f1', // Purple gradient primary
    primaryForeground: '#ffffff',
    
    // Background colors
    background: 'rgba(0, 0, 0, 0.8)',
    muted: 'rgba(255, 255, 255, 0.05)',
    mutedBorder: 'rgba(255, 255, 255, 0.1)',
    
    // Text colors
    text: '#ffffff',
    textSecondary: '#fbbf24', // Yellow for XP
    textMuted: 'rgba(255, 255, 255, 0.6)',
    
    // Status colors
    success: '#22c55e', // Green
    warning: '#f59e0b', // Orange
    error: '#ef4444', // Red
    
    // Gradient colors
    gradientPrimary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    gradientCoins: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    gradientDiamonds: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    gradientGreen: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    
    // Enhanced Glass effect colors
    glassBackground: 'rgba(255, 255, 255, 0.08)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    glassBackgroundLight: 'rgba(255, 255, 255, 0.04)',
    glassBorderLight: 'rgba(255, 255, 255, 0.08)',
    
    // Premium glassmorphism colors
    glassmorphism: {
      primary: 'rgba(255, 255, 255, 0.08)',
      secondary: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 255, 255, 0.12)',
      borderLight: 'rgba(255, 255, 255, 0.08)',
      shadow: 'rgba(0, 0, 0, 0.15)',
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  typography: {
    xs: {
      fontSize: 12,
      fontWeight: '600',
    },
    sm: {
      fontSize: 14,
      fontWeight: '600',
    },
    md: {
      fontSize: 16,
      fontWeight: '600',
    },
    lg: {
      fontSize: 18,
      fontWeight: '700',
    },
    xl: {
      fontSize: 20,
      fontWeight: '700',
    },
  },
  
  shadows: {
    glow: {
      shadowColor: '#22c55e',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 8,
    },
    primary: {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    // Enhanced shadows for premium feel
    glassmorphism: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    glow: {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 25,
      elevation: 15,
    },
  },
  
  // Animation constants
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
      verySlow: 800,
    },
    easing: {
      spring: {
        tension: 100,
        friction: 8,
      },
      easeOut: 'ease-out',
      easeIn: 'ease-in',
      easeInOut: 'ease-in-out',
    },
  },
};

export default theme; 