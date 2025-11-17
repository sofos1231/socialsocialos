import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import TopBar from '../components/TopBar';

export default function DevTopBarPreview() {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/placeholder.svg') as any}
        resizeMode="repeat"
        style={styles.bg}
      >
        <TopBar coins={414408} gems={2047} streak={7} inStreak={true} />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D12' },
  bg: { flex: 1, justifyContent: 'flex-start' },
});


