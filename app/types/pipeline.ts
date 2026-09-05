import { Node, Edge } from '@xyflow/react';

export interface ModelProvider {
  id: string;
  name: string;
  variants: string[];
}

export const PROVIDERS: ModelProvider[] = [
  { 
    id: 'groq', 
    name: 'Groq Engine', 
    variants: [
      'groq/compound',
      'groq/compound-mini',
      'allam-2-7b',
      'canopylabs/orpheus-arabic-saudi',
      'canopylabs/orpheus-v1-english',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'meta-llama/llama-prompt-guard-2-22m',
      'meta-llama/llama-prompt-guard-2-86m',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-safeguard-20b',
      'qwen/qwen3.6-27b',
      'qwen/qwen3.8-27b',
      'whisper-large-v3',
      'whisper-large-v3-turbo'
    ]
  },
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
