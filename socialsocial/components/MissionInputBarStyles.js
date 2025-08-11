import { StyleSheet, Dimensions } from 'react-native';
import theme from '../theme';

const { width } = Dimensions.get('window');

const MissionInputBarStyles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.md,
  },
  
  blurContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  
  // Messages Left Indicator
  messagesLeftContainer: {
    position: 'absolute',
    top: -8,
    left: theme.spacing.md,
    zIndex: 10,
  },
  
  messagesLeftGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  
  messagesLeftText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 4,
  },
  
  // Input Container
  inputContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
    maxHeight: 100,
  },
  
  textInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 44,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  
  // Send Button
  sendButtonContainer: {
    alignSelf: 'flex-end',
  },
  
  sendButton: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Responsive adjustments
  ...(width < 400 && {
    blurContainer: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    textInput: {
      fontSize: 15,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      minHeight: 40,
    },
    sendButtonGradient: {
      width: 40,
      height: 40,
    },
  }),
});

export default MissionInputBarStyles; 