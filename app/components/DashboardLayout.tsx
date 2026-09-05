'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge, Connection, addEdge, useNodesState, useEdgesState } from '@xyflow/react';
import { AgentCanvas } from './AgentCanvas';
import { PROVIDERS, DrumStatus, DrumPayload, ReeferSchema, ReeferGrade, Session } from '../types/pipeline';
import { motion } from 'framer-motion';
import { ManualOverlay } from './ManualOverlay';
import { Database, X, Plus, History, Trash2, Layers, Info, Terminal as TerminalIcon, Layout, Settings, BookOpen, Edit2, ChevronDown, ChevronRight, Play } from 'lucide-react';
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
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string; metadata?: { type: 'approval'; nodeId: string; payload: string } }[]>([]);
  const [systemModel, setSystemModel] = useState<{enabled: boolean, description: string, modelRules: string, auditorRules: string}>({ enabled: false, description: '', modelRules: '', auditorRules: '' });
  const [isSystemModelPanelOpen, setIsSystemModelPanelOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const pendingApprovalsRef = useRef<Record<string, { resolve: (payload: string) => void, currentPayload: string }>>({});
  const [waitingNodesTrigger, setWaitingNodesTrigger] = useState(0);

  const startTutorial = () => {
    setIsTutorialActive(true);
    setTutorialStep(1);
    setIsDocsOpen(false);
  };

  const nextStep = () => setTutorialStep(prev => prev + 1);
  const quitTutorial = () => {
    setIsTutorialActive(false);
    setTutorialStep(0);
    setShowQuitConfirm(false);
  };

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
           const isSignal = newData.isSignal || (newData.label && (newData.label.toUpperCase() === 'REJECTION' || newData.label.toUpperCase() === 'ICE'));
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
      const tokenNote = "\n\nCRITICAL: Be extremely brief. Use bullet points. Maximum 150 words.";
      const fullSystemPrompt = reeferContext 
        ? `${systemPrompt}${markdownNote}${tokenNote}\n\nSTRICT PROJECT REEFER (${reeferContext.grade} GRADE):\n${JSON.stringify(reeferContext, null, 2)}\n\nIMPORTANT: Adhere strictly to these boundaries. Do not include excluded features.`
        : `${systemPrompt}${markdownNote}${tokenNote}`;

      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, systemPrompt: fullSystemPrompt }),
      });
      const data = await response.json();
      if (data.error) {
        if (data.error.includes('API_KEY')) {
          addLog(`[SIMULATION MODE] Groq API Key missing. Using bypass.`);
          return "Simulation result: The AI would provide a structured response here if a Groq API key was provided in settings.";
        }
        throw new Error(data.error);
      }
      return data.text;
    } catch (err: any) {
      addLog(`[ERROR] Groq API: ${err.message}`);
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

    const result = await callGroqApi(triagePrompt, 'groq/compound-mini', "You are a triage system.");
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
        
        // Accumulate context: Input + History + Previous Drum
        const historyContext = chatHistory.slice(-5).map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');
        const prompt = isCasual 
          ? `HISTORY:\n${historyContext}\n\nCURRENT INPUT: ${inputDrum.compressedPayload}` 
          : `CONTEXT HISTORY:\n${historyContext}\n\nCURRENT PAYLOAD: ${inputDrum.compressedPayload}\nNEXT INSTRUCTION: ${inputDrum.nextInstruction}`;
        
        let systemPrompt = isCasual
          ? `${nodeData.systemPrompt}\n\nMODE: CASUAL. Be warm and friendly. Use Markdown. Stay extremely brief.`
          : `${nodeData.systemPrompt}\n\nMODE: PRODUCTION. Output ONLY raw actionable data. Strip chatter. Strict Reefer adherence. Be brief.`;

        if (systemModel.enabled) {
          systemPrompt += `\n\n[SYSTEM MODEL RULES]\nProject Description: ${systemModel.description}\nModel Rules: ${systemModel.modelRules}`;
        }

        if (needsNaming) {
          needsNaming = false; // Prevent parallel nodes from also doing this
          systemPrompt += `\n\n[CRITICAL INSTRUCTION] This is the start of a new chat. You MUST output your response as a raw JSON object exactly like this:\n{\n  "chatName": "2-3 Word Title Here",\n  "content": "Your actual full response here"\n}`;
        }

        const startTime = Date.now();
        if (nodeData.provider === 'groq' || nodeData.provider === 'gemini') {
          // Force use Groq since Gemini is disabled by user mandate
          const variant = nodeData.modelVariant?.includes('gemini') ? 'groq/compound' : (nodeData.modelVariant as string);
          outputPayload = await callGroqApi(prompt, variant, systemPrompt, currentReefer || undefined);
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
              const feedbackPayload = `
              [CRITICAL AUDIT REJECTION]
              Your previous output was rejected by the validation engine.
              
              REJECTION REASON: 
              "${auditJson.reason}"
              
              ORIGINAL PAYLOAD:
              ${inputDrum.compressedPayload}
              
              INSTRUCTIONS:
              Please fix the errors identified above and output the corrected version. Do not apologize, just provide the fixed content.`;
              
              const successorPromises = feedbackEdges.map(async (edge) => {
                const nextDrum: DrumPayload = {
                  drumId: `drum_${Math.random().toString(36).substr(2, 5)}`,
                  sequenceStep: inputDrum.sequenceStep + 1,
                  compressedPayload: feedbackPayload,
                  nextInstruction: `FIX ERROR: ${auditJson.reason}`,
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
      else if (nodeData.nodeType === 'tool') {
        const toolType = (nodeData.toolType || 'TRANSFORM').toUpperCase();
        addLog(`[TOOL] Executing ${toolType} utility: ${label}...`);
        
        try {
          if (toolType === 'JSON_FORMAT') {
            const raw = inputDrum.compressedPayload;
            const start = raw.indexOf('{');
            const end = raw.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
              const json = JSON.parse(raw.substring(start, end + 1));
              outputPayload = JSON.stringify(json, null, 2);
              addLog(`[TOOL] Successfully formatted JSON.`);
            } else {
              throw new Error("No JSON object found in payload.");
            }
          } 
          else if (toolType === 'SUMMARY') {
            addLog(`[TOOL] Generating payload digest...`);
            const summaryPrompt = `Summarize the following payload into a 1-2 sentence digest for the next node in the chain:\n\n${inputDrum.compressedPayload}`;
            outputPayload = await callGroqApi(summaryPrompt, 'groq/compound-mini', "You are a text compression utility.");
          }
          else if (toolType === 'EXTRACT_CODE') {
            const raw = inputDrum.compressedPayload;
            const matches = raw.match(/```[\s\S]*?```/g);
            if (matches) {
              outputPayload = matches.map(m => m.replace(/```[a-zA-Z]*\n?|```/g, '')).join('\n\n---\n\n');
              addLog(`[TOOL] Extracted ${matches.length} code blocks.`);
            } else {
              outputPayload = raw;
              addLog(`[TOOL] No code blocks found to extract.`);
            }
          }
          else {
            // Default Transform: Simple cleaning
            outputPayload = inputDrum.compressedPayload.trim();
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (err: any) {
          addLog(`[TOOL ERROR] ${err.message}`);
          outputPayload = inputDrum.compressedPayload; // Passthrough on error
        }
      }
      else if (nodeData.nodeType === 'router') {
        const outgoingEdgesForRouter = edges.filter(e => e.source === nodeId);
        if (outgoingEdgesForRouter.length > 0) {
           const routes = outgoingEdgesForRouter.map(e => {
             const targetNode = nodes.find(n => n.id === e.target);
             const edgeLabel = e.label || (e.data as any)?.label || 'UNLABELED_ROUTE';
             return `- Route: "${edgeLabel}" (ID: ${e.id}) -> Leading to: ${targetNode?.data.label || 'Unnamed Node'}`;
           }).join('\n');

           const routerPrompt = `
           [DETERMINISTIC ROUTING INSTRUCTION]
           You are a high-speed traffic manager. Your goal is to analyze the payload and select the most logical route from the available options.
           
           CURRENT DRUM PAYLOAD:
           "${inputDrum.compressedPayload}"
           
           AVAILABLE ROUTES:
           ${routes}
           
           DECISION LOGIC:
           1. Analyze the intent/content of the payload.
           2. Match the intent to the most relevant "Route" label.
           3. If no route matches perfectly, pick the "TECHNICAL" or "GENERAL" default if available.
           
           Output ONLY a JSON object: {"edgeId": "the_chosen_edge_id", "reasoning": "Brief explanation"}`;

           const startTime = Date.now();
           const result = await callGroqApi(routerPrompt, 'groq/compound-mini', "You are a deterministic routing logic gate. Return ONLY valid JSON.");
           const latency = Date.now() - startTime;
           addLog(`[TELEMETRY] Router Node ${label} completed in ${latency}ms`);

           try {
             const cleanJson = result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1);
             const routerJson = JSON.parse(cleanJson);
             
             if (routerJson.edgeId && outgoingEdgesForRouter.find(e => e.id === routerJson.edgeId)) {
                (nodeData as any).selectedRoute = routerJson.edgeId;
                const selectedEdge = outgoingEdgesForRouter.find(e => e.id === routerJson.edgeId);
                const selectedLabel = selectedEdge?.label || (selectedEdge?.data as any)?.label || 'Unlabeled';
                addLog(`[ROUTER] Intent matched: "${selectedLabel.toString().toUpperCase()}". Routing to ID: ${routerJson.edgeId}`);
                addLog(`[ROUTER LOGIC] ${routerJson.reasoning}`);
             } else {
                throw new Error("Invalid Edge ID selected by router.");
             }
           } catch (e) {
             addLog(`[ERROR] Router ${label} failed to determine path. Defaulting to first available route.`);
             (nodeData as any).selectedRoute = outgoingEdgesForRouter[0].id;
           }
        } else {
           addLog(`[ERROR] Router ${label} has no outgoing connections.`);
        }
      }
      else if (nodeData.nodeType === 'wait') {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'PENDING_APPROVAL' } } : n));
        addLog(`[WAIT] Simulation halted at ${label}. Waiting for human-in-the-loop approval...`);
        
        // Push intervention request to chat
        setChatHistory(prev => [...prev, { 
          role: 'ai', 
          content: `🚦 **PENDING APPROVAL:** The simulation is waiting at **${label}**. Please review the current payload and decide whether to continue.`,
          metadata: {
            type: 'approval',
            nodeId: nodeId,
            payload: inputDrum.compressedPayload
          }
        }]);

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
              <div className="p-5 border-b border-neutral-800 bg-neutral-950 sticky top-0 z-10 flex items-center justify-between">
                <h2 className="text-[10px] font-black tracking-[0.2em] text-neutral-500 uppercase font-mono">NODE_PALETTE</h2>
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
              </div>
              <div className="p-4 flex flex-col gap-8">
                {[
                  { category: 'DATA_IO', nodes: ['Input', 'Wait', 'Output'] },
                  { category: 'PROCESSING', nodes: ['Model', 'Auditor', 'Router', 'Tool'] }
                ].map((group) => (
                  <div key={group.category} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="h-px flex-1 bg-neutral-800" />
                      <div className="text-[8px] font-black text-neutral-500 uppercase tracking-[0.3em] font-mono">{group.category}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {group.nodes.map((n) => (
                         <div 
                           key={n} 
                           draggable 
                           onDragStart={(e) => onDragStart(e, n)} 
                           className="group p-3 bg-neutral-800/50 border border-neutral-700/30 text-[10px] font-black text-neutral-400 cursor-grab hover:bg-blue-600 hover:text-white hover:border-blue-400 transition-all rounded-lg shadow-sm active:cursor-grabbing flex items-center gap-3 relative overflow-hidden"
                         >
                           <div className="absolute inset-y-0 left-0 w-1 bg-neutral-700 group-hover:bg-blue-400 transition-colors" />
                           <div className={`w-2 h-2 rounded-sm rotate-45 ${
                             n === 'Input' ? 'bg-blue-500' : 
                             n === 'Output' ? 'bg-neutral-500' : 
                             n === 'Wait' ? 'bg-cyan-500' : 
                             n === 'Auditor' ? 'bg-purple-500' : 
                             n === 'Router' ? 'bg-fuchsia-500' : 
                             n === 'Tool' ? 'bg-emerald-500' : 'bg-green-500'
                           }`} />
                           <span className="tracking-widest font-mono">{n.toUpperCase()}</span>
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
                <div className="h-72 border-t border-neutral-800 bg-[#0a0a0a] flex flex-col shrink-0 z-20 shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.5)]">
                  <div className="px-6 py-4 border-b border-neutral-800/50 bg-[#0f0f0f] flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500/80 animate-pulse" />
                        <span className="text-neutral-200 font-mono text-[10px] font-black tracking-[0.3em] uppercase">SYSTEM_ORCHESTRATOR_LOG</span>
                      </div>
                      <div className="h-3 w-px bg-neutral-800" />
                      <span className="text-neutral-600 font-mono text-[9px] uppercase tracking-widest">v0.1.0-alpha</span>
                    </div>
                    <button 
                      onClick={() => setIsTerminalOpen(false)} 
                      className="text-neutral-500 hover:text-white transition-colors p-1 hover:bg-neutral-800 rounded text-[9px] font-black tracking-widest font-mono uppercase"
                    >
                      EXIT_SESSION
                    </button>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto space-y-2 font-mono text-[11px] leading-relaxed text-neutral-400 custom-scrollbar">
                    {logs.map((log, index) => {
                      const finalContent = log.replace(/^\[.*?\]\s*\[.*?\]\s*/, '') || log;
                      const timeStr = log.substring(log.indexOf('[') + 1, log.indexOf(']'));
                      return (
                        <div key={index} className="flex gap-4 group hover:bg-neutral-900/50 p-1 -m-1 rounded transition-colors">
                          <span className="text-neutral-600 shrink-0 select-none font-mono opacity-50 group-hover:opacity-100 transition-opacity">[{timeStr}]</span>
                          <div className="markdown-logs flex-1 text-neutral-300">
                            <Markdown>{finalContent}</Markdown>
                          </div>
                        </div>
                      );
                    })}
                    {isRunning && (
                      <div className="flex items-center gap-2 text-blue-400 font-mono">
                        <span className="animate-pulse">_</span>
                        <span className="text-[9px] uppercase tracking-widest animate-pulse">Processing_Payload...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isInspectorOpen && (
              <div className="w-80 border-l border-neutral-200 bg-[#fcfcfc] flex flex-col shrink-0 overflow-y-auto shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                <div className="p-6 border-b border-neutral-200 bg-white sticky top-0 z-10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-neutral-900 rotate-45 flex items-center justify-center">
                      <div className="w-1 h-1 bg-neutral-900" />
                    </div>
                    <h2 className="text-[11px] font-black tracking-[0.2em] text-neutral-900 uppercase font-mono">SPEC_INSPECTOR</h2>
                  </div>
                  <button onClick={() => setIsInspectorOpen(false)} className="text-neutral-400 hover:text-neutral-900 p-1.5 hover:bg-neutral-100 rounded-lg transition-all"><X size={14} /></button>
                </div>
                
                {inspectedNode ? (
                  <div className="p-6 flex flex-col gap-8">
                     <div className="flex flex-col gap-3">
                       <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] font-mono px-1">Display_Identity</label>
                       <div className="relative group">
                         <input 
                           value={inspectedNode.data.label as string} 
                           placeholder={(inspectedNode.data.modelVariant as string) || 'Unnamed'}
                           onChange={(e) => updateNodeData(inspectedNode.id, { label: e.target.value })}
                           className="w-full border border-neutral-200 p-4 text-[12px] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 rounded-xl bg-white shadow-sm transition-all" 
                         />
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                           <Edit2 size={12} />
                         </div>
                       </div>
                     </div>

                     {(inspectedNode.data.nodeType === 'model' || inspectedNode.data.nodeType === 'auditor') && (
                       <>
                         <div className="flex flex-col gap-4">
                           <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] font-mono px-1">Orchestration_Core</label>
                           <div className="flex flex-col gap-2">
                              {PROVIDERS.map(p => {
                                const isActive = p.id === 'groq';
                                return (
                                  <button 
                                    key={p.id}
                                    onClick={() => updateNodeData(inspectedNode.id, { provider: p.id, modelVariant: p.variants[0] })}
                                    className={`p-4 text-[11px] font-mono font-bold text-left border rounded-xl transition-all flex justify-between items-center group relative overflow-hidden ${
                                      inspectedNode.data.provider === p.id 
                                        ? (isActive ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-red-500 bg-red-50 text-red-700') 
                                        : (isActive ? 'border-neutral-200 bg-white hover:border-neutral-900' : 'border-neutral-100 bg-neutral-50/50 text-neutral-300 pointer-events-none opacity-50')
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-1.5 h-1.5 rounded-full ${inspectedNode.data.provider === p.id ? 'bg-current' : 'bg-neutral-200'}`} />
                                      <span>{p.name.toUpperCase()}</span>
                                    </div>
                                    {!isActive && <span className="text-[7px] font-black px-1.5 py-0.5 rounded tracking-tighter uppercase font-sans">DISABLED</span>}
                                    {isActive && <span className={`text-[7px] font-black px-1.5 py-0.5 rounded tracking-tighter uppercase font-sans ${inspectedNode.data.provider === p.id ? 'bg-white text-black' : 'bg-neutral-900 text-white'}`}>ACTIVE</span>}
                                  </button>
                                );
                              })}
                           </div>
                         </div>

                         <div className="flex flex-col gap-3">
                           <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] font-mono px-1">Variant_Manifest</label>
                           <div className="relative">
                             <select 
                               value={inspectedNode.data.modelVariant as string}
                               onChange={(e) => updateNodeData(inspectedNode.id, { modelVariant: e.target.value })}
                               className="w-full border border-neutral-200 p-4 text-[11px] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 rounded-xl bg-white shadow-sm appearance-none cursor-pointer"
                             >
                               {PROVIDERS.find(p => p.id === inspectedNode.data.provider)?.variants.map(v => (
                                 <option key={v} value={v}>{v.toUpperCase()}</option>
                               ))}
                             </select>
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                               <ChevronDown size={14} />
                             </div>
                           </div>
                         </div>

                         <div className="flex flex-col gap-4">
                           <div className="flex justify-between items-center px-1">
                             <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] font-mono">Heat_Index</label>
                             <span className="text-[11px] font-mono font-black text-neutral-900">{inspectedNode.data.temperature as number}</span>
                           </div>
                           <input 
                             type="range" min="0" max="1" step="0.1" 
                             value={inspectedNode.data.temperature as number}
                             onChange={(e) => updateNodeData(inspectedNode.id, { temperature: parseFloat(e.target.value) })}
                             className="w-full accent-neutral-900 h-1 bg-neutral-100 rounded-full appearance-none cursor-pointer"
                           />
                         </div>

                         <div className="flex flex-col gap-3">
                           <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] font-mono px-1">System_Directives</label>
                           <textarea 
                             value={inspectedNode.data.systemPrompt as string}
                             onChange={(e) => updateNodeData(inspectedNode.id, { systemPrompt: e.target.value })}
                             placeholder="Awaiting high-priority instructions..."
                             className="w-full border border-neutral-200 p-4 text-[11px] font-mono font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 rounded-xl bg-white shadow-sm h-32 resize-none leading-relaxed"
                           />
                         </div>
                       </>
                      )}
                      <div className="pt-4 border-t border-neutral-100">
                        {inspectedNode.data.status === 'PENDING_APPROVAL' && (
                          <div className="mb-4 flex flex-col gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                            <label className="text-[9px] font-black text-cyan-800 uppercase tracking-widest">Action Required</label>
                            <p className="text-[10px] text-cyan-900 leading-relaxed italic">Simulation paused. Approval button is now located in the <strong>Chat Interface</strong>.</p>
                            <button 
                              onClick={() => setActiveTab('chat')}
                              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black uppercase tracking-widest py-2 rounded shadow-sm transition-all"
                            >
                              Go to Chat for Approval
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
                          
                          {msg.metadata?.type === 'approval' && (
                            <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col gap-3">
                              <div className="p-3 bg-neutral-50 rounded border border-neutral-100 font-mono text-[10px] text-neutral-500 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                {msg.metadata.payload}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const pending = pendingApprovalsRef.current[msg.metadata!.nodeId];
                                    if (pending) pending.resolve(pending.currentPayload);
                                  }}
                                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest py-2.5 rounded-lg shadow-sm transition-all"
                                >
                                  Approve & Continue
                                </button>
                                <button
                                  onClick={() => setIsRunning(false)}
                                  className="px-4 py-2.5 border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-200 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all"
                                >
                                  Stop
                                </button>
                              </div>
                            </div>
                          )}
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
        onStartTutorial={startTutorial}
      />

      {isTutorialActive && (
        <div className="fixed bottom-24 left-8 z-[500] pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="pointer-events-auto w-80 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-neutral-200/50 p-6 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase">Tour Companion: {tutorialStep} / 5</span>
              </div>
              <button 
                onClick={() => setShowQuitConfirm(true)}
                className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X size={14} className="text-neutral-400" />
              </button>
            </div>

            {tutorialStep === 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black tracking-tight text-neutral-900">Welcome to CARGO</h3>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  This is a deterministic AI orchestration engine. I&apos;ll help you build an autonomous swarm in real-time.
                </p>
                <button 
                  onClick={nextStep}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  Start Guide
                </button>
              </div>
            )}

            {tutorialStep === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black tracking-tight text-neutral-900">Step 1: Inject Blueprint</h3>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Let&apos;s load a <strong>Self-Correcting Auditor</strong> loop. This pattern ensures the AI fixes its own errors.
                </p>
                <button 
                  onClick={() => {
                    const ex = {
                      nodes: [
                        { id: 'n1', type: 'custom', position: { x: 50, y: 150 }, data: { nodeType: 'input', label: 'Requirement', status: 'READY' } },
                        { id: 'n2', type: 'custom', position: { x: 250, y: 150 }, data: { nodeType: 'model', label: 'Generator', status: 'READY', provider: 'groq', modelVariant: 'groq/compound' } },
                        { id: 'n3', type: 'custom', position: { x: 500, y: 150 }, data: { nodeType: 'auditor', label: 'QA Auditor', status: 'READY', provider: 'groq', modelVariant: 'groq/compound-mini' } },
                        { id: 'n4', type: 'custom', position: { x: 750, y: 150 }, data: { nodeType: 'output', label: 'Verified Result', status: 'READY' } }
                      ],
                      edges: [
                        { id: 'e1', source: 'n1', target: 'n2', type: 'buttonEdge', animated: true },
                        { id: 'e2', source: 'n2', target: 'n3', type: 'buttonEdge', animated: true },
                        { id: 'e3', source: 'n3', target: 'n2', type: 'buttonEdge', label: 'REJECTION', style: { stroke: '#ef4444', strokeWidth: 3 }, animated: true },
                        { id: 'e4', source: 'n3', target: 'n4', type: 'buttonEdge', label: 'PASS', style: { stroke: '#22c55e' }, animated: true }
                      ]
                    };
                    setNodes(ex.nodes);
                    setEdges(ex.edges);
                    nextStep();
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-blue-100"
                >
                  Load Logic
                </button>
              </div>
            )}

            {tutorialStep === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black tracking-tight text-neutral-900">Step 2: Set Payload</h3>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Now we define the task. I&apos;ve set a payload to generate a technical summary.
                </p>
                <button 
                  onClick={() => {
                    setChatInput("Create a brief technical project summary for a solar energy app.");
                    nextStep();
                  }}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  Prepare Drum
                </button>
              </div>
            )}

            {tutorialStep === 4 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black tracking-tight text-neutral-900">Step 3: Launch Swarm</h3>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Watch the canvas. The data will move through the nodes, audit itself, and finish in the chat.
                </p>
                <button 
                  onClick={() => {
                    runSimulation();
                    setActiveTab('chat');
                    nextStep();
                  }}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-green-100"
                >
                  Execute Flow
                </button>
              </div>
            )}

            {tutorialStep === 5 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black tracking-tight text-neutral-900">Onboarding Complete</h3>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  You just ran a full autonomous cycle. You can now build your own swarms or explore the Manual.
                </p>
                <button 
                  onClick={quitTutorial}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  Finish
                </button>
              </div>
            )}
          </motion.div>

          {showQuitConfirm && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center bg-neutral-950/20 backdrop-blur-[1px]">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-6 rounded-3xl max-w-xs w-full text-center shadow-2xl border border-neutral-100"
              >
                <h4 className="text-sm font-black text-neutral-900 mb-1 uppercase tracking-tight">Stop Tour?</h4>
                <p className="text-[10px] text-neutral-500 mb-4 font-medium uppercase tracking-widest">Confirmation required</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowQuitConfirm(false)}
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    Stay
                  </button>
                  <button 
                    onClick={quitTutorial}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    Exit
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
