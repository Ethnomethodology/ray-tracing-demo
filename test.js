const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The gap-4 on the outer div was keeping the menu far from the text. Let's fix that.
// Looking at original navbar
html = html.replace(
    /<div class="flex items-center gap-4">\s*<div class="flex items-center gap-2">/g,
    `<div class="flex items-center relative">
        <div class="flex items-center gap-1">`
);

fs.writeFileSync('public/index.html', html);
