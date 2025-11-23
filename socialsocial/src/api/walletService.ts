// src/api/walletService.ts
// Stubs used by src/hooks/queries.ts and src/hooks/mutations.ts

export interface WalletSnapshot {
    xp: number;
    coins: number;
    gems: number;
    level: number;
  }
  
  /**
   * Return a fake wallet snapshot.
   */
  export async function getWallet(): Promise<WalletSnapshot> {
    console.warn('[walletService] getWallet() stub called – returning fake wallet');
  
    return {
      xp: 0,
      coins: 0,
      gems: 0,
      level: 1,
    };
  }
  
  /**
   * Adjust wallet – currently just logs and returns a fake snapshot.
   */
  export async function adjust(_payload: unknown): Promise<WalletSnapshot> {
    console.warn('[walletService] adjust() stub called with', _payload);
  
    return {
      xp: 0,
      coins: 0,
      gems: 0,
      level: 1,
    };
  }
  