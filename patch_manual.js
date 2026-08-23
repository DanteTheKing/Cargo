const fs = require('fs');
let code = fs.readFileSync('app/components/DashboardLayout.tsx', 'utf-8');

// Replace the old docs sidebar with nothing
const docsSidebarRegex = /\{isDocsOpen && \(\s*<div className="w-80 border-r border-neutral-200[\s\S]*?<\/div>\s*\)\}/;
code = code.replace(docsSidebarRegex, '');

// Add the ManualOverlay at the very end of the layout, inside the main flex container, or just before the closing </div> of the main layout.
const manualOverlayRender = `
      <ManualOverlay 
        isOpen={isDocsOpen} 
        onClose={() => setIsDocsOpen(false)} 
        onLoadExample={(newNodes, newEdges) => {
          setNodes(newNodes);
          setEdges(newEdges);
          setIsDocsOpen(false);
          setActiveTab('blueprint');
        }} 
      />
    </div>
  );
}
`;
code = code.replace(/<\/div>\s*\);\s*\}\s*$/, manualOverlayRender);

fs.writeFileSync('app/components/DashboardLayout.tsx', code);
