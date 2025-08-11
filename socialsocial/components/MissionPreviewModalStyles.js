import { StyleSheet, Dimensions } from 'react-native';
import theme from '../theme.js';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default StyleSheet.create({
  // Backdrop
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  backdropTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },

  // Modal Container
  modalContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.primary,
  },

  // Glassmorphism Background
  glassBackground: {
    position: 'relative',
    padding: theme.spacing.xxl,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    backgroundColor: theme.colors.glassBackground,
    overflow: 'hidden',
  },

  // Glow Outline
  glowOutline: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: theme.borderRadius.xl + 2,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },

  // Close Button
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...theme.shadows.primary,
  },

  // Content
  content: {
    marginTop: theme.spacing.lg,
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Subtitle
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },

  // Tags Container
  tagsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxxl,
  },

  // Difficulty Badge
  difficultyBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    minWidth: 80,
    alignItems: 'center',
    ...theme.shadows.primary,
  },

  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Time Badge
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: theme.spacing.xs,
  },

  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },

  // XP Badge
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    gap: theme.spacing.xs,
  },

  xpStarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  // Button Container
  buttonContainer: {
    alignItems: 'center',
  },

  // Button Wrapper
  buttonWrapper: {
    width: '100%',
    maxWidth: 280,
  },

  // Start Button
  startButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.glow,
  },

  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },

  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Locked Button
  lockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: theme.spacing.sm,
    opacity: 0.6,
  },

  lockedText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Responsive adjustments
  '@media (max-width: 375)': {
    modalContainer: {
      width: screenWidth * 0.95,
      padding: theme.spacing.lg,
    },
    
    title: {
      fontSize: 20,
    },
    
    subtitle: {
      fontSize: 14,
    },
    
    tagsContainer: {
      gap: theme.spacing.sm,
    },
    
    buttonGradient: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
    },
    
    buttonText: {
      fontSize: 16,
    },
  },
}); 