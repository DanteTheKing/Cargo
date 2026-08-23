'use client';

import { useCallback, DragEvent, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  Connection,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  NodeChange,
  EdgeChange,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
  OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DrumStatus } from '../types/pipeline';
import { Trash2 } from 'lucide-react';

const statusStyles: Record<DrumStatus, string> = {
  READY: 'border-neutral-200 bg-white text-neutral-900',
  PROCESSING: 'border-blue-500 bg-blue-50 text-blue-900',
  PENDING: 'border-amber-400 bg-amber-50 text-amber-900 animate-pulse',
  PASS: 'border-green-500 bg-green-50 text-green-900',
  INTERRUPT: 'border-red-500 bg-red-50 text-red-900',
  ICE_CORRECTION: 'border-orange-500 bg-orange-50 text-orange-900',
};

const ButtonEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-4 h-4 bg-white border border-red-200 text-red-500 rounded-full flex items-center justify-center font-bold text-[8px] shadow-sm hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer opacity-100"
            onClick={onEdgeClick}
          >
            ✕
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const nodeType = data.nodeType || 'model';
  const isInput = nodeType === 'input';
  const isOutput = nodeType === 'output';
  const isSignal = nodeType === 'signal';
  const isInterrupt = nodeType === 'interrupt';
  const isModel = nodeType === 'model';

  let bgColor = 'bg-white';
  if (isInput) bgColor = 'bg-blue-50/50';
  if (isOutput) bgColor = 'bg-neutral-900 text-white';
  if (isSignal) bgColor = 'bg-amber-50/50';
  if (isInterrupt) bgColor = 'bg-red-50/50';

  return (
    <div className={`px-5 py-3 rounded-lg border transition-all duration-300 ${statusStyles[data.status as DrumStatus] || statusStyles.READY} ${selected ? 'ring-2 ring-neutral-900 border-transparent shadow-md' : 'shadow-sm'} min-w-[160px] text-left flex flex-col gap-1.5 ${isOutput ? 'bg-neutral-900' : bgColor}`}>
      {!isInput && (
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-around py-4 -ml-1.5">
          <Handle type="target" position={Position.Left} id="in-1" className="w-2.5 h-2.5 bg-neutral-400 border-white border-2 !relative !top-0 !left-0 mb-1" />
          <Handle type="target" position={Position.Left} id="in-2" className="w-2.5 h-2.5 bg-neutral-400 border-white border-2 !relative !top-0 !left-0 mb-1" />
          <Handle type="target" position={Position.Left} id="in-3" className="w-2.5 h-2.5 bg-neutral-400 border-white border-2 !relative !top-0 !left-0" />
        </div>
      )}
      
      <div className="flex justify-between items-center gap-4">
        <div className="font-bold tracking-tight text-[11px] uppercase opacity-50">
          {isInterrupt ? 'Interrupt (ICE)' : nodeType}
        </div>
        {data.iceToken && (
          <div className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black animate-pulse">ICE</div>
        )}
      </div>

      <div className="font-bold text-[13px] leading-tight truncate">
        {data.label || (data.modelVariant ? data.modelVariant : 'Unnamed Node')}
      </div>

      {isModel && data.provider && (
        <div className="text-[10px] font-mono opacity-60">
          {data.provider} / {data.modelVariant}
        </div>
      )}

      {!isOutput && (
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-around py-4 -mr-1.5">
          <Handle type="source" position={Position.Right} id="out-1" className="w-2.5 h-2.5 bg-neutral-400 border-white border-2 !relative !top-0 !right-0 mb-1" />
          <Handle type="source" position={Position.Right} id="out-2" className="w-2.5 h-2.5 bg-neutral-400 border-white border-2 !relative !top-0 !right-0 mb-1" />
          <Handle type="source" position={Position.Right} id="out-3" className="w-2.5 h-2.5 bg-neutral-400 border-white border-2 !relative !top-0 !right-0" />
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  buttonEdge: ButtonEdge,
};

interface FlowProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onNodeSelect: (node: Node | null) => void;
  onEdgeSelect: (edge: Edge | null) => void;
}

const Flow = ({ nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, onNodeSelect, onEdgeSelect }: FlowProps) => {
  const reactFlowInstance = useReactFlow();
  const [isOverTrash, setIsOverTrash] = useState(false);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeDrag: OnNodeDrag = useCallback((event, node) => {
    // Check if the node is being dragged over the trash zone area
    const trashZone = document.getElementById('trash-zone');
    if (trashZone) {
      const rect = trashZone.getBoundingClientRect();
      const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
      const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
      
      const isOver = (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
      setIsOverTrash(isOver);
    }
  }, []);

  const onNodeDragStop: OnNodeDrag = useCallback((event, node) => {
    const trashZone = document.getElementById('trash-zone');
    if (trashZone) {
      const rect = trashZone.getBoundingClientRect();
      const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
      const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;

      const isOver = (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
      
      if (isOver) {
        setNodes((nds) => nds.filter((n) => n.id !== node.id));
        onNodeSelect(null);
      }
    }
    setIsOverTrash(false);
  }, [setNodes, onNodeSelect]);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeType = type.toLowerCase().includes('model') ? 'model' : 
                       type.toLowerCase().includes('interrupt') ? 'interrupt' : 
                       type.toLowerCase();
      
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: 'custom',
        position,
        data: { 
          nodeType: nodeType,
          label: type === 'Model' ? '' : type.replace(' Node', ''), 
          status: 'READY',
          provider: 'groq',
          modelVariant: 'llama-4-400b',
          temperature: 0.7,
          systemPrompt: 'You are an AI agent participating in this blueprint pipeline.'
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onSelectionChange={(params) => {
        onNodeSelect(params.nodes.length > 0 ? params.nodes[0] : null);
        onEdgeSelect(params.edges.length > 0 ? params.edges[0] : null);
      }}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      className="touch-none"
    >
      <Controls className="bg-white border-neutral-200 shadow-sm" />
      <MiniMap zoomable pannable nodeClassName="bg-neutral-200" maskColor="rgba(255,255,255,0.7)" className="border border-neutral-200 rounded-lg shadow-sm" />
      <Background gap={24} size={2} color="#e5e5e5" />
      
      {/* Red Glowing Trash Zone */}
      <div 
        id="trash-zone"
        className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-[50] p-4 rounded-full transition-all duration-300 border-2 ${
          isOverTrash 
            ? 'bg-red-500 text-white scale-125 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.8)]' 
            : 'bg-white/80 backdrop-blur-md text-red-500 border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
        }`}
      >
        <div className={isOverTrash ? 'animate-bounce' : 'animate-pulse'}>
          <Trash2 size={24} />
        </div>
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-red-600 bg-white/80 px-2 py-0.5 rounded-full border border-red-100">
          Drop to Delete
        </div>
      </div>
    </ReactFlow>
  );
};

export function AgentCanvas(props: FlowProps) {
  return (
    <div className="w-full h-full bg-neutral-50/50">
      <ReactFlowProvider>
        <Flow {...props} />
      </ReactFlowProvider>
    </div>
  );
}
