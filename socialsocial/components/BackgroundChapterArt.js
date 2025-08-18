import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { datingBackgroundSource } from '../config/backgrounds';

// Background artwork behind the roadmap, blurred and subtle
// Uses chapter-specific art if provided, else falls back to currentmission
const BackgroundChapterArt = ({ category = 'default' }) => {
  let source = null;

  if (category === 'dating' && datingBackgroundSource) {
    source = datingBackgroundSource;
  }

  if (!source) {
    try {
      source = require('../assets/missions/currentmission.png');
    } catch (e) {
      source = null;
    }
  }
  if (!source) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      <Image
        source={source}
        blurRadius={10}
        resizeMode="cover"
        style={{
          position: 'absolute',
          width: '120%',
          height: '120%',
          left: '-10%',
          top: '-6%',
          opacity: 0.48,
        }}
      />
      {/* Contrast and vignette overlays */}
      <LinearGradient
        colors={[ 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.35)' ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <LinearGradient
        colors={[ 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.35)' ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      {/* Vibrant color wash for excitement */}
      <LinearGradient
        colors={[ 'rgba(236,72,153,0.14)', 'rgba(168,85,247,0.10)', 'rgba(236,72,153,0.14)' ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
    </View>
  );
};

export default BackgroundChapterArt;


