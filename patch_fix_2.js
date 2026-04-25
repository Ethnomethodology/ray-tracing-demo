const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Fix alignment of "Part 1 of 3" and the menu button
html = html.replace(
    /<div class="flex items-center gap-4">\s*<span class="text-\[#800020\] dark:text-red-400 font-medium">Part 1 of 3<\/span>\s*<button class="text-\[#800020\] dark:text-red-400 hover:text-\[#800020\] dark:hover:text-red-300 transition-colors">/,
    `<div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
            <span class="text-[#800020] dark:text-red-400 font-medium">Part 1 of 3</span>
            <button class="text-[#800020] dark:text-red-400 hover:text-[#800020] dark:hover:text-red-300 transition-colors flex items-center">`
);
html = html.replace(
    /<span class="material-symbols-outlined">menu<\/span>\s*<\/button>\s*<\/div>\s*<!-- Dropdown Menu -->/,
    `<span class="material-symbols-outlined">menu</span>
            </button>
        </div>
    </div>
    <!-- Dropdown Menu -->`
);

// 2. Add captions INSIDE demo-right-column, OUTSIDE canvas-container/apparatus-preview-container
// For previewCanvas (Fig 2)
html = html.replace(
    /<div id="pill-8" class="apparatus-pill" data-tooltip="Subject">8<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/section>\s*<section class="walkthrough-section">/,
    `<div id="pill-8" class="apparatus-pill" data-tooltip="Subject">8</div>
                </div>
                <div class="mt-4 text-center">
                    <span class="text-[#722F37] font-bold text-sm mr-1" style="font-family: 'Newsreader', serif;">Fig. 2:</span>
                    <span class="text-stone-600 text-sm italic" style="font-family: 'Newsreader', serif;">The Parts of Dürer's Apparatus.</span>
                </div>
            </div>
        </div>
    </section>

    <section class="walkthrough-section">`
);

// For walkthroughCanvas (Fig 3)
html = html.replace(
    /<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/section>\s*<section class="demo-section">/,
    `</button>
                </div>
                <div class="mt-4 text-center">
                    <span class="text-[#722F37] font-bold text-sm mr-1" style="font-family: 'Newsreader', serif;">Fig. 3:</span>
                    <span class="text-stone-600 text-sm italic" style="font-family: 'Newsreader', serif;">Step-by-step Operation of the Apparatus.</span>
                </div>
            </div>
        </div>
    </section>

    <section class="demo-section">`
);

// 3. Remove "CC-BY-4.0 License" text from footer and add it to copyright line
html = html.replace(
    /<span>&copy; <a class="hover:text-ink-charcoal transition-colors" href="https:\/\/dipanjansaha\.com">2026 Dipanjan Saha<\/a><\/span>\s*<a href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/" target="_blank" rel="noopener noreferrer" class="text-xs text-stone-400 hover:text-stone-600 transition-colors mt-1">CC-BY-4\.0 License<\/a>/,
    `<span>&copy; <a class="hover:text-ink-charcoal transition-colors" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">2026 Dipanjan Saha</a></span>`
);


fs.writeFileSync('public/index.html', html);
