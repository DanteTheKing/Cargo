const fs = require('fs');
let code = fs.readFileSync('app/components/ManualOverlay.tsx', 'utf-8');
code = code.replace(/"Reefer"/g, '&quot;Reefer&quot;');
code = code.replace(/"Drum"/g, '&quot;Drum&quot;');
code = code.replace(/"Approve"/g, '&quot;Approve&quot;');
fs.writeFileSync('app/components/ManualOverlay.tsx', code);
