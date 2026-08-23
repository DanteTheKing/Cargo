const fs = require('fs');
let code = fs.readFileSync('app/components/DashboardLayout.tsx', 'utf-8');

const historySidebar = `
      {isHistoryOpen && (
        <div className="w-64 border-r border-neutral-200 bg-white flex flex-col shrink-0 z-20">
          <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
            <h2 className="text-[11px] font-black tracking-widest text-neutral-900 uppercase">Sessions</h2>
            <button onClick={() => switchSession(\`session_\${Date.now()}\`, [...sessions, { id: \`session_\${Date.now()}\`, title: 'New Thread', reefer: null, logs: ['[SYSTEM] Session initialized.'], nodes: [], edges: [], drumSnapshots: {}, chatInput: '', chatHistory: [], timestamp: Date.now() }])} className="text-blue-600 hover:text-blue-700">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
              <div key={s.id} onClick={() => switchSession(s.id)} className={\`w-full text-left px-3 py-2 rounded text-xs font-bold transition-all cursor-pointer \${currentSessionId === s.id ? 'bg-blue-50 text-blue-700' : 'text-neutral-600 hover:bg-neutral-50'}\`}>
                <div className="truncate">{s.title || 'Untitled Thread'}</div>
                <div className="text-[9px] font-medium text-neutral-400 mt-0.5">{new Date(s.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
`;

code = code.replace("{activeTab === 'blueprint' ? (", historySidebar + "\n      {activeTab === 'blueprint' ? (");
fs.writeFileSync('app/components/DashboardLayout.tsx', code);
