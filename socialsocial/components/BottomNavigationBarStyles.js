import { StyleSheet } from 'react-native';
import theme from '../theme.js';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: 'rgba(8, 10, 14, 0.88)',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    paddingHorizontal: 14,
    paddingTop: 6,
    // reduce heavy shadow so no extra dark band above
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  floatingHighlight: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6A6FF8',
    shadowColor: '#6A6FF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    top: 6,
  },

  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },

  activeIconContainer: {
    backgroundColor: '#6A6FF8', // slightly more vibrant
    shadowColor: '#6A6FF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.68)',
    textAlign: 'center',
  },

  activeTabLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default styles; 