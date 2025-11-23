// src/api/profileService.ts
// Stub used by src/hooks/queries.ts

export interface Profile {
    id: string;
    displayName: string;
    bio: string | null;
  }
  
  /**
   * Return a fake profile object.
   */
  export async function getProfile(): Promise<Profile> {
    console.warn(
      '[profileService] getProfile() stub called – returning fake profile',
    );
  
    return {
      id: 'stub-profile',
      displayName: 'Stub User',
      bio: null,
    };
  }
  