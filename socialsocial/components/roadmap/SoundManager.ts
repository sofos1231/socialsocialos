// Lightweight sound manager.
// To avoid bundling issues when sound assets are not present, we no-op by default.
// If you add local sounds at socialsocial/assets/sounds/{tap,complete,milestone}.wav,
// you can switch on playback by setting ENABLE_SOUNDS = true and ensuring the requires exist.

let ENABLE_SOUNDS = false;

export type SoundName = 'tap' | 'complete' | 'milestone';

export async function play(_name: SoundName) {
  if (!ENABLE_SOUNDS) return;
  // Optional: implement asset-backed playback here if assets are added.
}

export default { play };


