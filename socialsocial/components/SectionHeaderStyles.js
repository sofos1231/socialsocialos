import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  touchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  
  background: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Icon Section
  iconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  
  glowContainer: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 20,
    zIndex: 1,
  },
  
  glowBackground: {
    flex: 1,
    borderRadius: 20,
  },
  
  iconWrapper: {
    position: 'relative',
    zIndex: 2,
  },
  
  iconBackground: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  // Text Section
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  
  // Arrow Section
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
});

export default styles; 