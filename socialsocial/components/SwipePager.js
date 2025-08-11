import React, { useEffect, useRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

export default function SwipePager({ index = 0, onIndexChange, onProgress, children }) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ x: width * index, animated: true });
  }, [index, width]);

  const handleMomentumEnd = (event) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(xOffset / width);
    if (typeof onIndexChange === 'function') {
      onIndexChange(nextIndex);
    }
  };

  const handleScroll = (event) => {
    if (!onProgress) return;
    const xOffset = event.nativeEvent.contentOffset.x;
    const fraction = width === 0 ? 0 : xOffset / width; // 0..(pages-1)
    onProgress(fraction);
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={handleScroll}
      onMomentumScrollEnd={handleMomentumEnd}
      removeClippedSubviews
    >
      {React.Children.map(children, (child) => (
        <View style={{ width }}>{child}</View>
      ))}
    </ScrollView>
  );
}


