import { StyleSheet, Dimensions } from 'react-native';
import theme from '../theme';

const { width } = Dimensions.get('window');

const TopMissionBarStyles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  
  blurContainer: {
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
  
  // Back Button
  backButton: {
    marginRight: theme.spacing.md,
  },
  
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Character Container
  characterContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  avatarContainer: {
    marginRight: theme.spacing.md,
  },
  
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  avatarText: {
    fontSize: 24,
  },
  
  characterInfo: {
    flex: 1,
  },
  
  characterName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  
  difficultyContainer: {
    alignSelf: 'flex-start',
  },
  
  difficultyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  difficultyIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'uppercase',
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  
  // Timer
  timerContainer: {
    minWidth: 60,
  },
  
  timerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    marginLeft: 4,
  },
  
  // Messages
  messagesContainer: {
    minWidth: 40,
  },
  
  messagesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  
  messagesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    marginLeft: 4,
  },
  
  // Streak
  streakContainer: {
    minWidth: 50,
  },
  
  streakGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  
  streakIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  
  // Responsive adjustments
  ...(width < 400 && {
    blurContainer: {
      paddingHorizontal: theme.spacing.sm,
    },
    statsContainer: {
      gap: theme.spacing.xs,
    },
    timerContainer: {
      minWidth: 50,
    },
    messagesContainer: {
      minWidth: 35,
    },
    streakContainer: {
      minWidth: 45,
    },
  }),
});

export default TopMissionBarStyles; 