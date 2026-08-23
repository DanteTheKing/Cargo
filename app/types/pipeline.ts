import { Node, Edge } from '@xyflow/react';

export interface ModelProvider {
  id: string;
  name: string;
  variants: string[];
}

export const PROVIDERS: ModelProvider[] = [
  { id: 'gemini', name: 'Google Gemini', variants: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'] },
  { id: 'anthropic', name: 'Anthropic Claude', variants: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
  { id: 'groq', name: 'Groq', variants: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b'] },
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
