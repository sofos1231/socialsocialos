import { StyleSheet } from 'react-native';
import theme from '../theme';

export const GLASS_BG = 'rgba(255,255,255,0.08)';
export const GLASS_BORDER = 'rgba(255,255,255,0.12)';
export const CARD_BG = 'rgba(10,10,12,0.55)';
export const CARD_BORDER = 'rgba(255,255,255,0.10)';

const styles = StyleSheet.create({
  heading: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.70)', fontSize: 14, textAlign: 'center' },
  caption: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  cardPrimary: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_BG,
    marginBottom: 12,
  },
  cardGrad: { ...StyleSheet.absoluteFillObject, opacity: 0.6 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },

  profileName: { color: '#fff', fontWeight: '900', fontSize: 22, marginBottom: 4 },
  levelRow: { flexDirection: 'row', alignItems: 'center' },

  levelPill: { borderRadius: 999, overflow: 'hidden' },
  levelPillGrad: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  levelPillText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  roleText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', marginLeft: 10 },

  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: GLASS_BORDER },
  iconBtnSmall: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: GLASS_BORDER },

  gradBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  gradBtnText: { fontWeight: '800', fontSize: 14 },

  avatarGrad: { alignItems: 'center', justifyContent: 'center' },
  avatarRing: { position: 'absolute', top: -3, left: -3, borderWidth: 2, borderColor: 'rgba(139,92,246,0.28)' },

  // Modal
  modalWrap: { ...StyleSheet.absoluteFillObject, zIndex: 50, alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalCard: { position: 'absolute', top: 110, left: 16, right: 16, borderRadius: 16, backgroundColor: 'rgba(18,18,22,0.95)', borderWidth: 1, borderColor: GLASS_BORDER, overflow: 'hidden' },
  modalHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(18,18,22,0.97)' },
  modalTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },

  rowCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  rowTitle: { color: '#fff', fontWeight: '700', fontSize: 13 },

  outlineBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, height: 36, borderRadius: 10 },
  outlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  inputLabel: { color: theme.colors.primaryForeground, fontWeight: '700', fontSize: 12, marginBottom: 6 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },

  // Generic card section
  cardSection: { borderRadius: 18, borderWidth: 1, borderColor: CARD_BORDER, backgroundColor: CARD_BG, padding: 14, marginBottom: 12 },

  sectionTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 10 },

  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: GLASS_BORDER, backgroundColor: GLASS_BG, marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: GLASS_BORDER, backgroundColor: GLASS_BG, marginBottom: 8 },

  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Account management small item
  itemCompact: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', marginTop: 4 },
  iconBadgeSm: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemSmallTitle: { color: '#fff', fontWeight: '700', fontSize: 13 },
  itemSmallCaption: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

  // Subscription
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  subtitleBold: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  premiumRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  premiumBadge: { color: '#F59E0B', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.12)' },
  crownBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#F59E0B', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },

  // Journey
  journeyCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  progressPlaceholders: { flexDirection: 'row', marginTop: 12, marginBottom: 10 },
  progressBar: { width: 36, height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 4 },
  journeyIcons: { flexDirection: 'row', marginTop: 12, opacity: 0.6, alignItems: 'center', justifyContent: 'center' },
});

export default styles;


