// FILE: socialsocial/src/navigation/types.ts

export type PracticeStackParamList = {
  MissionRoad: undefined;

  PracticeSession: {
    missionId?: string;
    templateId?: string;
    personaId?: string;
    title?: string;
  };

  VoicePracticeSession: {
    topic: string;
  };

  ABPracticeSession: {
    topic: string;
  };
};

export interface PracticeMessageInput {
  role: 'USER' | 'AI';
  content: string;
}

export interface PracticeSessionRequest {
  topic: string;
  messages: PracticeMessageInput[];
  templateId?: string;   // NEW
  personaId?: string;    // NEW
}
