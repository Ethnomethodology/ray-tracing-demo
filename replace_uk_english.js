const fs = require('fs');
const files = ['index.html', 'part2/index.html', 'part3/index.html'];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    let original = content;

    // Safe replacements that don't conflict with CSS/HTML (mostly)
    content = content.replace(/\bbehavior\b/g, 'behaviour');
    content = content.replace(/\bBehavior\b/g, 'Behaviour');
    content = content.replace(/\bbehaviors\b/g, 'behaviours');
    content = content.replace(/\bBehaviors\b/g, 'Behaviours');
    
    content = content.replace(/\bmodeled\b/g, 'modelled');
    content = content.replace(/\bModeled\b/g, 'Modelled');
    content = content.replace(/\bmodeling\b/g, 'modelling');
    content = content.replace(/\bModeling\b/g, 'Modelling');
    
    content = content.replace(/\brealize\b/g, 'realise');
    content = content.replace(/\bRealize\b/g, 'Realise');
    content = content.replace(/\brealized\b/g, 'realised');
    content = content.replace(/\bRealized\b/g, 'Realised');
    content = content.replace(/\brealizing\b/g, 'realising');
    content = content.replace(/\bRealizing\b/g, 'Realising');

    content = content.replace(/\banalyze\b/g, 'analyse');
    content = content.replace(/\bAnalyze\b/g, 'Analyse');
    content = content.replace(/\banalyzed\b/g, 'analysed');
    content = content.replace(/\bAnalyzed\b/g, 'Analysed');
    content = content.replace(/\banalyzing\b/g, 'analysing');
    content = content.replace(/\bAnalyzing\b/g, 'Analysing');

    content = content.replace(/\bdefense\b/g, 'defence');
    content = content.replace(/\bDefense\b/g, 'Defence');

    // color -> colour. Negative lookbehinds and lookaheads to avoid CSS/HTML
    // Avoid: background-color, transition-colors, color:, color="
    // We can use a regex that matches "color" not preceded by "-" and not followed by ":" or "=" or "s-"
    content = content.replace(/(?<!-)\bcolor\b(?![:=-])/g, 'colour');
    content = content.replace(/(?<!-)\bColor\b(?![:=-])/g, 'Colour');
    content = content.replace(/(?<!-)\bcolors\b(?![:=-])/g, 'colours');
    content = content.replace(/(?<!-)\bColors\b(?![:=-])/g, 'Colours');

    // center -> centre. 
    // Avoid: text-center, align-items: center, justify-content: center, <center>
    // Negative lookbehind for "-" or ": " or "<" or "/"
    // Negative lookahead for ">" or ";"
    content = content.replace(/(?<![-:<+\/])\bcenter\b(?![:;>=-])/g, 'centre');
    content = content.replace(/(?<![-:<+\/])\bCenter\b(?![:;>=-])/g, 'Centre');
    content = content.replace(/(?<![-:<+\/])\bcentered\b(?![:;>=-])/g, 'centred');
    content = content.replace(/(?<![-:<+\/])\bCentered\b(?![:;>=-])/g, 'Centred');
    content = content.replace(/(?<![-:<+\/])\bcenters\b(?![:;>=-])/g, 'centres');
    content = content.replace(/(?<![-:<+\/])\bCenters\b(?![:;>=-])/g, 'Centres');
    content = content.replace(/(?<![-:<+\/])\bcentering\b(?![:;>=-])/g, 'centring');

    if (original !== content) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
