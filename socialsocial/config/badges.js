// Provide a source for mission badge images. Use local assets via require(...) so Metro bundles them.
// Images are now under socialsocial/assets/missions

// Current mission (in-progress)
export const currentBadgeSource   = require('../assets/missions/currentmission.png');

// Locked mission
export const lockedBadgeSource    = require('../assets/missions/lockedmission.png');

// Completed mission (optional; set if you add the file below)
export const completedBadgeSource = null; // require('../assets/missions/completedmission.png');

// Premium mission
export const premiumBadgeSource   = require('../assets/missions/premiummission.png');

// Optional: show a distinct image for an available (to-do) mission
export const availableBadgeSource = null; // require('../assets/missions/availablemission.png');

// Optional: boss/video mission types
export const bossBadgeSource = null; // require('../assets/missions/bossmission.png');
export const videoBadgeSource = null; // require('../assets/missions/videomission.png');


