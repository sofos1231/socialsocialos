import { StyleSheet, Dimensions, Platform } from 'react-native';
import theme from '../theme';

const { width, height } = Dimensions.get('window');

const MissionScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  keyboardAvoid: {
    flex: 1,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  
  // XP Progress Bar
  xpProgressContainer: {
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.full,
    marginVertical: theme.spacing.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  xpProgressBar: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  
  xpProgressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Chat Container
  chatContainer: {
    flex: 1,
    marginVertical: theme.spacing.md,
  },
  
  chatContent: {
    paddingBottom: theme.spacing.xl,
  },
  
  // XP Forecast
  xpForecastContainer: {
    marginBottom: theme.spacing.md,
  },
  
  xpForecast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  
  xpForecastText: {
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    flex: 1,
  },
  
  // Animation styles
  fadeIn: {
    opacity: 0,
  },
  
  slideUp: {
    transform: [{ translateY: 20 }],
  },
  
  // Glassmorphism effects
  glassBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.lg,
  },
  
  // Shadow and glow effects
  primaryShadow: {
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  
  successGlow: {
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  
  // Responsive adjustments
  responsivePadding: {
    paddingHorizontal: width > 400 ? theme.spacing.xl : theme.spacing.lg,
  },
  
  // Platform-specific styles
  ...Platform.select({
    ios: {
      container: {
        backgroundColor: theme.colors.background,
      },
    },
    android: {
      container: {
        backgroundColor: theme.colors.background,
      },
    },
  }),
});

export default MissionScreenStyles; 