import { StyleSheet, Dimensions } from 'react-native';
import theme from '../theme.js';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    marginTop: 16, // tighter rhythm from previous element → header
    marginBottom: 24,
  },

  // Category Header
  categoryHeader: {
    marginBottom: 16, // subtitle → carousel spacing
    paddingHorizontal: 0, // align to global gutters from parent
  },

  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryIconContainer: {
    width: 44, // 40–44 px circle
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // 10–12 px gap to text stack
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)', // subtle stroke
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  categoryTextContainer: {
    flex: 1,
  },

  categoryTitle: {
    fontSize: 24, // 24–26
    lineHeight: 30,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8, // title → subtitle spacing (exact 8)
  },

  categorySubtitle: {
    fontSize: 14, // 14–15
    lineHeight: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)', // ~80%
  },

  // Carousel Container
  carouselContainer: {
    position: 'relative',
    height: 280, // slightly taller to match enlarged cards
  },

  carouselContent: {
    paddingHorizontal: 20, // match global gutters (16–20)
    paddingVertical: 8,
  },

  // Navigation Buttons
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -18 }],
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },

  navButtonLeft: { left: -10 },

  navButtonRight: { right: -10 },
});

export default styles; 