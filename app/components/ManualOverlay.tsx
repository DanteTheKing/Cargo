'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Network, BookOpen } from 'lucide-react';
import { Node, Edge, ReactFlow, ReactFlowProvider, Background } from '@xyflow/react';
import { nodeTypes, edgeTypes } from './AgentCanvas';
import '@xyflow/react/dist/style.css';

interface ManualOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExample: (nodes: Node[], edges: Edge[]) => void;
}

const TOPICS = [
  { id: 'basics', title: 'Core Principles', icon: '🧠' },
  { id: 'linear', title: 'Linear Processing', icon: '➡️' },
  { id: 'auditor', title: 'Auditor Feedback Loops', icon: '⚖️' },
  { id: 'router', title: 'Deterministic Routing', icon: '🔀' },
  { id: 'hitl', title: 'Human-In-The-Loop', icon: '✋' },
  { id: 'complex', title: 'Enterprise Pipeline', icon: '🏢' },
];

const EXAMPLES: Record<string, { title: string; desc: string; nodes: Node[]; edges: Edge[] }> = {
  linear: {
    title: 'Standard Pipeline',
    desc: 'A simple linear flow taking input, processing it through a model, and outputting the result.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 100 }, data: { nodeType: 'input', label: 'Input Drum', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 300, y: 100 }, data: { nodeType: 'model', label: 'Data Extractor', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.7, systemPrompt: 'Extract key entities.' } },
      { id: 'n3', type: 'custom', position: { x: 550, y: 100 }, data: { nodeType: 'output', label: 'Output', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true }
    ]
  },
  auditor: {
    title: 'Self-Correcting Loop',
    desc: 'An auditor evaluates the model output. If it fails, it routes back to the model for correction using the Signal node as a standby gate.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 150 }, data: { nodeType: 'input', label: 'Input', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 250, y: 150 }, data: { nodeType: 'model', label: 'Generator', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.7, systemPrompt: 'Generate code.' } },
      { id: 'n3', type: 'custom', position: { x: 500, y: 150 }, data: { nodeType: 'auditor', label: 'Security Auditor', status: 'READY', provider: 'groq', modelVariant: 'groq/compound-mini', temperature: 0, systemPrompt: 'Check for vulnerabilities.' } },
      { id: 'n4', type: 'custom', position: { x: 750, y: 150 }, data: { nodeType: 'signal', label: 'Pass Gate', status: 'READY' } },
      { id: 'n5', type: 'custom', position: { x: 1000, y: 150 }, data: { nodeType: 'output', label: 'Output', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true },
      { id: 'e3', source: 'n3', target: 'n2', type: 'buttonEdge', label: 'FAIL', style: { stroke: '#ef4444' }, animated: true },
      { id: 'e4', source: 'n3', target: 'n4', type: 'buttonEdge', label: 'PASS', style: { stroke: '#22c55e' }, animated: true },
      { id: 'e5', source: 'n4', target: 'n5', type: 'buttonEdge', animated: true }
    ]
  },
  router: {
    title: 'Dynamic Routing',
    desc: 'The router evaluates the payload and routes it down a specific path based on deterministic logic.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 150 }, data: { nodeType: 'input', label: 'User Request', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 250, y: 150 }, data: { nodeType: 'router', label: 'Intent Classifier', status: 'READY' } },
      { id: 'n3', type: 'custom', position: { x: 500, y: 50 }, data: { nodeType: 'model', label: 'Technical Expert', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.1 } },
      { id: 'n4', type: 'custom', position: { x: 500, y: 250 }, data: { nodeType: 'model', label: 'Creative Writer', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.9 } },
      { id: 'n5', type: 'custom', position: { x: 750, y: 150 }, data: { nodeType: 'output', label: 'Final Result', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', label: 'Technical', animated: true },
      { id: 'e3', source: 'n2', target: 'n4', type: 'buttonEdge', label: 'Creative', animated: true },
      { id: 'e4', source: 'n3', target: 'n5', type: 'buttonEdge', animated: true },
      { id: 'e5', source: 'n4', target: 'n5', type: 'buttonEdge', animated: true }
    ]
  },
  hitl: {
    title: 'Human-In-The-Loop',
    desc: 'The flow halts at the Review Gate. A human must manually inspect and approve the payload before it proceeds to output.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 100 }, data: { nodeType: 'input', label: 'Draft Input', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 300, y: 100 }, data: { nodeType: 'model', label: 'Drafting AI', status: 'READY' } },
      { id: 'n3', type: 'custom', position: { x: 550, y: 100 }, data: { nodeType: 'wait', label: 'Review Gate', status: 'READY' } },
      { id: 'n4', type: 'custom', position: { x: 800, y: 100 }, data: { nodeType: 'output', label: 'Final Publish', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', type: 'buttonEdge', animated: true }
    ]
  },
  complex: {
    title: 'Enterprise Multi-Stage Pipeline',
    desc: 'A complex real-world scenario with research, synthesis, and multi-layered auditing.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 0, y: 150 }, data: { nodeType: 'input', label: 'Market Query', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 200, y: 150 }, data: { nodeType: 'tool', label: 'Web Researcher', status: 'READY' } },
      { id: 'n3', type: 'custom', position: { x: 450, y: 150 }, data: { nodeType: 'model', label: 'Synthesis Engine', status: 'READY' } },
      { id: 'n4', type: 'custom', position: { x: 700, y: 50 }, data: { nodeType: 'auditor', label: 'Fact Checker', status: 'READY' } },
      { id: 'n5', type: 'custom', position: { x: 700, y: 250 }, data: { nodeType: 'auditor', label: 'Style Guide', status: 'READY' } },
      { id: 'n6', type: 'custom', position: { x: 950, y: 150 }, data: { nodeType: 'wait', label: 'Stakeholder Review', status: 'READY' } },
      { id: 'n7', type: 'custom', position: { x: 1200, y: 150 }, data: { nodeType: 'output', label: 'Published Report', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', type: 'buttonEdge', animated: true },
      { id: 'e4', source: 'n3', target: 'n5', type: 'buttonEdge', animated: true },
      { id: 'e5', source: 'n4', target: 'n6', type: 'buttonEdge', animated: true },
      { id: 'e6', source: 'n5', target: 'n6', type: 'buttonEdge', animated: true },
      { id: 'e7', source: 'n6', target: 'n7', type: 'buttonEdge', animated: true }
    ]
  }
};

function MiniFlow({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          className="bg-neutral-50/50"
        >
          <Background gap={12} size={1} color="#e5e5e5" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export function ManualOverlay({ isOpen, onClose, onLoadExample }: ManualOverlayProps) {
  const [activeTopic, setActiveTopic] = useState('basics');

  if (!isOpen) return null;

  const renderContent = () => {
    if (activeTopic === 'basics') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-neutral-900 mb-4">Core Principles of CARGO</h1>
            <p className="text-neutral-600 leading-relaxed">
              CARGO is a deterministic pipeline simulation engine. It allows you to model complex agentic workflows using directed acyclic graphs (DAGs), ensuring strict adherence to global constraints (the &ldquo;Reefer&rdquo; ground truth).
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
               <h3 className="font-bold text-blue-900 mb-2 uppercase text-[10px] tracking-widest">Model Nodes</h3>
               <p className="text-xs text-blue-800/80">The primary reasoning engine. Each model operates in isolation, restricted by its specific system prompt and the global Reefer boundaries.</p>
             </div>
             <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
               <h3 className="font-bold text-orange-900 mb-2 uppercase text-[10px] tracking-widest">Auditor Nodes</h3>
               <p className="text-xs text-orange-800/80">Deterministic logic gates that evaluate the incoming payload. They do not generate content, they only return PASS or FAIL with a specific reasoning.</p>
             </div>
             <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
               <h3 className="font-bold text-purple-900 mb-2 uppercase text-[10px] tracking-widest">Router Nodes</h3>
               <p className="text-xs text-purple-800/80">Evaluates the payload and dynamically picks the most logical output edge, terminating the unused branches for that simulation run.</p>
             </div>
             <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
               <h3 className="font-bold text-amber-900 mb-2 uppercase text-[10px] tracking-widest">Wait Nodes (HITL)</h3>
               <p className="text-xs text-amber-800/80">Halts the execution pipeline. The user must manually inspect the drum payload and hit &ldquo;Approve&rdquo; for the execution to resume.</p>
             </div>
          </div>
          
          <div className="p-5 bg-neutral-900 text-white rounded-xl shadow-lg mt-8">
            <h3 className="font-black tracking-widest text-[11px] mb-2 text-neutral-400">THE DRUM PAYLOAD</h3>
            <p className="text-sm leading-relaxed text-neutral-300">
              Data travels through the wires encapsulated in a &ldquo;Drum&rdquo;. A Drum holds the compressed payload history. 
              As the Drum hits a node, the node unwraps it, processes the context, and packages its result into a new Drum to pass forward.
            </p>
          </div>
        </div>
      );
    }

    const ex = EXAMPLES[activeTopic];
    if (!ex) return null;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
        <div className="flex justify-between items-start">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-black tracking-tighter text-neutral-900 mb-2">{ex.title}</h1>
            <p className="text-neutral-600 leading-relaxed">{ex.desc}</p>
          </div>
          <button 
            onClick={() => {
              onLoadExample(ex.nodes, ex.edges);
              onClose();
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-black tracking-widest uppercase text-xs shadow-md transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Play size={14} />
            Load Setup
          </button>
        </div>
        
        <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-inner overflow-hidden min-h-[400px]">
          <MiniFlow nodes={ex.nodes} edges={ex.edges} />
        </div>

        <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Architecture Tip</p>
          <p className="text-xs text-amber-900/70 italic">This pattern is recommended for ensuring deterministic outputs in production environments.</p>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-neutral-900/40 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-7xl h-full max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20"
        >
          <div className="h-16 border-b border-neutral-100 flex items-center justify-between px-8 bg-neutral-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <BookOpen size={16} />
              </div>
              <h2 className="font-black tracking-widest text-neutral-900">CARGO OPERATIONS MANUAL</h2>
            </div>
            
            <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-neutral-100 bg-neutral-50/30 p-6 flex flex-col gap-2">
              <h3 className="text-[10px] font-black text-neutral-400 tracking-widest uppercase mb-4 px-3">Knowledge Base</h3>
              {TOPICS.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTopic(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${activeTopic === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-x-1' : 'text-neutral-600 hover:bg-neutral-100'}`}
                >
                  <span className="text-lg">{t.icon}</span>
                  {t.title}
                </button>
              ))}
              
              <div className="mt-auto p-4 bg-neutral-900 rounded-2xl text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Network size={14} className="text-blue-400" />
                  <span className="text-[10px] font-black tracking-widest uppercase">System Status</span>
                </div>
                <div className="text-[11px] text-neutral-400 leading-relaxed">
                  The simulation engine is currently running on Groq LPU technology for near-zero latency.
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-12 overflow-y-auto bg-white">
              {renderContent()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
