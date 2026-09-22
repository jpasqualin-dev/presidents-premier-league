const fs = require('node:fs');
const path = require('node:path');

const roots = ['api', 'lib', 'public', 'scripts', 'test'];
const files = [];

function collect(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) collect(fullPath);
        else if (entry.isFile() && fullPath.endsWith('.js')) files.push(fullPath);
    }
}

roots.forEach(collect);
files.sort().forEach(file => {
    const source = fs.readFileSync(file, 'utf8');
    require('node:child_process').execFileSync(process.execPath, ['--input-type=module', '--check'], { input: source, stdio: ['pipe', 'inherit', 'inherit'] });
});
console.log(`Checked ${files.length} JavaScript files.`);
