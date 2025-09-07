import { useMemo } from 'react';

export type VectorIconSpec = {
  library: 'Ionicons' | 'MaterialCommunityIcons';
  name: string;
};

export type IconSource = { type: 'image'; requirePath: any } | { type: 'vector'; spec: VectorIconSpec };

function tryRequire(path: string): any | null {
  try {
    // Metro requires static paths; we keep them constant per spec
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(path);
  } catch (e) {
    return null;
  }
}

export function useIconSource(kind: 'coin' | 'diamond' | 'streak'): IconSource {
  return useMemo(() => {
    if (kind === 'coin') {
      const img = tryRequire('../../assets/icons/gold-coin.png');
      if (img) return { type: 'image', requirePath: img };
      return { type: 'vector', spec: { library: 'MaterialCommunityIcons', name: 'coin' } };
    }
    if (kind === 'diamond') {
      const img = tryRequire('../../assets/icons/diamond.png');
      if (img) return { type: 'image', requirePath: img };
      return { type: 'vector', spec: { library: 'MaterialCommunityIcons', name: 'diamond-stone' } };
    }
    const img = tryRequire('../../assets/icons/streak-coin.png');
    if (img) return { type: 'image', requirePath: img };
    return { type: 'vector', spec: { library: 'Ionicons', name: 'flame' } };
  }, [kind]);
}

// Placeholder: We'll wire network client separately.


