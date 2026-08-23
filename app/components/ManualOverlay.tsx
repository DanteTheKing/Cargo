'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Network, BookOpen, ChevronRight, Info } from 'lucide-react';
import { Node, Edge, ReactFlow, ReactFlowProvider, Background, useReactFlow } from '@xyflow/react';
import { nodeTypes, edgeTypes } from './AgentCanvas';
import '@xyflow/react/dist/style.css';

interface ManualOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExample: (nodes: Node[], edges: Edge[]) => void;
}

const TOPICS = [
  { id: 'basics', title: 'Core Principles', icon: '🧠', subtitle: 'The foundation of CARGO' },
  { id: 'linear', title: 'Linear Processing', icon: '➡️', subtitle: 'Simple sequential flows' },
  { id: 'auditor', title: 'Self-Correcting Loops', icon: '⚖️', subtitle: 'Autonomous QA patterns' },
  { id: 'router', title: 'Deterministic Routing', icon: '🔀', subtitle: 'Dynamic path selection' },
  { id: 'hitl', title: 'Human-In-The-Loop', icon: '✋', subtitle: 'The manual safety gate' },
  { id: 'complex', title: 'Enterprise Pipeline', icon: '🏢', subtitle: 'High-scale orchestration' },
];

const EXAMPLES: Record<string, { title: string; desc: string; nodes: Node[]; edges: Edge[] }> = {
  linear: {
    title: 'Standard Pipeline',
    desc: 'A simple linear flow taking input, processing it through a model, and outputting the result. Perfect for extraction or simple transformation tasks.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 150 }, data: { nodeType: 'input', label: 'Raw Data Drum', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 300, y: 150 }, data: { nodeType: 'model', label: 'Contextualizer', status: 'READY', provider: 'groq', modelVariant: 'groq/compound' } },
      { id: 'n3', type: 'custom', position: { x: 550, y: 150 }, data: { nodeType: 'output', label: 'Final Record', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true }
    ]
  },
  auditor: {
    title: 'Self-Correcting Auditor',
    desc: 'The gold standard for agentic systems. The Auditor evaluates output against the Reefer ground truth. If it fails, it triggers an ICE correction back to the model.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 150 }, data: { nodeType: 'input', label: 'Requirement', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 250, y: 150 }, data: { nodeType: 'model', label: 'Generator', status: 'READY', provider: 'groq', modelVariant: 'groq/compound' } },
      { id: 'n3', type: 'custom', position: { x: 500, y: 150 }, data: { nodeType: 'auditor', label: 'Logic Auditor', status: 'READY', provider: 'groq', modelVariant: 'groq/compound-mini' } },
      { id: 'n4', type: 'custom', position: { x: 750, y: 150 }, data: { nodeType: 'signal', label: 'Approval Gate', status: 'READY' } },
      { id: 'n5', type: 'custom', position: { x: 1000, y: 150 }, data: { nodeType: 'output', label: 'Verified Output', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true },
      { id: 'e3', source: 'n3', target: 'n2', type: 'buttonEdge', label: 'ICE CORRECTION', style: { stroke: '#f59e0b', strokeWidth: 3 }, animated: true },
      { id: 'e4', source: 'n3', target: 'n4', type: 'buttonEdge', label: 'PASS', style: { stroke: '#22c55e' }, animated: true },
      { id: 'e5', source: 'n4', target: 'n5', type: 'buttonEdge', animated: true }
    ]
  },
  router: {
    title: 'Intent-Based Routing',
    desc: 'Dynamic branching. The Router classifies the incoming drum and routes it to specialized expert models for domain-specific processing.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 150 }, data: { nodeType: 'input', label: 'Multi-Task Input', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 250, y: 150 }, data: { nodeType: 'router', label: 'Traffic Manager', status: 'READY' } },
      { id: 'n3', type: 'custom', position: { x: 500, y: 50 }, data: { nodeType: 'model', label: 'Technical Node', status: 'READY' } },
      { id: 'n4', type: 'custom', position: { x: 500, y: 250 }, data: { nodeType: 'model', label: 'Creative Node', status: 'READY' } },
      { id: 'n5', type: 'custom', position: { x: 750, y: 150 }, data: { nodeType: 'output', label: 'Unified Response', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', label: 'TECHNICAL', animated: true },
      { id: 'e3', source: 'n2', target: 'n4', type: 'buttonEdge', label: 'CREATIVE', animated: true },
      { id: 'e4', source: 'n3', target: 'n5', type: 'buttonEdge', animated: true },
      { id: 'e5', source: 'n4', target: 'n5', type: 'buttonEdge', animated: true }
    ]
  },
  hitl: {
    title: 'Human-In-The-Loop',
    desc: 'The safety-first architecture. The system pauses execution at the Wait node, requiring a manual &ldquo;Approve&rdquo; via the Drum inspection UI.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 100, y: 150 }, data: { nodeType: 'input', label: 'Proposal', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 350, y: 150 }, data: { nodeType: 'model', label: 'Drafter', status: 'READY' } },
      { id: 'n3', type: 'custom', position: { x: 600, y: 150 }, data: { nodeType: 'wait', label: 'Human Review', status: 'READY' } },
      { id: 'n4', type: 'custom', position: { x: 850, y: 150 }, data: { nodeType: 'output', label: 'Signed Document', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', type: 'buttonEdge', animated: true }
    ]
  },
  complex: {
    title: 'Enterprise Logic Pipeline',
    desc: 'A robust multi-agent swarm. Combines research, parallel auditing, and human oversight for high-compliance environments.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 0, y: 200 }, data: { nodeType: 'input', label: 'Global Query', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 200, y: 200 }, data: { nodeType: 'tool', label: 'Researcher', status: 'READY' } },
      { id: 'n3', type: 'custom', position: { x: 450, y: 200 }, data: { nodeType: 'model', label: 'Synthesizer', status: 'READY' } },
      { id: 'n4', type: 'custom', position: { x: 700, y: 100 }, data: { nodeType: 'auditor', label: 'Facts', status: 'READY' } },
      { id: 'n5', type: 'custom', position: { x: 700, y: 300 }, data: { nodeType: 'auditor', label: 'Policy', status: 'READY' } },
      { id: 'n6', type: 'custom', position: { x: 950, y: 200 }, data: { nodeType: 'wait', label: 'CEO Review', status: 'READY' } },
      { id: 'n7', type: 'custom', position: { x: 1200, y: 200 }, data: { nodeType: 'output', label: 'Published', status: 'READY' } }
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

const MiniFlowContent = ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
  const { fitView } = useReactFlow();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.4, duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [nodes, edges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesConnectable={false}
      nodesDraggable={false}
      elementsSelectable={false}
      panOnDrag={true}
      zoomOnScroll={true}
      fitView
      className="bg-neutral-50/50"
    >
      <Background gap={16} size={1} color="#e5e7eb" />
    </ReactFlow>
  );
};

function MiniFlow({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  return (
    <div className="w-full h-full relative group">
      <ReactFlowProvider>
        <MiniFlowContent nodes={nodes} edges={edges} />
      </ReactFlowProvider>
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
        Interactive Preview
      </div>
    </div>
  );
}

export function ManualOverlay({ isOpen, onClose, onLoadExample }: ManualOverlayProps) {
  const [activeTopic, setActiveTopic] = useState('basics');

  if (!isOpen) return null;

  const handleLoad = (ex: any) => {
    try {
      // Deep clone to prevent shared reference mutations
      const clonedNodes = JSON.parse(JSON.stringify(ex.nodes));
      const clonedEdges = JSON.parse(JSON.stringify(ex.edges));
      onLoadExample(clonedNodes, clonedEdges);
    } catch (err) {
      console.error('Failed to load example setup:', err);
    }
  };

  const renderContent = () => {
    if (activeTopic === 'basics') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Network size={14} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Architecture Overview</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-neutral-900 mb-4">Core Principles of CARGO</h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              CARGO operates on a deterministic, swarm-based orchestration model. Every pipeline is a directed graph where data moves within encapsulated &ldquo;Drums,&rdquo; subject to global &ldquo;Reefer&rdquo; constraints.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
             <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl group hover:border-blue-300 transition-colors">
               <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4 font-bold text-lg italic">M</div>
               <h3 className="font-black text-neutral-900 mb-2 uppercase text-[11px] tracking-widest">Model Nodes</h3>
               <p className="text-sm text-neutral-600 leading-relaxed">The reasoning engines. Each node acts as an isolated micro-agent with specific temperature and prompt parameters.</p>
             </div>
             <div className="p-6 bg-purple-50/50 border border-purple-100 rounded-2xl group hover:border-purple-300 transition-colors">
               <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4 font-bold text-lg italic">A</div>
               <h3 className="font-black text-neutral-900 mb-2 uppercase text-[11px] tracking-widest">Auditor Nodes</h3>
               <p className="text-sm text-neutral-600 leading-relaxed">Deterministic logic gates. They do not generate—they validate. Essential for loops and quality control.</p>
             </div>
             <div className="p-6 bg-fuchsia-50/50 border border-fuchsia-100 rounded-2xl group hover:border-fuchsia-300 transition-colors">
               <div className="w-10 h-10 bg-fuchsia-100 rounded-lg flex items-center justify-center text-fuchsia-600 mb-4 font-bold text-lg italic">R</div>
               <h3 className="font-black text-neutral-900 mb-2 uppercase text-[11px] tracking-widest">Router Nodes</h3>
               <p className="text-sm text-neutral-600 leading-relaxed">Dynamic classifiers. They evaluate the drum payload and pick the next logical wire for the execution path.</p>
             </div>
             <div className="p-6 bg-cyan-50/50 border border-cyan-100 rounded-2xl group hover:border-cyan-300 transition-colors">
               <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 mb-4 font-bold text-lg italic">W</div>
               <h3 className="font-black text-neutral-900 mb-2 uppercase text-[11px] tracking-widest">Wait Nodes (HITL)</h3>
               <p className="text-sm text-neutral-600 leading-relaxed">Safety interlocks. Halts the drum until a human provides cryptographic approval or manual correction.</p>
             </div>
          </div>
          
          <div className="p-8 bg-neutral-900 text-white rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Info size={120} />
            </div>
            <h3 className="font-black tracking-[0.3em] text-[11px] mb-4 text-neutral-500 uppercase">THE DRUM SPECIFICATION</h3>
            <p className="text-base leading-relaxed text-neutral-300 relative z-10 max-w-2xl">
              Data is never &ldquo;raw.&rdquo; It travels in a &ldquo;Drum&rdquo; package that maintains a compressed hash of its entire history. 
              As a Drum passes through nodes, its state is immutable—only the current node can generate the next iteration of the payload.
            </p>
          </div>
        </div>
      );
    }

    const ex = EXAMPLES[activeTopic];
    if (!ex) return null;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
        <div className="flex justify-between items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Network size={14} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Active Blueprint</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-neutral-900 mb-3">{ex.title}</h1>
            <p className="text-lg text-neutral-600 leading-relaxed">{ex.desc}</p>
          </div>
          <button 
            onClick={() => handleLoad(ex)}
            className="flex items-center gap-3 bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-4 rounded-2xl font-black tracking-widest uppercase text-xs shadow-xl transition-all hover:-translate-y-1 active:translate-y-0"
          >
            <Play size={16} fill="white" />
            Inject Setup
          </button>
        </div>
        
        <div className="flex-1 bg-white rounded-[32px] border border-neutral-200 shadow-inner overflow-hidden min-h-[400px] border-dashed">
          <MiniFlow nodes={ex.nodes} edges={ex.edges} />
        </div>

        <div className="flex items-center gap-6 p-6 bg-neutral-50 border border-neutral-200 rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-neutral-100">
            <Info size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Architectural Insight</p>
            <p className="text-sm text-neutral-600 font-medium italic">This configuration utilizes the &ldquo;Signal Standby&rdquo; pattern to prevent uncontrolled model output leakage.</p>
          </div>
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
        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-neutral-950/60 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-[1400px] h-full max-h-[90vh] bg-white rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col border border-white/20"
        >
          {/* Header */}
          <div className="h-20 border-b border-neutral-100 flex items-center justify-between px-10 bg-neutral-50/80 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-200 flex items-center justify-center text-white">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="font-black tracking-[0.2em] text-neutral-900 uppercase text-sm">CARGO OPERATIONS MANUAL</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Live Documentation / Version 0.1.0</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose} 
              className="group p-3 hover:bg-neutral-900 rounded-full transition-all duration-300"
            >
              <X size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
            </button>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r border-neutral-100 bg-neutral-50/50 p-8 flex flex-col">
              <div className="mb-8 px-4">
                <h3 className="text-[10px] font-black text-neutral-400 tracking-[0.3em] uppercase mb-1">Knowledge Modules</h3>
                <div className="h-1 w-12 bg-blue-600 rounded-full" />
              </div>
              
              <div className="flex flex-col gap-3">
                {TOPICS.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveTopic(t.id)}
                    className={`group relative w-full flex flex-col px-5 py-4 rounded-3xl transition-all text-left ${activeTopic === t.id ? 'bg-white shadow-xl shadow-neutral-200/50 scale-[1.02]' : 'hover:bg-neutral-100/80'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <span className={`text-xl transition-transform ${activeTopic === t.id ? 'scale-110' : 'group-hover:scale-110 opacity-70'}`}>{t.icon}</span>
                        <span className={`font-black text-xs tracking-wider transition-colors ${activeTopic === t.id ? 'text-neutral-900' : 'text-neutral-500'}`}>{t.title.toUpperCase()}</span>
                      </div>
                      {activeTopic === t.id && <ChevronRight size={14} className="text-blue-600" />}
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400 pl-8">{t.subtitle}</span>
                  </button>
                ))}
              </div>
              
              {/* Bottom Card */}
              <div className="mt-auto p-6 bg-neutral-900 rounded-[32px] text-white shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                    <Network size={14} className="text-blue-400" />
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase">Global Mesh</span>
                </div>
                <div className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                  Autonomous agents are governed by strict causal logic. Ensure all paths terminate in an Output or Terminal node.
                </div>
              </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 p-16 overflow-y-auto bg-white">
              <div className="max-w-5xl mx-auto h-full">
                {renderContent()}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
