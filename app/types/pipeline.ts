import { Node, Edge } from '@xyflow/react';

export interface ModelProvider {
  id: string;
  name: string;
  variants: string[];
}

export const PROVIDERS: ModelProvider[] = [
  { id: 'groq', name: 'Groq (Active)', variants: ['llama-4-400b', 'deepseek-v3-coder', 'mistral-large-3'] },
  { id: 'gemini', name: 'Google Gemini', variants: ['gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-ultra'] },
  { id: 'anthropic', name: 'Anthropic Claude', variants: ['claude-4-sonnet', 'claude-4-opus', 'claude-4-haiku'] },
];

export type DrumStatus = 'READY' | 'PROCESSING' | 'PENDING' | 'PASS' | 'INTERRUPT' | 'ICE_CORRECTION';

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
  timestamp: number;
}
