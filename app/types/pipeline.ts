import { Node, Edge } from '@xyflow/react';

export interface ModelProvider {
  id: string;
  name: string;
  variants: string[];
}

export const PROVIDERS: ModelProvider[] = [
  { id: 'groq', name: 'Groq (Active)', variants: ['meta/llama-3.3-70b', 'meta/llama-3.1-8b', 'qwen/qwen3.6-27b', 'groq/compound', 'groq/compound-mini'] },
  { id: 'gemini', name: 'Google Gemini', variants: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'] },
  { id: 'anthropic', name: 'Anthropic Claude', variants: ['claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-haiku-latest'] },
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
  chatHistory: { role: 'user' | 'ai'; content: string }[];
  timestamp: number;
}
