'use client';

import { useState, useCallback, useEffect } from 'react';
import { Node, Edge, Connection, addEdge, useNodesState, useEdgesState } from '@xyflow/react';
import { AgentCanvas } from './AgentCanvas';
import { PROVIDERS, DrumStatus, DrumPayload, ReeferSchema, ReeferGrade, Session } from '../types/pipeline';
import { Database, X, Plus, History, Trash2, Layers, Info, Terminal as TerminalIcon, Layout } from 'lucide-react';
import Markdown from 'react-markdown';

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'chat'>('blueprint');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const inspectedNode = nodes.find(n => n.id === selectedNodeId);
  const inspectedEdge = edges.find(e => e.id === selectedEdgeId);
  const [logs, setLogs] = useState<string[]>([]);
  const [reefer, setReefer] = useState<ReeferSchema | null>(null);
  const [drumSnapshots, setDrumSnapshots] = useState<Record<string, DrumPayload>>({});
  const [apiResults, setApiResults] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isReeferPanelOpen, setIsReeferPanelOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const createNewSession = () => {
    const newSession: Session = {
      id: Math.random().toString(36).substring(7),
      title: 'Empty Thread',
      reefer: null,
      logs: [],
      nodes: [],
      edges: [],
      drumSnapshots: {},
      chatInput: '',
      timestamp: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    
    // Sync local states
    setNodes([]);
    setEdges([]);
    setLogs([]);
    setReefer(null);
    setDrumSnapshots({});
    setChatInput('');
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Save current session before switching
    if (currentSessionId) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? {
        ...s,
        reefer,
        logs,
        nodes,
        edges,
        drumSnapshots,
        chatInput,
      } : s));
    }

    setCurrentSessionId(sessionId);
    setNodes(session.nodes);
    setEdges(session.edges);
    setLogs(session.logs);
    setReefer(session.reefer);
    setDrumSnapshots(session.drumSnapshots);
    setChatInput(session.chatInput);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setLogs(['[SYSTEM] Select or create a session.']);
    }
  };


  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, type: 'buttonEdge', animated: true, style: { stroke: '#d4d4d8', strokeWidth: 1.5 } } as any, eds)),
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  const updateEdgeData = (id: string, newData: any) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
           const isSignal = newData.isSignal;
           return { 
             ...edge, 
             data: { ...edge.data, ...newData },
             animated: true,
             style: isSignal ? { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' } : { stroke: '#d4d4d8', strokeWidth: 1.5 }
           };
        }
        return edge;
      })
    );
  };

  const callGroqApi = async (prompt: string, model: string, systemPrompt: string, reeferContext?: ReeferSchema) => {
    try {
      const markdownNote = "\n\nNOTE: The chat terminal supports MARKDOWN. Use it for code, bolding, and structure.";
      const fullSystemPrompt = reeferContext 
        ? `${systemPrompt}${markdownNote}\n\nSTRICT PROJECT REEFER (${reeferContext.grade} GRADE):\n${JSON.stringify(reeferContext, null, 2)}\n\nIMPORTANT: Adhere strictly to these boundaries. Do not include excluded features.`
        : `${systemPrompt}${markdownNote}`;

      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, systemPrompt: fullSystemPrompt }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.text;
    } catch (err: any) {
      addLog(`[ERROR] Groq API: ${err.message}`);
      return `Error: ${err.message}`;
    }
  };

  const callGeminiApi = async (prompt: string, model: string, systemPrompt: string, reeferContext?: ReeferSchema) => {
    try {
      const markdownNote = "\n\nNOTE: The chat terminal supports MARKDOWN. Use it for code, bolding, and structure.";
      const fullSystemPrompt = reeferContext 
        ? `${systemPrompt}${markdownNote}\n\nSTRICT PROJECT REEFER (${reeferContext.grade} GRADE):\n${JSON.stringify(reeferContext, null, 2)}\n\nIMPORTANT: Adhere strictly to these boundaries. Do not include excluded features.`
        : `${systemPrompt}${markdownNote}`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, systemPrompt: fullSystemPrompt }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.text;
    } catch (err: any) {
      addLog(`[ERROR] Gemini API: ${err.message}`);
      return `Error: ${err.message}`;
    }
  };

  const runTriage = async (input: string): Promise<ReeferGrade> => {
    const triagePrompt = `Categorize the following user input into exactly one of these grades:
    - CASUAL: General greetings, casual chat, jokes, simple questions.
    - STANDARD: Specific coding tasks, standard business logic, common scripts.
    - PRODUCTION: Complex infrastructure, high-security systems, fintech, large-scale architecture.

    Input: "${input}"
    
    Output ONLY the grade name (CASUAL, STANDARD, or PRODUCTION).`;

    const result = await callGeminiApi(triagePrompt, 'gemini-1.5-flash', "You are a triage system.");
    const cleaned = result.trim().toUpperCase();
    if (cleaned.includes('PRODUCTION')) return 'PRODUCTION';
    if (cleaned.includes('STANDARD')) return 'STANDARD';
    return 'CASUAL';
  };

  const runSimulation = async () => {
    if (isRunning) return;
    
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      createNewSession();
      return;
    }

    setIsRunning(true);
    setIsTerminalOpen(true);
    setDrumSnapshots({});
    setApiResults({});
    setLogs(['[SYSTEM] Initializing State Machine Flow...']);

    addLog(`[TRIAGE] Analyzing intent...`);
    const grade = await runTriage(chatInput || 'Default Idea');
    addLog(`[TRIAGE] Session Grade: ${grade}`);

    let currentReefer = reefer;

    if (!currentReefer || currentReefer.grade !== grade) {
      if (grade === 'CASUAL') {
        currentReefer = {
          grade: 'CASUAL',
          projectName: 'Casual Chat',
          globalBoundaries: { technicalStack: [], excludedFeatures: [] },
          systemHierarchy: { architectureLayers: { 'chat': 'Low-token casual flow' } },
          validationRules: { passConditions: ['None'], failConditions: [] }
        };
        setReefer(currentReefer);
        addLog(`[REEFER] Casual session (Optimized for finance).`);
      } else {
        addLog(`[REEFER] Generating ${grade} Ground Truth Tree...`);
        const reeferGenNode = nodes.find(n => n.id === 'model_1') || nodes.find(n => n.data.nodeType === 'model');
        if (reeferGenNode) {
          const reeferPrompt = `Generate a ${grade} Grade Project Reefer for: "${chatInput}". 
          Output ONLY a JSON object with this schema:
          {
            "grade": "${grade}",
            "projectName": string,
            "globalBoundaries": { "technicalStack": string[], "excludedFeatures": string[] },
            "systemHierarchy": { "architectureLayers": Record<string, string> },
            "validationRules": { "passConditions": string[], "failConditions": string[] }
          }`;
          
          const result = await callGroqApi(reeferPrompt, 'meta/llama-3.3-70b', "You are a senior systems architect.");
          try {
            const parsed = JSON.parse(result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1));
            parsed.grade = grade;
            currentReefer = parsed;
            setReefer(parsed);
            setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: parsed.projectName } : s));
            addLog(`[REEFER] ${grade} Ground Truth established: ${parsed.projectName}`);
          } catch (e) {
            addLog(`[ERROR] Failed to parse Reefer JSON.`);
          }
        }
      }
    }

    const executedNodes = new Set<string>();

    const captureSnapshot = (edgeId: string, payload: DrumPayload) => {
      setDrumSnapshots(prev => ({ ...prev, [edgeId]: payload }));
    };

    const executeNode = async (nodeId: string, inputDrum: DrumPayload): Promise<void> => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node || executedNodes.has(nodeId)) return;

      const nodeData = node.data as Record<string, any>;
      const label = nodeData.label || nodeData.nodeType;

      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'PROCESSING' } } : n));
      addLog(`[DRUM] Unpacking at ${label.toUpperCase()} (Step ${inputDrum.sequenceStep})...`);

      let outputPayload = inputDrum.compressedPayload;

      if (nodeData.nodeType === 'input') {
        outputPayload = chatInput || 'Default Idea';
        await new Promise(r => setTimeout(r, 800));
      } 
      else if (nodeData.nodeType === 'model') {
        const isCasual = currentReefer?.grade === 'CASUAL';
        const prompt = isCasual 
          ? inputDrum.compressedPayload 
          : `Current Payload: ${inputDrum.compressedPayload}\nNext Instruction: ${inputDrum.nextInstruction}`;
        
        const systemPrompt = isCasual
          ? `${nodeData.systemPrompt}\n\nMODE: CASUAL. Be warm and friendly in output. Use Markdown. Stay brief and direct internally to save tokens.`
          : `${nodeData.systemPrompt}\n\nMODE: PRODUCTION. Output ONLY raw actionable data. Strip all chatter. Strict adherence to Reefer constraints.`;

        if (nodeData.provider === 'groq') {
          outputPayload = await callGroqApi(prompt, nodeData.modelVariant as string, systemPrompt, currentReefer || undefined);
        } else if (nodeData.provider === 'gemini') {
          outputPayload = await callGeminiApi(prompt, nodeData.modelVariant as string, systemPrompt, currentReefer || undefined);
        } else {
          await new Promise(r => setTimeout(r, 1200));
        }
        setApiResults(prev => ({ ...prev, [nodeId]: outputPayload }));
      }
      else if (nodeData.nodeType === 'signal') {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'PENDING' } } : n));
        await new Promise(r => setTimeout(r, 1000));
      }

      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'PASS' } } : n));
      addLog(`[PASS] ${label} finished.`);
      executedNodes.add(nodeId);

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      const successorPromises = outgoingEdges.map(async (edge) => {
        const nextDrum: DrumPayload = {
          drumId: `drum_${Math.random().toString(36).substr(2, 5)}`,
          sequenceStep: inputDrum.sequenceStep + 1,
          compressedPayload: outputPayload,
          nextInstruction: "Analyze input payload and apply constraints.",
          status: 'PASS'
        };
        captureSnapshot(edge.id, nextDrum);
        return executeNode(edge.target, nextDrum);
      });

      await Promise.all(successorPromises);
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'READY' } } : n));
    };

    const startNodes = nodes.filter(n => n.data.nodeType === 'input');
    if (startNodes.length === 0) {
      addLog('[ERROR] No Input node found on the canvas.');
    } else {
      const initialDrum: DrumPayload = {
        drumId: 'initial_drum',
        sequenceStep: 1,
        compressedPayload: chatInput,
        nextInstruction: 'Initialize project session.',
        status: 'PROCESSING'
      };
      await Promise.all(startNodes.map(n => executeNode(n.id, initialDrum)));
      addLog('[SYSTEM] Session Cycle Complete.');
    }

    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white text-neutral-900 overflow-hidden font-sans">
      <div className="h-14 border-b border-neutral-200 bg-white flex items-center justify-between px-6 shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center gap-8">
          <div className="font-black tracking-tighter text-[16px] text-blue-600">CARGO</div>
          <nav className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md">
            <button 
              onClick={() => setActiveTab('blueprint')}
              className={`px-4 py-1.5 rounded text-[11px] font-bold tracking-wide transition-all ${activeTab === 'blueprint' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              BLUEPRINT CANVAS
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded text-[11px] font-bold tracking-wide transition-all ${activeTab === 'chat' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              CHAT INTERFACE
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsReeferPanelOpen(!isReeferPanelOpen)} 
            className="text-[11px] font-bold tracking-wide text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            {isReeferPanelOpen ? 'HIDE REEFER' : 'SHOW REEFER'}
          </button>
          <button 
            onClick={runSimulation} 
            disabled={isRunning} 
            className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-md text-[11px] font-black transition-all shadow-sm tracking-widest uppercase"
          >
            {isRunning ? 'EXECUTING...' : 'RUN BLUEPRINT'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-md border border-neutral-200 rounded-full shadow-2xl scale-110">
        <button 
          onClick={() => setIsReeferPanelOpen(!isReeferPanelOpen)}
          title="Toggle Project Reefer (Tree)"
          className={`p-2 rounded-full transition-all ${isReeferPanelOpen ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-neutral-100 text-neutral-500'}`}
        >
          <Layers size={18} />
        </button>
        <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
        <button 
          onClick={() => setIsInspectorOpen(!isInspectorOpen)}
          title="Toggle Node Inspector"
          className={`p-2 rounded-full transition-all ${isInspectorOpen ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-neutral-100 text-neutral-500'}`}
        >
          <Info size={18} />
        </button>
        <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
        <button 
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          title="Toggle System Terminal"
          className={`p-2 rounded-full transition-all ${isTerminalOpen ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-neutral-100 text-neutral-500'}`}
        >
          <TerminalIcon size={18} />
        </button>
        <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
        <button 
          onClick={() => setActiveTab(activeTab === 'blueprint' ? 'chat' : 'blueprint')}
          title="Switch View Mode"
          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 transition-all"
        >
          <Layout size={18} />
        </button>
      </div>

      {activeTab === 'blueprint' ? (
          <>
            {isReeferPanelOpen && (
              <div className="w-80 border-r border-neutral-200 flex flex-col bg-neutral-50/50 overflow-y-auto shrink-0 transition-all duration-300">
                <div className="p-5 border-b border-neutral-200 bg-white sticky top-0 z-10 flex justify-between items-center">
                  <h2 className="text-[11px] font-black tracking-widest text-neutral-900 uppercase">REEFER TREE</h2>
                  {reefer && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black tracking-tighter">ACTIVE SESSION</span>}
                </div>
                <div className="p-5 overflow-y-auto">
                  {reefer ? (
                    <div className="flex flex-col gap-6">
                      <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-3 border-b border-neutral-100 pb-2">
                           <span className="text-neutral-900 font-bold uppercase text-[10px] tracking-widest">Project: {reefer.projectName}</span>
                           <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border ${
                             reefer.grade === 'PRODUCTION' ? 'bg-red-50 text-red-700 border-red-100' : 
                             reefer.grade === 'STANDARD' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                             'bg-neutral-100 text-neutral-700 border-neutral-200'
                           }`}>
                             {reefer.grade}
                           </span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[9px] font-black text-neutral-400 uppercase block mb-1">Stack</label>
                            <div className="flex flex-wrap gap-1">
                              {reefer.globalBoundaries.technicalStack.map(s => <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] rounded font-bold uppercase border border-blue-100">{s}</span>)}
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-neutral-400 uppercase block mb-1">Exclusions</label>
                            <div className="flex flex-wrap gap-1">
                              {reefer.globalBoundaries.excludedFeatures.map(s => <span key={s} className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[9px] rounded font-bold uppercase border border-red-100">{s}</span>)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-900 uppercase tracking-widest px-1">Layers</label>
                        {Object.entries(reefer.systemHierarchy.architectureLayers).map(([layer, desc]) => (
                          <div key={layer} className="p-3 bg-white border border-neutral-200 rounded-lg shadow-sm">
                            <div className="text-[10px] font-black text-neutral-800 uppercase mb-1">{layer.replace(/_/g, ' ')}</div>
                            <div className="text-[11px] text-neutral-500 leading-relaxed italic">&quot;{desc}&quot;</div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-900 uppercase tracking-widest px-1">Rules</label>
                        <div className="p-3 bg-white border border-neutral-200 rounded-lg shadow-sm space-y-2">
                          {reefer.validationRules.passConditions.map((rule, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                              <span className="text-[11px] text-neutral-600">{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-10 text-center space-y-4">
                      <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                        <Database size={20} />
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Run a simulation to generate the <strong>Ground Truth</strong> for this project.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="w-64 border-r border-neutral-200 bg-neutral-900 flex flex-col shrink-0 overflow-y-auto">
              <div className="p-5 border-b border-neutral-800 bg-neutral-950 sticky top-0 z-10">
                <h2 className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">NODE PALETTE</h2>
              </div>
              <div className="p-4 flex flex-col gap-6">
                {[
                  { category: 'INPUT/OUTPUT', nodes: ['Input', 'Output'] },
                  { category: 'PROCESSING', nodes: ['Model', 'Signal', 'Interrupt'] }
                ].map((group) => (
                  <div key={group.category} className="flex flex-col gap-2">
                    <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1">{group.category}</div>
                    <div className="flex flex-col gap-1.5">
                      {group.nodes.map((n) => (
                         <div 
                           key={n} 
                           draggable 
                           onDragStart={(e) => onDragStart(e, n)} 
                           className="group p-2.5 bg-neutral-800 border border-neutral-700/50 text-[11px] font-bold text-neutral-300 cursor-grab hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all rounded shadow-sm active:cursor-grabbing flex items-center gap-3"
                         >
                           <div className={`w-1.5 h-1.5 rounded-full ${
                             n === 'Input' ? 'bg-blue-400' : 
                             n === 'Output' ? 'bg-neutral-400' : 
                             n === 'Signal' ? 'bg-amber-400' : 
                             n === 'Interrupt' ? 'bg-red-400' : 'bg-green-400'
                           }`} />
                           {n.toUpperCase()} NODE
                         </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-neutral-50/50 relative">
              <div className="flex-1 relative">
                 <AgentCanvas 
                   nodes={nodes} 
                   edges={edges} 
                   onNodesChange={onNodesChange} 
                   onEdgesChange={onEdgesChange} 
                   onConnect={onConnect} 
                   setNodes={setNodes} 
                   onNodeSelect={(node) => setSelectedNodeId(node?.id || null)} 
                   onEdgeSelect={(edge) => setSelectedEdgeId(edge?.id || null)}
                 />
              </div>
              
              {isTerminalOpen && (
                <div className="h-64 border-t border-neutral-200 bg-neutral-950 flex flex-col shrink-0 z-20">
                  <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-900 text-neutral-400 font-black text-[10px] tracking-[0.2em] uppercase flex justify-between items-center">
                     <span>SYSTEM TERMINAL</span>
                     <button onClick={() => setIsTerminalOpen(false)} className="hover:text-white">CLOSE</button>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto space-y-1.5 font-mono text-[12px] leading-relaxed text-neutral-400">
                    {logs.map((log, index) => {
                      const finalContent = log.replace(/^\[.*?\]\s*\[.*?\]\s*/, '') || log;
                      return (
                        <div key={index} className="flex gap-2">
                          <span className="opacity-40 shrink-0 select-none w-32">{log.substring(0, log.indexOf(']') + 1)}</span>
                          <div className="markdown-logs flex-1">
                            <Markdown>{finalContent}</Markdown>
                          </div>
                        </div>
                      );
                    })}
                    {isRunning && <div className="animate-pulse text-neutral-500">_</div>}
                  </div>
                </div>
              )}
            </div>

            {isInspectorOpen && (
              <div className="w-80 border-l border-neutral-200 bg-white flex flex-col shrink-0 overflow-y-auto">
                <div className="p-5 border-b border-neutral-200 bg-white sticky top-0 z-10 flex justify-between items-center">
                  <h2 className="text-[11px] font-black tracking-widest text-neutral-900 uppercase">INSPECTOR</h2>
                  <button onClick={() => setIsInspectorOpen(false)} className="text-neutral-400 hover:text-neutral-900"><X size={16} /></button>
                </div>
                
                {inspectedNode ? (
                  <div className="p-5 flex flex-col gap-6">
                     <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Display Name</label>
                       <input 
                         value={inspectedNode.data.label as string} 
                         placeholder={(inspectedNode.data.modelVariant as string) || 'Unnamed'}
                         onChange={(e) => updateNodeData(inspectedNode.id, { label: e.target.value })}
                         className="border border-neutral-200 p-3 text-[13px] font-bold focus:outline-none focus:border-blue-500 rounded-md bg-neutral-50" 
                       />
                     </div>

                     {inspectedNode.data.nodeType === 'model' && (
                       <>
                         <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">AI Provider</label>
                           <div className="grid grid-cols-1 gap-2">
                              {PROVIDERS.map(p => {
                                const isActive = p.id === 'groq';
                                return (
                                  <button 
                                    key={p.id}
                                    onClick={() => updateNodeData(inspectedNode.id, { provider: p.id, modelVariant: p.variants[0] })}
                                    className={`p-3 text-[12px] font-bold text-left border rounded-md transition-all flex justify-between items-center ${
                                      inspectedNode.data.provider === p.id 
                                        ? (isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-red-500 bg-red-50 text-red-700') 
                                        : (isActive ? 'border-neutral-200 hover:border-neutral-400' : 'border-red-100 bg-red-50/20 text-red-400/60 transition-opacity')
                                    }`}
                                  >
                                    <span>{p.name}</span>
                                    {!isActive && <span className="text-[7px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded tracking-tighter uppercase">Inactive</span>}
                                    {isActive && <span className="text-[7px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded tracking-tighter uppercase">Active</span>}
                                  </button>
                                );
                              })}
                           </div>
                         </div>

                         <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Model Variant</label>
                           <select 
                             value={inspectedNode.data.modelVariant as string}
                             onChange={(e) => updateNodeData(inspectedNode.id, { modelVariant: e.target.value })}
                             className="border border-neutral-200 p-3 text-[12px] font-bold focus:outline-none focus:border-blue-500 rounded-md bg-neutral-50"
                           >
                             {PROVIDERS.find(p => p.id === inspectedNode.data.provider)?.variants.map(v => (
                               <option key={v} value={v}>{v}</option>
                             ))}
                           </select>
                         </div>

                         <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] flex justify-between">
                             <span>Temperature</span>
                             <span className="text-neutral-900">{inspectedNode.data.temperature as number}</span>
                           </label>
                           <input 
                             type="range" min="0" max="1" step="0.1" 
                             value={inspectedNode.data.temperature as number}
                             onChange={(e) => updateNodeData(inspectedNode.id, { temperature: parseFloat(e.target.value) })}
                             className="w-full accent-blue-600 h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
                           />
                         </div>

                         <div className="flex flex-col gap-2 mt-2">
                           <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">System Instructions</label>
                           <textarea 
                             value={inspectedNode.data.systemPrompt as string}
                             onChange={(e) => updateNodeData(inspectedNode.id, { systemPrompt: e.target.value })}
                             placeholder="Enter strict instructions for this model..."
                             className="border border-neutral-200 p-3 text-[12px] font-medium focus:outline-none focus:border-blue-500 rounded-md bg-neutral-50 h-24 resize-none"
                           />
                         </div>

                         <div className="pt-4 border-t border-neutral-100">
                           <button 
                             onClick={() => {
                               setNodes(nds => nds.filter(n => n.id !== inspectedNode.id));
                               setSelectedNodeId(null);
                             }}
                             className="w-full p-3 border border-red-200 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-md hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                           >
                             <Trash2 size={14} />
                             Purge Node
                           </button>
                         </div>
                       </>
                     )}
                  </div>
                ) : inspectedEdge ? (
                  <div className="p-5 flex flex-col gap-6">
                     <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Drum JSON (Compressed Payload)</label>
                       <div className="p-3 bg-neutral-950 text-blue-400 font-mono text-[10px] rounded border border-neutral-800 h-64 overflow-y-auto whitespace-pre">
                          {drumSnapshots[inspectedEdge.id] ? JSON.stringify(drumSnapshots[inspectedEdge.id], null, 2) : 'No data passed through this wire yet.'}
                       </div>
                     </div>
                     <div className="mt-4">
                       <button 
                         onClick={() => {
                           setEdges(eds => eds.filter(e => e.id !== inspectedEdge.id));
                           setSelectedEdgeId(null);
                         }}
                         className="w-full p-3 border border-red-200 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-md hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                       >
                         <Trash2 size={14} />
                         Sever Connection
                       </button>
                     </div>
                  </div>
                ) : (
                  <div className="p-10 text-[10px] font-black text-neutral-300 uppercase tracking-[0.3em] text-center mt-10">Select Node or Wire to Inspect</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col bg-neutral-50/50">
            <div className="flex-1 p-10 overflow-y-auto">
               <div className="max-w-3xl mx-auto space-y-8">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pt-20">
                      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 animate-pulse">
                        <TerminalIcon size={40} />
                      </div>
                      <div className="space-y-2">
                        <h1 className="text-2xl font-black tracking-tighter text-neutral-900">SYSTEM READY</h1>
                        <p className="text-neutral-500 max-w-sm mx-auto text-sm leading-relaxed">
                          Your architectural pipeline is prepared. Describe your objective and run the blueprint.
                        </p>
                      </div>
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center text-neutral-400 shrink-0 font-black text-[10px]">AI</div>
                        <div className="flex-1 space-y-2">
                          <div className="text-[14px] leading-relaxed text-neutral-800">
                             <Markdown>{log.replace(/^\[.*?\]\s*\[.*?\]\s*/, '')}</Markdown>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
            <div className="p-8 border-t border-neutral-200 bg-white">
              <div className="max-w-3xl mx-auto relative">
                <textarea 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe your architectural objective..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-4 pr-32 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[60px] max-h-32 resize-none font-medium"
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button 
                    onClick={runSimulation}
                    disabled={isRunning || !chatInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all shadow-sm"
                  >
                    {isRunning ? 'EXEC' : 'START'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
