'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge, Connection, addEdge, useNodesState, useEdgesState } from '@xyflow/react';
import { AgentCanvas } from './AgentCanvas';
import { PROVIDERS, DrumStatus, DrumPayload, ReeferSchema, ReeferGrade, Session } from '../types/pipeline';
import { motion } from 'framer-motion';
import { ManualOverlay } from './ManualOverlay';
import { Database, X, Plus, History, Trash2, Layers, Info, Terminal as TerminalIcon, Layout, Settings, BookOpen } from 'lucide-react';
import Markdown from 'react-markdown';

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export function DashboardLayout() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'chat'>('blueprint');
  
  const [sessions, setSessions] = useState<Session[]>([{
    id: 'initial_thread',
    title: 'Default Thread',
    reefer: null,
    logs: ['[SYSTEM] Session initialized.'],
    nodes: [],
    edges: [],
    drumSnapshots: {},
    chatInput: '',
    chatHistory: [],
    timestamp: 0,
  }]);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>('initial_thread');

  const getInitialValue = <T,>(key: keyof Session, fallback: T): T => {
    return fallback;
  };

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const inspectedNode = nodes.find(n => n.id === selectedNodeId);
  const inspectedEdge = edges.find(e => e.id === selectedEdgeId);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Session initialized.']);
  const [reefer, setReefer] = useState<ReeferSchema | null>(null);
  const [drumSnapshots, setDrumSnapshots] = useState<Record<string, DrumPayload>>({});
  const [apiResults, setApiResults] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isPathVisible, setIsPathVisible] = useState(false);
  const visibleEdges = edges.map(e => ({ ...e, animated: isPathVisible || e.animated }));
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isReeferPanelOpen, setIsReeferPanelOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [systemModel, setSystemModel] = useState<{enabled: boolean, description: string, modelRules: string, auditorRules: string}>({ enabled: false, description: '', modelRules: '', auditorRules: '' });
  const [isSystemModelPanelOpen, setIsSystemModelPanelOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const pendingApprovalsRef = useRef<Record<string, { resolve: (payload: string) => void, currentPayload: string }>>({});
  const [waitingNodesTrigger, setWaitingNodesTrigger] = useState(0);

  // Hydration effect
  useEffect(() => {
    const savedSessions = localStorage.getItem('cargo_sessions');
    const savedActiveId = localStorage.getItem('cargo_active_session_id');
    
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const activeId = savedActiveId || parsed[0].id;
          const session = parsed.find((s: any) => s.id === activeId) || parsed[0];
          
          setTimeout(() => {
            setSessions(parsed);
            setCurrentSessionId(session.id);
            setNodes(session.nodes || []);
            setEdges(session.edges || []);
            setLogs(session.logs || []);
            setReefer(session.reefer || null);
            setDrumSnapshots(session.drumSnapshots || {});
            setChatInput(session.chatInput || '');
            setChatHistory(session.chatHistory || []);
            if (session.systemModel) setSystemModel(session.systemModel);
            setIsHydrated(true);
          }, 0);
          return;
        }
      } catch (e) {
        console.error("Hydration failed", e);
      }
    }
    setTimeout(() => setIsHydrated(true), 0);
  }, [setNodes, setEdges]);

  const switchSession = useCallback((sessionId: string, sessionsList?: Session[]) => {
    const list = sessionsList || sessions;
    const session = list.find(s => s.id === sessionId);
    if (!session) return;
    
    // Save current session before switching
    if (currentSessionId && !sessionsList) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? {
        ...s,
        reefer,
        logs,
        nodes,
        edges,
        drumSnapshots,
        chatInput,
        chatHistory,
        systemModel,
      } : s));
    }

    setCurrentSessionId(sessionId);
    setNodes(session.nodes || []);
    setEdges(session.edges || []);
    setLogs(session.logs || []);
    setReefer(session.reefer || null);
    setDrumSnapshots(session.drumSnapshots || {});
    setChatInput(session.chatInput || '');
    setChatHistory(session.chatHistory || []);
    setSystemModel(session.systemModel || { enabled: false, description: '', modelRules: '', auditorRules: '' });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [currentSessionId, reefer, setSessions, setLogs, setReefer, setDrumSnapshots, setChatInput, setChatHistory, setSystemModel, setSelectedNodeId, setSelectedEdgeId, logs, nodes, edges, drumSnapshots, chatInput, chatHistory, systemModel, sessions, setNodes, setEdges]);

  // Persistence: Save on change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('cargo_sessions', JSON.stringify(sessions));
    }
    if (currentSessionId) {
      localStorage.setItem('cargo_active_session_id', currentSessionId);
    }
  }, [sessions, currentSessionId]);

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
      chatHistory: [],
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
    setChatHistory([]);
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
    if (isRunning || !chatInput.trim()) return;
    
    const inputToProcess = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: inputToProcess }]);

    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      createNewSession();
      return;
    }
    
    let needsNaming = false;
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (activeSession && (activeSession.title === 'Default Thread' || activeSession.title === 'Empty Thread')) {
       needsNaming = true;
    }

    setIsRunning(true);
    setIsTerminalOpen(true);
    setDrumSnapshots({});
    setApiResults({});
    setLogs(['[SYSTEM] Initializing State Machine Flow...']);

    addLog(`[TRIAGE] Analyzing intent...`);
    const grade = await runTriage(inputToProcess);
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
        addLog(`[REEFER] Generating ${grade} Ground Truth Tree via System Architect...`);
        const reeferPrompt = `Generate a ${grade} Grade Project Reefer for: "${inputToProcess}". 
        Output ONLY a JSON object with this schema:
        {
          "grade": "${grade}",
          "projectName": string,
          "globalBoundaries": { "technicalStack": string[], "excludedFeatures": string[] },
          "systemHierarchy": { "architectureLayers": Record<string, string> },
          "validationRules": { "passConditions": string[], "failConditions": string[] }
        }`;
        
        const result = await callGroqApi(reeferPrompt, 'groq/compound', "You are a senior systems architect. Return ONLY raw JSON without markdown formatting.");
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
        outputPayload = inputToProcess;
        await new Promise(r => setTimeout(r, 800));
      } 
      else if (nodeData.nodeType === 'model') {
        const isCasual = currentReefer?.grade === 'CASUAL';
        const prompt = isCasual 
          ? inputDrum.compressedPayload 
          : `Current Payload: ${inputDrum.compressedPayload}\nNext Instruction: ${inputDrum.nextInstruction}`;
        
        let systemPrompt = isCasual
          ? `${nodeData.systemPrompt}\n\nMODE: CASUAL. Be warm and friendly in output. Use Markdown. Stay brief and direct internally to save tokens.`
          : `${nodeData.systemPrompt}\n\nMODE: PRODUCTION. Output ONLY raw actionable data. Strip all chatter. Strict adherence to Reefer constraints.`;

        if (systemModel.enabled) {
          systemPrompt += `\n\n[SYSTEM MODEL RULES]\nProject Description: ${systemModel.description}\nModel Rules: ${systemModel.modelRules}`;
        }

        if (needsNaming) {
          needsNaming = false; // Prevent parallel nodes from also doing this
          systemPrompt += `\n\n[CRITICAL INSTRUCTION] This is the start of a new chat. You MUST output your response as a raw JSON object exactly like this:\n{\n  "chatName": "2-3 Word Title Here",\n  "content": "Your actual full response here"\n}`;
        }

        const startTime = Date.now();
        if (nodeData.provider === 'groq') {
          outputPayload = await callGroqApi(prompt, nodeData.modelVariant as string, systemPrompt, currentReefer || undefined);
        } else if (nodeData.provider === 'gemini') {
          outputPayload = await callGeminiApi(prompt, nodeData.modelVariant as string, systemPrompt, currentReefer || undefined);
        } else {
          await new Promise(r => setTimeout(r, 1200));
        }
        const latency = Date.now() - startTime;
        addLog(`[TELEMETRY] Node ${label} completed in ${latency}ms`);

        if (outputPayload.trim().startsWith('{')) {
          try {
             let jsonStr = outputPayload;
             if (jsonStr.includes('```json')) {
               jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
             } else if (jsonStr.includes('```')) {
               jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
             }
             const parsed = JSON.parse(jsonStr);
             if (parsed.chatName && parsed.content) {
                const newTitle = parsed.chatName;
                outputPayload = parsed.content;
                setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: newTitle } : s));
             }
          } catch (e) {
             // Fallback to normal payload if parsing fails
          }
        }
        setApiResults(prev => ({ ...prev, [nodeId]: outputPayload }));
      }
      else if (nodeData.nodeType === 'auditor') {
        let auditPrompt = `
          PAYLOAD TO AUDIT:
          ${inputDrum.compressedPayload}
          
          REEFER VALIDATION RULES:
          ${JSON.stringify(currentReefer?.validationRules || {})}
          
          INSTRUCTIONS:
          Act as a deterministic parser. Do NOT use outside knowledge. 
          1. Check if the payload violates ANY Fail Conditions.
          2. Check if the payload meets the Pass Conditions.
          
          DEVELOPER INSTRUCTIONS:
          ${nodeData.systemPrompt}`;

        if (systemModel.enabled) {
          auditPrompt += `\n\n[SYSTEM MODEL RULES]\nProject Description: ${systemModel.description}\nAuditor Rules: ${systemModel.auditorRules}`;
        }
          
        auditPrompt += `\n\nRespond strictly in JSON format: {"status": "PASS" | "FLAG", "reason": "Specific rule matched"}`;
        
        const startTime = Date.now();
        const result = await callGroqApi(auditPrompt, nodeData.modelVariant || 'groq/compound-mini', "You are a JSON-only deterministic validation engine.");
        const latency = Date.now() - startTime;
        addLog(`[TELEMETRY] Auditor Node ${label} completed in ${latency}ms`);
        let auditJson = { status: 'PASS', reason: 'Audit successful.' };
        try {
          auditJson = JSON.parse(result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1));
        } catch (e) {
          console.error("Audit Parse Error:", e);
        }

        if(auditJson.status === 'FLAG') {
           setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'ICE_CORRECTION' } } : n));
           addLog(`[AUDIT FLAG] ${auditJson.reason}`);
           setChatHistory(prev => [...prev, { role: 'ai', content: `🚨 **AUDIT FLAG:** ${auditJson.reason}` }]);
           
           const feedbackEdges = edges.filter(e => e.source === nodeId && nodes.find(n => n.id === e.target)?.data.nodeType === 'model');
           if (feedbackEdges.length > 0) {
              const feedbackPayload = `PREVIOUS PAYLOAD:\n${inputDrum.compressedPayload}\n\nAUDIT FLAG REASON:\n${auditJson.reason}\n\nFIX INSTRUCTIONS:\nPlease revise the payload to address the audit flag.`;
              
              const successorPromises = feedbackEdges.map(async (edge) => {
                const nextDrum: DrumPayload = {
                  drumId: `drum_${Math.random().toString(36).substr(2, 5)}`,
                  sequenceStep: inputDrum.sequenceStep + 1,
                  compressedPayload: feedbackPayload,
                  nextInstruction: "Fix the payload based on auditor feedback.",
                  status: 'PASS'
                };
                captureSnapshot(edge.id, nextDrum);
                executedNodes.delete(edge.target);
                return executeNode(edge.target, nextDrum);
              });
              await Promise.all(successorPromises);
           }
           
           setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'READY' } } : n));
           return; 
        } else {
           outputPayload = inputDrum.compressedPayload; 
           addLog(`[AUDIT PASS] ${auditJson.reason}`);
           setChatHistory(prev => [...prev, { role: 'ai', content: `🛡️ **AUDIT PASS:** ${auditJson.reason}` }]);
        }
      }
      else if (nodeData.nodeType === 'output') {
        setChatHistory(prev => [...prev, { role: 'ai', content: inputDrum.compressedPayload }]);
        await new Promise(r => setTimeout(r, 800));
      }
      else if (nodeData.nodeType === 'signal') {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'PENDING' } } : n));
        await new Promise(r => setTimeout(r, 1000));
      }
      else if (nodeData.nodeType === 'tool') {
        addLog(`[TOOL] Executing mock external tool ${label}...`);
        await new Promise(r => setTimeout(r, 1000));
        outputPayload = inputDrum.compressedPayload + `\n\n[TOOL EXECUTED] Fetched mock external data for ${label}.`;
      }
      else if (nodeData.nodeType === 'router') {
        const outgoingEdgesForRouter = edges.filter(e => e.source === nodeId);
        if (outgoingEdgesForRouter.length > 0) {
           const routes = outgoingEdgesForRouter.map(e => `Edge ID: ${e.id}, Target Node: ${nodes.find(n=>n.id === e.target)?.data.label || e.target}`).join('\n');
           const routerPrompt = `PAYLOAD:\n${inputDrum.compressedPayload}\n\nAVAILABLE ROUTES:\n${routes}\n\nBased on the payload, which route is the most appropriate? Reply with strictly the Edge ID as a JSON: {"edgeId": "edge_id_here"}`;
           const startTime = Date.now();
           const result = await callGroqApi(routerPrompt, 'groq/compound-mini', "You are a deterministic routing logic gate. Return ONLY valid JSON.");
           const latency = Date.now() - startTime;
           addLog(`[TELEMETRY] Router Node ${label} completed in ${latency}ms`);
           try {
             const routerJson = JSON.parse(result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1));
             if (routerJson.edgeId && outgoingEdgesForRouter.find(e => e.id === routerJson.edgeId)) {
                (nodeData as any).selectedRoute = routerJson.edgeId;
                addLog(`[ROUTER] Routed payload via edge ${routerJson.edgeId}`);
             }
           } catch (e) {
             console.error("Router Parse Error:", e);
           }
        }
      }
      else if (nodeData.nodeType === 'wait') {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'PENDING_APPROVAL' } } : n));
        addLog(`[WAIT] Simulation halted at ${label}. Waiting for human-in-the-loop approval...`);
        
        outputPayload = await new Promise<string>((resolve) => {
          pendingApprovalsRef.current[nodeId] = { resolve, currentPayload: inputDrum.compressedPayload };
          setWaitingNodesTrigger(prev => prev + 1);
        });
        
        delete pendingApprovalsRef.current[nodeId];
        setWaitingNodesTrigger(prev => prev + 1);
        addLog(`[WAIT] Approved at ${label}. Resuming...`);
      }

      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'PASS' } } : n));
      addLog(`[PASS] ${label} finished.`);
      executedNodes.add(nodeId);

      let outgoingEdges = edges.filter(e => e.source === nodeId);
      if (nodeData.nodeType === 'auditor') {
        outgoingEdges = outgoingEdges.filter(e => nodes.find(n => n.id === e.target)?.data.nodeType !== 'model');
      } else if (nodeData.nodeType === 'router' && (nodeData as any).selectedRoute) {
        outgoingEdges = outgoingEdges.filter(e => e.id === (nodeData as any).selectedRoute);
      }

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
      setChatHistory(prev => [...prev, { role: 'ai', content: "Error: No Input node found on the blueprint canvas. Please add an Input node and connect it to a Model." }]);
    } else {
      const initialDrum: DrumPayload = {
        drumId: 'initial_drum',
        sequenceStep: 1,
        compressedPayload: inputToProcess,
        nextInstruction: 'Initialize project session.',
        status: 'PROCESSING'
      };
      await Promise.all(startNodes.map(n => executeNode(n.id, initialDrum)));
      addLog('[SYSTEM] Session Cycle Complete.');
      
      // Fallback: If no Output node exists, add the final result of the last model.
      const hasOutputNode = nodes.some(n => n.data.nodeType === 'output');
      if (!hasOutputNode && startNodes.length > 0) {
        // Just getting the last API result recorded.
        setChatHistory(prev => {
           // We just want to make sure the user sees some output if they forgot an output node.
           // However, if they have custom logic, it's safer to just tell them.
           return [...prev, { role: 'ai', content: "[No Output Node connected. Flow executed successfully in background. Add an Output Node to view final data.]" }];
        });
      }
    }

    setIsRunning(false);
  };

  if (!isHydrated) return null;

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
          <button onClick={() => setIsPathVisible(!isPathVisible)} className="border border-neutral-200 hover:bg-neutral-50 text-neutral-600 px-4 py-2 rounded-md text-[11px] font-black transition-all shadow-sm tracking-widest uppercase">
            {isPathVisible ? 'HIDE SET PATH' : 'SHOW SET PATH'}
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
      <motion.div drag dragMomentum={false} className="absolute bottom-8 left-1/2 z-[100] flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-md border border-neutral-200 rounded-full shadow-2xl scale-110" style={{ x: "-50%" }}>
        <button 
          onClick={() => setIsSystemModelPanelOpen(!isSystemModelPanelOpen)}
          title="Toggle System Model Rules"
          className={`p-2 rounded-full transition-all ${isSystemModelPanelOpen ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-neutral-100 text-neutral-500'}`}
        >
          <Settings size={18} />
        </button>
        <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
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
        <motion.button 
          onClick={() => setIsDocsOpen(!isDocsOpen)}
          title="Operations Manual & Blueprints"
          animate={!isDocsOpen ? {
            boxShadow: [
              "0 0 0 0px rgba(245, 158, 11, 0)",
              "0 0 0 8px rgba(245, 158, 11, 0.2)",
              "0 0 0 0px rgba(245, 158, 11, 0)"
            ],
            scale: [1, 1.05, 1]
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`relative p-2 rounded-full transition-all ${isDocsOpen ? 'bg-amber-600 text-white shadow-md' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
        >
          <BookOpen size={18} />
          {!isDocsOpen && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-white animate-ping" />
          )}
        </motion.button>
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
        <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
        <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} title="Toggle Chat History" className={`p-2 rounded-full transition-all ${isHistoryOpen ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-neutral-100 text-neutral-500'}`}>
          <History size={18} />
        </button>
      </motion.div>

      
      {isHistoryOpen && (
        <div className="w-64 border-r border-neutral-200 bg-white flex flex-col shrink-0 z-20">
          <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
            <h2 className="text-[11px] font-black tracking-widest text-neutral-900 uppercase">Sessions</h2>
            <button onClick={() => switchSession(`session_${Date.now()}`, [...sessions, { id: `session_${Date.now()}`, title: 'New Thread', reefer: null, logs: ['[SYSTEM] Session initialized.'], nodes: [], edges: [], drumSnapshots: {}, chatInput: '', chatHistory: [], timestamp: Date.now() }])} className="text-blue-600 hover:text-blue-700">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
              <div key={s.id} onClick={() => switchSession(s.id)} className={`w-full text-left px-3 py-2 rounded text-xs font-bold transition-all cursor-pointer ${currentSessionId === s.id ? 'bg-blue-50 text-blue-700' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                <div className="truncate">{s.title || 'Untitled Thread'}</div>
                <div className="text-[9px] font-medium text-neutral-400 mt-0.5">{new Date(s.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'blueprint' ? (
          <>
            
            {isSystemModelPanelOpen && (
              <div className="w-80 border-r border-neutral-200 flex flex-col bg-white overflow-y-auto shrink-0 transition-all duration-300">
                <div className="p-5 border-b border-neutral-200 sticky top-0 z-10 flex justify-between items-center bg-white">
                  <h2 className="text-[11px] font-black tracking-widest text-indigo-900 uppercase">SYSTEM ARCHITECT</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase">{systemModel.enabled ? 'ON' : 'OFF'}</span>
                    <button 
                      onClick={() => setSystemModel(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors ${systemModel.enabled ? 'bg-indigo-600' : 'bg-neutral-300'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${systemModel.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <div className="p-5 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">Project Context</label>
                    <textarea 
                      value={systemModel.description}
                      onChange={(e) => setSystemModel(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full h-24 p-3 bg-neutral-50 border border-neutral-200 rounded text-[11px] font-medium resize-none focus:outline-none focus:border-indigo-500"
                      placeholder="High-level goal for this project..."
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">Global Model Rules</label>
                    <textarea 
                      value={systemModel.modelRules}
                      onChange={(e) => setSystemModel(prev => ({ ...prev, modelRules: e.target.value }))}
                      className="w-full h-32 p-3 bg-neutral-50 border border-neutral-200 rounded text-[11px] font-medium resize-none focus:outline-none focus:border-indigo-500"
                      placeholder="Rules applied to all creator/expert nodes..."
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black tracking-widest text-neutral-500 uppercase">Auditor Strictness</label>
                    <textarea 
                      value={systemModel.auditorRules}
                      onChange={(e) => setSystemModel(prev => ({ ...prev, auditorRules: e.target.value }))}
                      className="w-full h-32 p-3 bg-neutral-50 border border-neutral-200 rounded text-[11px] font-medium resize-none focus:outline-none focus:border-purple-500"
                      placeholder="Specialized constraints for validation engines..."
                    />
                  </div>
                  <div className="text-[10px] text-neutral-400 bg-neutral-50 p-3 rounded border border-neutral-100">
                    <strong>Note:</strong> When enabled, these rules form the baseline for all node executions in the simulation, overriding node-specific defaults.
                  </div>
                </div>
              </div>
            )}
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
                  { category: 'INPUT/OUTPUT', nodes: ['Input', 'Wait', 'Output'] },
                  { category: 'PROCESSING', nodes: ['Model', 'Auditor', 'Router', 'Tool', 'Signal'] }
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
                             n === 'Wait' ? 'bg-cyan-400' : 
                             n === 'Signal' ? 'bg-amber-400' : 
                             n === 'Auditor' ? 'bg-purple-400' : 
                             n === 'Router' ? 'bg-fuchsia-400' : 
                             n === 'Tool' ? 'bg-emerald-400' : 'bg-green-400'
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
                   edges={visibleEdges} 
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

                     {(inspectedNode.data.nodeType === 'model' || inspectedNode.data.nodeType === 'auditor') && (
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

                       </>
                     )}

                     <div className="pt-4 border-t border-neutral-100">
                       {inspectedNode.data.status === 'PENDING_APPROVAL' && (
                         <div className="mb-4 flex flex-col gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                           <label className="text-[9px] font-black text-cyan-800 uppercase tracking-widest">Action Required</label>
                           <p className="text-[10px] text-cyan-900 leading-relaxed mb-2">The simulation is paused here. Please review the drum state and approve to continue.</p>
                           <button 
                             onClick={() => {
                               const pending = pendingApprovalsRef.current[inspectedNode.id];
                               if (pending) pending.resolve(pending.currentPayload);
                             }}
                             className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black uppercase tracking-widest py-2 rounded shadow-sm transition-all"
                           >
                             Approve & Resume
                           </button>
                         </div>
                       )}
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
               <div className="max-w-3xl mx-auto space-y-8 pb-10">
                  {chatHistory.length === 0 ? (
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
                    chatHistory.map((msg, i) => (
                      <div key={i} className={`flex gap-4 group ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'ai' && (
                          <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center text-neutral-400 shrink-0 font-black text-[10px]">AI</div>
                        )}
                        <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl p-4 shadow-sm' : 'bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm'}`}>
                          <div className={`text-[14px] leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-neutral-800'}`}>
                             {msg.role === 'ai' ? (
                               <div className="markdown-logs prose prose-sm max-w-none">
                                 <Markdown>{msg.content}</Markdown>
                               </div>
                             ) : (
                               msg.content
                             )}
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 font-black text-[10px]">YOU</div>
                        )}
                      </div>
                    ))
                  )}
                  {isRunning && (
                    <div className="flex gap-4 group">
                        <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center text-neutral-400 shrink-0 font-black text-[10px]">AI</div>
                        <div className="max-w-[85%] space-y-2 bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm">
                          <div className="text-[14px] leading-relaxed text-neutral-500 animate-pulse font-mono text-xs flex items-center gap-2">
                             <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                             EXECUTING BLUEPRINT...
                          </div>
                        </div>
                    </div>
                  )}
               </div>
            </div>
            <div className="p-8 border-t border-neutral-200 bg-white">
              <div className="max-w-3xl mx-auto relative">
                <textarea 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      runSimulation();
                    }
                  }}
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
    
      <ManualOverlay 
        isOpen={isDocsOpen} 
        onClose={() => setIsDocsOpen(false)} 
        onLoadExample={(newNodes, newEdges) => {
          try {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setNodes(newNodes);
            setEdges(newEdges);
            setIsDocsOpen(false);
            setActiveTab('blueprint');
            addLog(`[SYSTEM] Loaded blueprint template from Operations Manual.`);
          } catch (err) {
            console.error('Blueprint injection failed:', err);
            addLog(`[ERROR] Blueprint injection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }} 
      />
    </div>
  );
}
