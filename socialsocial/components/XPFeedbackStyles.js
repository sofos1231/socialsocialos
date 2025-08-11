import { StyleSheet } from 'react-native';
import theme from '../theme';

const XPFeedbackStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -20,
    right: 10,
    zIndex: 10,
  },
  
  feedbackContainer: {
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  feedbackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 60,
    justifyContent: 'center',
  },
  
  icon: {
    marginRight: 4,
  },
  
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 2,
  },
  
  xpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
  },
  
  praiseContainer: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  praiseText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default XPFeedbackStyles; 