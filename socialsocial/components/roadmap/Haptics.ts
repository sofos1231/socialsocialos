import * as Haptics from 'expo-haptics';

export const light = async () => {
  try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
};

export const success = async () => {
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
};

export const warning = async () => {
  try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
};

export default { light, success, warning };


