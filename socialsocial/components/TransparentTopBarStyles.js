import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },

  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    flexShrink: 1,
  },

  leftInfo: {
    marginLeft: 12,
    justifyContent: 'center',
  },

  avatarRing: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
  },

  avatarImage: {
    height: 32,
    width: 32,
    borderRadius: 16,
  },

  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  levelChip: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    height: 16,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#5B2BEA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  levelChipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },

  levelText: {
    color: '#FFFFFF',
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    fontSize: 14,
    marginLeft: 12,
    maxWidth: 120,
  },

  centerSection: {
    display: 'none',
  },

  pillTrack: {
    marginTop: 4,
    height: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    justifyContent: 'center',
    minWidth: 120,
  },

  pillFillContainer: {
    ...Platform.select({ ios: { transformOrigin: 'left center' }, android: {} }),
    alignSelf: 'flex-start',
    height: '100%',
  },

  pillFill: {
    height: '100%',
    borderRadius: 8,
  },

  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },

  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  currencyBadge: {
    height: 22,
    width: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  coinBadgeBg: {
    backgroundColor: '#F6A700',
  },

  gemBadgeBg: {
    backgroundColor: '#6B5BFE',
  },

  currencyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },

  bottomShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 22,
  },

  bottomShadowGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
});

export default styles;


