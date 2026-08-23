import { Node, Edge } from '@xyflow/react';

export interface ModelProvider {
  id: string;
  name: string;
  variants: string[];
}

export const PROVIDERS: ModelProvider[] = [
  { id: 'groq', name: 'Groq (Active)', variants: ['groq/compound', 'groq/compound-mini'] },
];

export type DrumStatus = 'READY' | 'PROCESSING' | 'PENDING' | 'PASS' | 'ICE_CORRECTION' | 'PENDING_APPROVAL';

export interface DrumPayload {
  drumId: string;
  sequenceStep: number;
  compressedPayload: string;
  nextInstruction: string;
  status: DrumStatus;
}

export type ReeferGrade = 'CASUAL' | 'STANDARD' | 'PRODUCTION';

export interface ReeferSchema {
  grade: ReeferGrade;
  projectName: string;
  globalBoundaries: {
    technicalStack: string[];
    excludedFeatures: string[];
  };
  systemHierarchy: {
    architectureLayers: Record<string, string>;
  };
  validationRules: {
    passConditions: string[];
    failConditions: string[];
  };
}

export interface Session {
  id: string;
  title: string;
  reefer: ReeferSchema | null;
  logs: string[];
  nodes: Node[];
  edges: Edge[];
  drumSnapshots: Record<string, DrumPayload>;
  chatInput: string;
  chatHistory: { role: 'user' | 'ai'; content: string }[];
  timestamp: number;
  systemModel?: {
    enabled: boolean;
    description: string;
    modelRules: string;
    auditorRules: string;
  };
  pendingApprovals?: Record<string, { payload: string; outgoingEdges: Edge[]; inputDrum: DrumPayload }>;
}
