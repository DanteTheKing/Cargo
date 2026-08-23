const fs = require('fs');
let code = fs.readFileSync('app/components/DashboardLayout.tsx', 'utf-8');

// 1. Add state for isPathVisible
code = code.replace('const [isRunning, setIsRunning] = useState(false);', 'const [isRunning, setIsRunning] = useState(false);\n  const [isPathVisible, setIsPathVisible] = useState(false);');

// 2. Add button in the top right nav next to "RUN BLUEPRINT"
const runBtnRegex = /<button \s*onClick=\{runSimulation\}/;
code = code.replace(runBtnRegex, `<button onClick={() => setIsPathVisible(!isPathVisible)} className="border border-neutral-200 hover:bg-neutral-50 text-neutral-600 px-4 py-2 rounded-md text-[11px] font-black transition-all shadow-sm tracking-widest uppercase">
            {isPathVisible ? 'HIDE SET PATH' : 'SHOW SET PATH'}
          </button>
          <button 
            onClick={runSimulation}`);

// 3. Update the edges render state to add animated property if isPathVisible is true
const onEdgesChangeRegex = /const \[edges, setEdges, onEdgesChange\] = useEdgesState<Edge>\(\[\]\);/;
code = code.replace(onEdgesChangeRegex, `const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);\n  const visibleEdges = edges.map(e => ({ ...e, animated: isPathVisible || e.animated }));`);

// 4. pass visibleEdges to ReactFlow
code = code.replace(/edges=\{edges\}/, `edges={visibleEdges}`);

fs.writeFileSync('app/components/DashboardLayout.tsx', code);
