import { StyleSheet, Dimensions } from 'react-native';
import theme from '../theme.js';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },

  // Fullscreen background gradient layer
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  // Subtle mid-screen highlight to make carousels pop
  midHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Place roughly under the header and across first sections
    top: 120,
    height: 380,
  },

  // Radial glow wrappers
  glowTopLeft: {
    position: 'absolute',
    width: 600,
    height: 600,
    top: -180,
    left: -180,
    opacity: 0.12,
  },

  glowBottomRight: {
    position: 'absolute',
    width: 600,
    height: 600,
    bottom: -220,
    right: -220,
    opacity: 0.10,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    // Bottom padding provided by safe area insets in component
  },
  
  // Enhanced Header Section with Premium Glassmorphism (40% smaller)
  headerSection: {
    marginBottom: 12,
  },
  
  headerBackground: {
    paddingVertical: 22, // ~20% taller for prominence
    paddingHorizontal: 24, // +8px horizontal padding per spec
    borderRadius: 24, // softer pill-like
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)', // subtler border
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  
  headerSubtitle: {
    fontSize: 14, // Reduced from 18 (40% smaller)
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Categories Container
  categoriesContainer: {
    marginBottom: 12,
  },
  
  categoryWrapper: {
    marginBottom: 28,
  },
  
  // Removed bottomSpacing; handled via safe-area padding
});

export default styles; 