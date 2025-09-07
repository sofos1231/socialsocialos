import { StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

const styles = StyleSheet.create({
  safe: {
    backgroundColor: 'transparent',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '60%',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  textCol: {
    marginLeft: 10,
    flexShrink: 1,
  },
  userName: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  memberPressable: {
    marginTop: 4,
    maxWidth: '100%',
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    ...tokens.shadow.iosCard,
  },
  memberText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 12,
    marginRight: 8,
  },
  memberArrowCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: tokens.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  pillIcon: { width: 18, height: 18, marginRight: 6 },
  pillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});

export default styles;


