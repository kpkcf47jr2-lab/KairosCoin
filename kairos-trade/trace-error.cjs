const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

async function trace() {
  const mapFile = 'dist/assets/index-DPT9_U4D.js.map';
  const raw = fs.readFileSync(mapFile, 'utf8');
  const consumer = await new SourceMapConsumer(JSON.parse(raw));

  // From the screenshot error:
  // Component Stack: Tx@index-DPT9_U4D.js:221:4302, Bx@index-DPT9_U4D.js:226:102
  // Error Stack: Tx@index-DPT9_U4D.js:221:6727
  const positions = [
    { label: 'Tx component (App) - component stack', line: 221, column: 4302 },
    { label: 'Bx (GlobalErrorBoundary) - component stack', line: 226, column: 102 },
    { label: 'Tx error throw - error stack', line: 221, column: 6727 },
  ];

  for (const pos of positions) {
    const orig = consumer.originalPositionFor({ line: pos.line, column: pos.column });
    console.log('---', pos.label, '---');
    console.log('  Minified: L' + pos.line + ':' + pos.column);
    console.log('  Original:', orig.source, 'L' + orig.line + ':' + orig.column);
    console.log('  Name:', orig.name);
  }

  // Scan around the error throw location for more context
  console.log('\n=== Scanning around L221:4302 (component) ===');
  for (let col = 4280; col <= 4330; col += 2) {
    const orig = consumer.originalPositionFor({ line: 221, column: col });
    if (orig.source && orig.line) {
      console.log('  Col', col, '->', orig.source, 'L' + orig.line + ':' + orig.column, orig.name || '');
    }
  }

  console.log('\n=== Scanning around L221:6727 (error throw) ===');
  for (let col = 6700; col <= 6760; col += 2) {
    const orig = consumer.originalPositionFor({ line: 221, column: col });
    if (orig.source && orig.line) {
      console.log('  Col', col, '->', orig.source, 'L' + orig.line + ':' + orig.column, orig.name || '');
    }
  }

  // Also check vendor positions from error stack
  console.log('\n=== Checking vendor positions ===');
  const vendorMap = 'dist/assets/vendor-4OCfwR-l.js.map';
  const vendorRaw = fs.readFileSync(vendorMap, 'utf8');
  const vendorConsumer = await new SourceMapConsumer(JSON.parse(vendorRaw));
  
  const vendorPositions = [
    { label: 'Te (react-dom)', line: 22, column: 17570 },
    { label: 'el (react-dom)', line: 22, column: 20491 },
    { label: 'Du (react-dom)', line: 22, column: 16992 },
  ];

  for (const pos of vendorPositions) {
    const orig = vendorConsumer.originalPositionFor({ line: pos.line, column: pos.column });
    console.log('---', pos.label, '---');
    console.log('  Original:', orig.source, 'L' + orig.line + ':' + orig.column, orig.name || '');
  }

  consumer.destroy();
  vendorConsumer.destroy();
}

trace().catch(console.error);
