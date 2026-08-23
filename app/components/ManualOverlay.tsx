import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Network, BookOpen } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';

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
];

const EXAMPLES = {
  linear: {
    title: 'Standard Pipeline',
    desc: 'A simple linear flow taking input, processing it through a model, and outputting the result.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 100, y: 200 }, data: { nodeType: 'input', label: 'Input Drum', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 400, y: 200 }, data: { nodeType: 'model', label: 'Data Extractor', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.7, systemPrompt: 'Extract key entities.' } },
      { id: 'n3', type: 'custom', position: { x: 700, y: 200 }, data: { nodeType: 'output', label: 'Output', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge' },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge' }
    ]
  },
  auditor: {
    title: 'Self-Correcting Loop',
    desc: 'An auditor evaluates the model output. If it fails, it routes back to the model for correction.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 200 }, data: { nodeType: 'input', label: 'Input', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 300, y: 200 }, data: { nodeType: 'model', label: 'Generator', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.7, systemPrompt: 'Generate code.' } },
      { id: 'n3', type: 'custom', position: { x: 600, y: 200 }, data: { nodeType: 'auditor', label: 'Security Auditor', status: 'READY', provider: 'groq', modelVariant: 'groq/compound-mini', temperature: 0, systemPrompt: 'Check for vulnerabilities.' } },
      { id: 'n4', type: 'custom', position: { x: 900, y: 200 }, data: { nodeType: 'output', label: 'Output', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge' },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge' },
      { id: 'e3', source: 'n3', target: 'n2', type: 'buttonEdge', animated: true, style: { stroke: '#ef4444' } },
      { id: 'e4', source: 'n3', target: 'n4', type: 'buttonEdge', style: { stroke: '#22c55e' } }
    ]
  },
  router: {
    title: 'Dynamic Routing',
    desc: 'The router evaluates the payload and routes it down a specific path based on deterministic logic.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 50, y: 200 }, data: { nodeType: 'input', label: 'Input', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 300, y: 200 }, data: { nodeType: 'router', label: 'Intent Router', status: 'READY' } },
      { id: 'n3', type: 'custom', position: { x: 600, y: 100 }, data: { nodeType: 'model', label: 'Technical Path', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.7, systemPrompt: 'Technical response.' } },
      { id: 'n4', type: 'custom', position: { x: 600, y: 300 }, data: { nodeType: 'model', label: 'Creative Path', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.7, systemPrompt: 'Creative response.' } },
      { id: 'n5', type: 'custom', position: { x: 900, y: 200 }, data: { nodeType: 'output', label: 'Output', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge' },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge' },
      { id: 'e3', source: 'n2', target: 'n4', type: 'buttonEdge' },
      { id: 'e4', source: 'n3', target: 'n5', type: 'buttonEdge' },
      { id: 'e5', source: 'n4', target: 'n5', type: 'buttonEdge' }
    ]
  },
  hitl: {
    title: 'Human-In-The-Loop',
    desc: 'The flow halts at the Wait node. The user must manually approve the payload via the Inspector before execution continues.',
    nodes: [
      { id: 'n1', type: 'custom', position: { x: 100, y: 200 }, data: { nodeType: 'input', label: 'Input', status: 'READY' } },
      { id: 'n2', type: 'custom', position: { x: 350, y: 200 }, data: { nodeType: 'model', label: 'Drafting Model', status: 'READY', provider: 'groq', modelVariant: 'groq/compound', temperature: 0.7, systemPrompt: 'Draft an email.' } },
      { id: 'n3', type: 'custom', position: { x: 600, y: 200 }, data: { nodeType: 'wait', label: 'Review Gate', status: 'READY' } },
      { id: 'n4', type: 'custom', position: { x: 850, y: 200 }, data: { nodeType: 'output', label: 'Output', status: 'READY' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge' },
      { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge' },
      { id: 'e3', source: 'n3', target: 'n4', type: 'buttonEdge' }
    ]
  }
};

export function ManualOverlay({ isOpen, onClose, onLoadExample }: ManualOverlayProps) {
  const [activeTopic, setActiveTopic] = useState('basics');

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTopic) {
      case 'basics':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-neutral-900 mb-4">Core Principles of CARGO</h1>
              <p className="text-neutral-600 leading-relaxed">
                CARGO is a deterministic pipeline simulation engine. It allows you to model complex agentic workflows using directed acyclic graphs (DAGs), ensuring strict adherence to global constraints (the &quot;Reefer&quot;quot;Reefer&quot;Reefer&quot;quot;quot;Reefer&quot;Reefer&quot;quot;Reefer&quot;Reefer&quot;quot;quot; ground truth).
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                 <h3 className="font-bold text-blue-900 mb-2 uppercase text-[10px] tracking-widest">Model Nodes</h3>
                 <p className="text-xs text-blue-800/80">The primary reasoning engine. Each model operates in isolation, restricted by its specific system prompt and the global Reefer boundaries.</p>
               </div>
               <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                 <h3 className="font-bold text-orange-900 mb-2 uppercase text-[10px] tracking-widest">Auditor Nodes</h3>
                 <p className="text-xs text-orange-800/80">Deterministic logic gates that evaluate the incoming payload. They do not generate content, they only return PASS or FLAG with a specific reasoning.</p>
               </div>
               <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                 <h3 className="font-bold text-purple-900 mb-2 uppercase text-[10px] tracking-widest">Router Nodes</h3>
                 <p className="text-xs text-purple-800/80">Evaluates the payload and dynamically picks the most logical output edge, terminating the unused branches for that simulation run.</p>
               </div>
               <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                 <h3 className="font-bold text-amber-900 mb-2 uppercase text-[10px] tracking-widest">Wait Nodes (HITL)</h3>
                 <p className="text-xs text-amber-800/80">Halts the execution pipeline. The user must manually inspect the drum payload and hit &quot;Approve&quot;quot;Approve&quot;Approve&quot;quot;quot;Approve&quot;Approve&quot;quot;Approve&quot;Approve&quot;quot;quot; for the execution to resume.</p>
               </div>
            </div>
            
            <div className="p-5 bg-neutral-900 text-white rounded-xl shadow-lg mt-8">
              <h3 className="font-black tracking-widest text-[11px] mb-2 text-neutral-400">THE DRUM PAYLOAD</h3>
              <p className="text-sm leading-relaxed text-neutral-300">
                Data travels through the wires encapsulated in a &quot;Drum&quot;quot;Drum&quot;Drum&quot;quot;quot;Drum&quot;Drum&quot;quot;Drum&quot;Drum&quot;quot;quot;. A Drum holds the compressed payload history. 
                As the Drum hits a node, the node unwraps it, processes the context, and packages its result into a new Drum to pass forward.
              </p>
            </div>
          </div>
        );
      
      case 'linear':
      case 'auditor':
      case 'router':
      case 'hitl': {
        const ex = EXAMPLES[activeTopic];
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-neutral-900 mb-2">{ex.title}</h1>
              <p className="text-neutral-600 leading-relaxed max-w-2xl">{ex.desc}</p>
            </div>
            
            <div className="flex-1 bg-neutral-100 rounded-2xl border border-neutral-200 relative overflow-hidden flex items-center justify-center min-h-[300px]">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              
              <div className="relative z-10 w-full h-full p-8 flex items-center justify-center overflow-x-auto overflow-y-hidden">
                <div className="flex gap-16 relative" style={{ minWidth: 'max-content' }}>
                  {ex.nodes.map((node, i) => (
                    <div key={node.id} className="relative flex flex-col items-center">
                      <div className={`
                        px-4 py-3 rounded-lg shadow-sm border font-bold text-sm z-20 bg-white
                        ${node.data.nodeType === 'input' ? 'border-blue-300 text-blue-900' : ''}
                        ${node.data.nodeType === 'model' ? 'border-neutral-300 text-neutral-900' : ''}
                        ${node.data.nodeType === 'auditor' ? 'border-orange-300 text-orange-900' : ''}
                        ${node.data.nodeType === 'wait' ? 'border-amber-300 text-amber-900' : ''}
                        ${node.data.nodeType === 'router' ? 'border-purple-300 text-purple-900' : ''}
                        ${node.data.nodeType === 'output' ? 'bg-neutral-900 border-neutral-900 text-white' : ''}
                      `}>
                        <div className="text-[9px] uppercase tracking-widest opacity-50 mb-1">{node.data.nodeType}</div>
                        {node.data.label}
                      </div>
                      
                      {/* Visual Wires (Simplified representation) */}
                      {i < ex.nodes.length - 1 && (
                        <div className="absolute top-1/2 left-full w-16 h-0.5 bg-neutral-300 -translate-y-1/2 z-10">
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neutral-400" />
                        </div>
                      )}
                      
                      {/* Backwards arrow for auditor (very simplified) */}
                      {activeTopic === 'auditor' && node.data.nodeType === 'auditor' && (
                        <svg className="absolute -left-16 top-full w-24 h-12 z-0 overflow-visible" style={{ marginTop: '-10px' }}>
                          <path d="M 0 0 C 0 30, -80 30, -80 0" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
                          <polygon points="-80,0 -75,5 -85,5" fill="#ef4444" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
               <button 
                 onClick={() => {
                   onLoadExample(ex.nodes, ex.edges);
                   onClose();
                 }}
                 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-black tracking-widest uppercase text-xs shadow-md transition-all hover:scale-105 active:scale-95"
               >
                 <Play size={14} />
                 Load Setup to Canvas
               </button>
            </div>
          </div>
        );
      }
    }
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
          className="w-full max-w-6xl h-full max-h-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
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
            <div className="w-64 border-r border-neutral-100 bg-neutral-50/30 p-4 flex flex-col gap-2">
              <h3 className="text-[10px] font-black text-neutral-400 tracking-widest uppercase mb-2 px-3">Topics</h3>
              {TOPICS.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTopic(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all text-left ${activeTopic === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}`}
                >
                  <span>{t.icon}</span>
                  {t.title}
                </button>
              ))}
            </div>
            
            <div className="flex-1 p-10 overflow-y-auto bg-white">
              {renderContent()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
