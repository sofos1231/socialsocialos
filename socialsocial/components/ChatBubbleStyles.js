import { StyleSheet, Dimensions } from 'react-native';
import theme from '../theme';

const { width } = Dimensions.get('window');

const ChatBubbleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: theme.spacing.xs,
    maxWidth: width * 0.85,
  },
  
  // Avatar
  avatarContainer: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  
  avatarGradient: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  avatarText: {
    fontSize: 16,
  },
  
  // Bubble Container
  bubbleContainer: {
    flex: 1,
    maxWidth: width * 0.75,
  },
  
  userBubble: {
    alignItems: 'flex-end',
  },
  
  aiBubble: {
    alignItems: 'flex-start',
  },
  
  // Bubble
  bubble: {
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  
  bubbleGradient: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'relative',
  },
  
  // Message Text
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  
  userText: {
    color: theme.colors.text,
    textAlign: 'right',
  },
  
  aiText: {
    color: theme.colors.text,
    textAlign: 'left',
  },
  
  // AI Reaction
  reactionContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  reactionText: {
    fontSize: 12,
  },
  
  // Timestamp
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: theme.spacing.xs,
    opacity: 0.6,
  },
  
  userTimestamp: {
    textAlign: 'right',
    color: theme.colors.textMuted,
  },
  
  aiTimestamp: {
    textAlign: 'left',
    color: theme.colors.textMuted,
  },
  
  // Responsive adjustments
  ...(width < 400 && {
    container: {
      maxWidth: width * 0.9,
    },
    bubbleContainer: {
      maxWidth: width * 0.8,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    bubbleGradient: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
  }),
});

export default ChatBubbleStyles; 