const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Restore the canvas containers to NOT include the caption block inside.

// Restore Canvas 1 (previewCanvas)
// Actually wait, looking at the previous patch: I applied it to `renderCanvas`, `stepOneCanvas`, `stepTwoCanvas`.
// Wait, previewCanvas wasn't modified? Ah, previewCanvas is Fig 2 in the woodcut section? Let's check where stepOneCanvas is.
