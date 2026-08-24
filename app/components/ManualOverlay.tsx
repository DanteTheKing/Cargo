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
  onStartTutorial: () => void;
}

const TOPICS = [
  { id: 'basics', title: 'Core Principles', subtitle: 'The foundation of CARGO' },
  { id: 'system', title: 'System Model', subtitle: 'Ground Truth & Rules' },
  { id: 'reefer', title: 'Project Reefer', subtitle: 'Technical Hierarchy' },
  { id: 'drums', title: 'Drum Payloads', subtitle: 'State & History' },
  { id: 'linear', title: 'Linear Processing', subtitle: 'Simple sequential flows' },
  { id: 'auditor', title: 'Self-Correcting Loops', subtitle: 'Autonomous QA patterns' },
  { id: 'router', title: 'Deterministic Routing', subtitle: 'Dynamic path selection' },
  { id: 'hitl', title: 'Human-In-The-Loop', subtitle: 'The manual safety gate' },
  { id: 'complex', title: 'Enterprise Pipeline', subtitle: 'High-scale orchestration' },
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
    desc: 'The gold standard for agentic systems. The Auditor evaluates output against the Reefer ground truth. If it fails, it triggers an ICE (Internal Correction Engine) loop.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 150 }, data: { nodeType: 'input', label: 'Requirement', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 250, y: 150 }, data: { nodeType: 'model', label: 'Generator', status: 'READY', provider: 'groq', modelVariant: 'groq/compound' } },
      { id: 'n3', type: 'custom', position: { x: 500, y: 150 }, data: { nodeType: 'auditor', label: 'Logic Auditor', status: 'READY', provider: 'groq', modelVariant: 'groq/compound-mini' } },
      { id: 'n4', type: 'custom', position: { x: 750, y: 150 }, data: { nodeType: 'output', label: 'Approved Result', status: 'READY' } },
      { id: 'n5', type: 'custom', position: { x: 1000, y: 150 }, data: { nodeType: 'output', label: 'Verified Output', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true },
      { id: 'e3', source: 'n3', target: 'n2', type: 'buttonEdge', label: 'REJECTION', style: { stroke: '#ef4444', strokeWidth: 3 }, animated: true },
      { id: 'e4', source: 'n3', target: 'n4', type: 'buttonEdge', label: 'PASS', style: { stroke: '#22c55e' }, animated: true },
      { id: 'e5', source: 'n4', target: 'n5', type: 'buttonEdge', animated: true }
    ]
  },
  router: {
    title: 'Intent-Based Routing',
    desc: 'Dynamic branching. The Router evaluates the drum payload and pick the path that matches the intent of the data.',
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
    desc: 'Safety-first architecture. The Wait node pauses execution and pushes an approval request to the Chat Terminal for human intervention.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 100, y: 150 }, data: { nodeType: 'input', label: 'Draft Proposal', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 350, y: 150 }, data: { nodeType: 'model', label: 'AI Writer', status: 'READY' } },
      { id: 'n3', type: 'custom', position: { x: 600, y: 150 }, data: { nodeType: 'wait', label: 'Manager Review', status: 'READY' } },
      { id: 'n4', type: 'custom', position: { x: 850, y: 150 }, data: { nodeType: 'output', label: 'Approved Result', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', type: 'buttonEdge', animated: true }
    ]
  },
  complex: {
    title: 'Enterprise Pipeline',
    desc: 'High-compliance workflow combining research, parallel auditing, and human oversight.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 0, y: 200 }, data: { nodeType: 'input', label: 'Global Query', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 200, y: 200 }, data: { nodeType: 'tool', label: 'Researcher', status: 'READY', toolType: 'SUMMARY' } },
      { id: 'n3', type: 'custom', position: { x: 450, y: 200 }, data: { nodeType: 'model', label: 'Synthesizer', status: 'READY' } },
      { id: 'n4', type: 'custom', position: { x: 700, y: 100 }, data: { nodeType: 'auditor', label: 'Facts Audit', status: 'READY' } },
      { id: 'n5', type: 'custom', position: { x: 700, y: 300 }, data: { nodeType: 'auditor', label: 'Policy Audit', status: 'READY' } },
      { id: 'n6', type: 'custom', position: { x: 950, y: 200 }, data: { nodeType: 'wait', label: 'CEO Approval', status: 'READY' } },
      { id: 'n7', type: 'custom', position: { x: 1200, y: 200 }, data: { nodeType: 'output', label: 'Final Release', status: 'READY' } }
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

export function ManualOverlay({ isOpen, onClose, onLoadExample, onStartTutorial }: ManualOverlayProps) {
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
            <p className="text-lg text-neutral-600 leading-relaxed mb-6">
              CARGO operates on a deterministic, swarm-based orchestration model. Every pipeline is a directed graph where data moves within encapsulated &ldquo;Drums,&rdquo; subject to global &ldquo;Reefer&rdquo; constraints.
            </p>
            <button 
              onClick={onStartTutorial}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black tracking-widest uppercase text-xs shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:translate-y-0"
            >
              <Play size={16} fill="white" />
              Start Guided Tour
            </button>
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
        </div>
      );
    }

    if (activeTopic === 'system') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Network size={14} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Control Layer</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-neutral-900 mb-4">The System Model</h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              The System Model is the &ldquo;Ground Truth&rdquo; of your swarm. It establishes the global identity, architectural rules, and validation logic that every node must follow.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
              <h4 className="font-black text-amber-800 text-[10px] uppercase tracking-widest mb-2">Project DNA</h4>
              <p className="text-xs text-amber-900/70 leading-relaxed">The high-level description of your application. All agents use this to understand the &ldquo;Why&rdquo; behind the swarm.</p>
            </div>
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
              <h4 className="font-black text-amber-800 text-[10px] uppercase tracking-widest mb-2">Model Rules</h4>
              <p className="text-xs text-amber-900/70 leading-relaxed">Constraints on generation. Forces agents to use specific libraries, coding styles, or structural patterns.</p>
            </div>
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
              <h4 className="font-black text-amber-800 text-[10px] uppercase tracking-widest mb-2">Auditor Rules</h4>
              <p className="text-xs text-amber-900/70 leading-relaxed">Constraints on validation. Defines what constitutes a &ldquo;Pass&rdquo; or &ldquo;Fail&rdquo; for autonomous QA nodes.</p>
            </div>
          </div>

          <div className="p-8 bg-amber-600 text-white rounded-3xl shadow-xl">
            <h3 className="font-black text-xs uppercase tracking-widest mb-4">The Architect Principle</h3>
            <p className="text-base leading-relaxed font-medium">
              By setting the System Model, you are effectively acting as the Principal Architect. You don&apos;t need to prompt every node individually; the System Model ensures they all inherit the same technical constraints and business logic.
            </p>
          </div>
        </div>
      );
    }

    if (activeTopic === 'reefer') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <Network size={14} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Context Engine</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-neutral-900 mb-4">Project Reefer</h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              The Reefer represents your technical environment. It is a live map of your project files, dependencies, and hierarchy that provides agents with precise structural context.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-6 bg-green-50 border border-green-100 rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-green-200 flex items-center justify-center text-green-700 shrink-0 font-bold">01</div>
              <div>
                <h4 className="font-black text-neutral-900 text-xs uppercase tracking-widest mb-1">Structural Awareness</h4>
                <p className="text-sm text-neutral-600 leading-relaxed">Agents can see your folder structure (e.g., /app/components, /lib/utils), preventing them from suggesting &ldquo;hallucinated&rdquo; file paths.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-green-50 border border-green-100 rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-green-200 flex items-center justify-center text-green-700 shrink-0 font-bold">02</div>
              <div>
                <h4 className="font-black text-neutral-900 text-xs uppercase tracking-widest mb-1">Dependency Enforcement</h4>
                <p className="text-sm text-neutral-600 leading-relaxed">By referencing the Reefer, CARGO ensures that any code generated by a model node is compatible with your existing project state.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTopic === 'drums') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <Network size={14} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Data Packets</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-neutral-900 mb-4">The Drum Payload</h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Data in CARGO is never loose. It travels in &ldquo;Drums&rdquo;—immutable packets that maintain the state, history, and instructions for every step of the orchestration.
            </p>
          </div>

          <div className="p-8 bg-neutral-900 text-white rounded-[40px] border border-neutral-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
               <Network size={200} />
            </div>
            <div className="grid grid-cols-2 gap-12 relative z-10">
              <div>
                <h4 className="font-black text-rose-500 text-[10px] uppercase tracking-[0.3em] mb-4">The Context Thread</h4>
                <p className="text-sm text-neutral-400 leading-relaxed mb-6">Drums carry a history of previous transformations. As a payload moves from Node A to Node B, Node B receives the original intent plus Node A&apos;s refinement.</p>
                <div className="h-px w-12 bg-rose-500" />
              </div>
              <div>
                <h4 className="font-black text-rose-500 text-[10px] uppercase tracking-[0.3em] mb-4">History Compression</h4>
                <p className="text-sm text-neutral-400 leading-relaxed mb-6">To prevent token overflow, CARGO uses intelligent summary tools to compress large histories into actionable digests within the drum package.</p>
                <div className="h-px w-12 bg-rose-500" />
              </div>
            </div>
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
                    <div className={`group relative w-full flex flex-col px-5 py-4 rounded-3xl transition-all text-left ${activeTopic === t.id ? 'bg-white shadow-xl shadow-neutral-200/50 scale-[1.02]' : 'hover:bg-neutral-100/80'}`}
                    onClick={() => setActiveTopic(t.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-xs tracking-wider transition-colors ${activeTopic === t.id ? 'text-neutral-900' : 'text-neutral-500'}`}>{t.title.toUpperCase()}</span>
                      </div>
                      {activeTopic === t.id && <ChevronRight size={14} className="text-blue-600" />}
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400">{t.subtitle}</span>
                  </div>
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
