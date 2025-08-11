import { StyleSheet, Dimensions } from 'react-native';
import theme from '../theme.js';

const { width } = Dimensions.get('window');
// Poster geometry 2025: width ~82% of screen, height ~0.76 × width for bolder presence
const CARD_WIDTH = Math.round(width * 0.82);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.76);
const POSTER_RADIUS = 24;

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: POSTER_RADIUS,
    overflow: 'hidden',
  },

  touchable: {
    flex: 1,
    borderRadius: POSTER_RADIUS,
    overflow: 'hidden',
  },

  shimmerEffect: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: theme.borderRadius.xl + 3,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 15,
    zIndex: -1,
  },

  cardBackground: {
    flex: 1,
    borderRadius: POSTER_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)', // subtle translucent stroke
    backgroundColor: 'rgba(20, 22, 30, 0.55)', // glass base
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },

  // Cover Image Section
  coverContainer: {
    height: Math.round(CARD_HEIGHT * 0.48), // reserve top lane + emoji space
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },

  coverImage: {
    fontSize: 52, // adjusted for larger card
    textAlign: 'center',
  },

  // Top gradient overlay to ensure badge readability
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 54,
  },

  // Bottom gradient overlay to support title/subtitle
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
  },

  // Top badge lane (single baseline)
  badgeRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },

  // Left tags group
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  // Generic pill base (exact spec)
  pillBase: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Fallback temporary tag style (no longer used for new pills)
  tag: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tagText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  // XP Badge
  xpBadge: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F4C36A',
    borderWidth: 1,
    borderColor: '#D9A652',
    shadowColor: '#F4C36A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },

  xpText: { fontSize: 12, fontWeight: '700', color: '#fbbf24', marginLeft: 6 },

  // New pill variants for Trending and Duration
  pillTrending: {
    backgroundColor: '#FF4D4D',
    borderWidth: 0,
  },
  pillDuration: {
    backgroundColor: '#2E313B',
    borderWidth: 0,
  },
  pillTextLight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 6,
  },
  pillTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1E0C',
    marginLeft: 6,
  },

  // Locked Overlay
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: POSTER_RADIUS,
  },

  // Content Section
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16, // +4 for more spacious feel
    paddingTop: 12,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 22,
    lineHeight: 30, // +4 for better readability
    fontWeight: '700',
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22, // +2 line height
    fontWeight: '500',
    marginBottom: 8,
    color: 'rgba(255, 255, 255, 0.72)',
  },

  // Progress Bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: theme.borderRadius.sm,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },

  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
    minWidth: 35,
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Bottom Row
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  timeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.72)' },

  statusContainer: {
    alignSelf: 'flex-start',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#fbbf24',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default styles; 