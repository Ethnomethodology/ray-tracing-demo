const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Fix alignment of "Part 1 of 3" and the three-dash menu button
html = html.replace(
    /<span class="text-\[#800020\] dark:text-red-400 font-medium">Part 1 of 3<\/span>\s*<button class="text-\[#800020\] dark:text-red-400 hover:text-\[#800020\] dark:hover:text-red-300 transition-colors">/,
    `<div class="flex items-center">
            <span class="text-[#800020] dark:text-red-400 font-medium mr-2">Part 1 of 3</span>
            <button class="text-[#800020] dark:text-red-400 hover:text-[#800020] dark:hover:text-red-300 transition-colors flex items-center">`
);
html = html.replace(
    /<\/button>\s*<\/div>\s*<!-- Dropdown Menu -->/,
    `</button>\n        </div>\n    </div>\n    <!-- Dropdown Menu -->`
);


// 2. Add captions for the first two canvases (previewCanvas and walkthroughCanvas) correctly
// Find previewCanvas section end (closing div for demo-right-column)
// Section: explanation-section
html = html.replace(
    /<\/div>\s*<\/div>\s*<\/section>\s*<section class="walkthrough-section">/,
    `</div>
            </div>
            <div class="mt-4 text-center w-full">
                <span class="text-[#722F37] font-bold text-sm mr-1" style="font-family: 'Newsreader', serif;">Fig. 2:</span>
                <span class="text-stone-600 text-sm italic" style="font-family: 'Newsreader', serif;">The Parts of Dürer's Apparatus.</span>
            </div>
        </div>
    </section>

    <section class="walkthrough-section">`
);

// Find walkthroughCanvas section end
html = html.replace(
    /<\/div>\s*<\/div>\s*<\/section>\s*<section class="demo-section">/,
    `</div>
            </div>
            <div class="mt-4 text-center w-full">
                <span class="text-[#722F37] font-bold text-sm mr-1" style="font-family: 'Newsreader', serif;">Fig. 3:</span>
                <span class="text-stone-600 text-sm italic" style="font-family: 'Newsreader', serif;">Step-by-step Operation of the Apparatus.</span>
            </div>
        </div>
    </section>

    <section class="demo-section">`
);

// Note: Ensure the demo-layout flexbox wraps these captions correctly. Wait, demo-layout is flex-row.
// If I place the caption inside demo-layout, it will be another column.
// I should place it INSIDE demo-right-column at the end, or outside demo-layout.
// User said: "dont add caption inside canvas, it should be outside. all canvases should have their captions outside."
// Outside the canvas-container, but inside demo-right-column is best so it aligns with the right column.

html = fs.readFileSync('public/index.html', 'utf8'); // Reload to redo correctly
