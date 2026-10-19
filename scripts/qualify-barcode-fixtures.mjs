// Bounded synthetic engineering experiment. No application or camera input.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const args = process.argv.slice(2);
if (args[0] !== '--worker') {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--worker', ...args], {
    timeout: 45000, stdio: 'inherit', windowsHide: true,
  });
  if (child.error) console.error(child.error.message);
  process.exit(child.status ?? 1);
}
const [decoderWorkspace, output] = args.slice(1);
if (!decoderWorkspace || !output) throw Error('Usage: node scripts/qualify-barcode-fixtures.mjs <isolated-decoder-workspace> <output-dir>');
const req = createRequire(import.meta.url);
const {JSDOM} = req('jsdom');
const {createCanvas, loadImage} = req('@napi-rs/canvas');
assert.equal(req('jsdom/package.json').version, '30.0.1');
assert.equal(req('@napi-rs/canvas/package.json').version, '1.0.11');
const decoderRequire = createRequire(path.join(path.resolve(decoderWorkspace), 'package.json'));
assert.equal(decoderRequire('@undecaf/zbar-wasm/package.json').version, '0.11.0');
const qualifiedWasm = fs.readFileSync(decoderRequire.resolve('@undecaf/zbar-wasm/dist/zbar.wasm'));
assert.equal(createHash('sha256').update(qualifiedWasm).digest('hex'),
  '438f95e4b5d122c4c2a8da2b72ad19faa4ba4e541f473dcae0371e4cfc8159ee', 'Unqualified decoder WASM bytes');
const {getDefaultScanner, scanRGBABuffer, ZBarSymbolType, ZBarConfigType} = decoderRequire('@undecaf/zbar-wasm');
const bench = fileURLToPath(new URL('./fixtures/barcode-scanner-bench.html', import.meta.url));
const html = fs.readFileSync(bench, 'utf8');
assert.equal(createHash('sha256').update(html).digest('hex'), 'd6379f0f669862fc058af0a3a4e365a7d84b96afa4b33cd7eef3df34b06d6227', 'Unqualified bench bytes');
const dom = new JSDOM(html, {runScripts: 'outside-only'});
const doc = dom.window.document;
const hash = data => createHash('sha256').update(data).digest('hex');
const scripts = [...doc.scripts];
assert.equal(scripts.length, 2);
assert.equal(hash(scripts[0].textContent), 'fce0a5e6129fde04b2e5f8a503b32a3d6d4b0116263c5369336ecccad57bf334', 'Unqualified generator bytes');
// JsBarcode requests a canvas only to measure the visible text. Use a real
// native Canvas 2D context rather than replacing the encoder or its renderer.
dom.window.HTMLCanvasElement.prototype.getContext = function(kind) {
  assert.equal(kind, '2d');
  return createCanvas(this.width || 300, this.height || 150).getContext('2d');
};
let externalCalls = 0;
const denyNetwork = () => {externalCalls++; throw Error('Network is outside this proof');};
dom.window.fetch = denyNetwork;
dom.window.XMLHttpRequest = denyNetwork;
dom.window.WebSocket = denyNetwork;
for (const script of scripts) dom.window.eval(script.textContent);
assert(!fs.existsSync(output) || fs.readdirSync(output).length === 0,
  'Use a new or empty evidence directory; prior results must not be overwritten');
fs.mkdirSync(output, {recursive: true});
const results = [], profiles = [];
const fixtures = [
  {id: 'active', token: 'TESTHU-00A17B29', resolution: 'Active fixture resolved'},
  {id: 'retired', token: 'TESTHU-00C23D45', resolution: 'Retired fixture'},
  {id: 'zeros', token: 'TESTHU-00000000', resolution: 'Unknown fixture'},
  {id: 'case-control', token: 'TESTHU-00a17b29', resolution: 'Invalid input'},
];
const ns = 'http://www.w3.org/2000/svg';
let scanner;
async function inspectSvg(svg, id, expected, profile) {
  const source = svg.outerHTML;
  const dimension = name => {
    const value = svg.getAttribute(name);
    assert(/^\d+(?:px)?$/.test(value), 'Unexpected SVG dimension: ' + value);
    return Number.parseInt(value, 10);
  };
  const width = dimension('width');
  const height = dimension('height');
  assert(Number.isInteger(width) && Number.isInteger(height));
  assert(width > 0 && height > 0 && width * height <= 2000000, 'Unbounded synthetic raster');
  const image = await loadImage(Buffer.from(source));
  const canvas = createCanvas(width, height), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  assert.equal(pixels.length, width * height * 4);
  for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255, 'Non-opaque raster');
  const exactBuffer = pixels.buffer.slice(pixels.byteOffset, pixels.byteOffset + pixels.byteLength);
  const symbols = await scanRGBABuffer(exactBuffer, width, height, scanner);
  assert.equal(symbols.length, 1, id + ': expected exactly one Code 128 symbol');
  assert.equal(symbols[0].type, ZBarSymbolType.ZBAR_CODE128);
  const actual = symbols[0].decode();
  assert.equal(actual, expected, id + ': token mismatch');
  const svgPath = path.join(output, id + '.svg'), pngPath = path.join(output, id + '.png');
  const png = canvas.toBuffer('image/png');
  fs.writeFileSync(svgPath, source); fs.writeFileSync(pngPath, png);
  const rects = [...svg.querySelectorAll('g rect')];
  assert(rects.length > 0);
  const group = svg.querySelector('g');
  const translate = group.getAttribute('transform').match(/^translate\((\d+),\s*(\d+)\)$/);
  assert(translate, 'Unexpected renderer transform');
  const leftQuiet = Number(translate[1]);
  const endBars = Math.max(...rects.map(r => Number(r.getAttribute('x')) + Number(r.getAttribute('width'))));
  const rightQuiet = width - leftQuiet - endBars;
  const x = Math.min(...rects.map(r => Number(r.getAttribute('width'))));
  const modules = endBars / x;
  assert(Number.isInteger(modules));
  assert(leftQuiet >= 10 * x && rightQuiet >= 10 * x, 'Quiet zone below experiment profile');
  results.push({id, expected, actual, format: 'CODE128', passed: true, width, height,
    svgSha256: hash(source), pngSha256: hash(png), xDots: x, barModules: modules,
    quietZoneDots: {left: leftQuiet, right: rightQuiet}, profile});
  return {width, height, xDots: x, barModules: modules, leftQuiet, rightQuiet};
}
function resolve(token) {
  const input = doc.querySelector('#scan');
  input.value = token;
  input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
  assert.equal(doc.querySelector('#mutations').textContent, '0');
  return doc.querySelector('#outcome').textContent;
}
(async () => {
  try {
    scanner = await getDefaultScanner();
    assert.equal(scanner.setConfig(ZBarSymbolType.ZBAR_NONE, ZBarConfigType.ZBAR_CFG_ENABLE, 0), 0);
    assert.equal(scanner.setConfig(ZBarSymbolType.ZBAR_CODE128, ZBarConfigType.ZBAR_CFG_ENABLE, 1), 0);
    for (const fixture of fixtures.slice(0, 2)) {
      await inspectSvg(doc.querySelector('#' + fixture.id + '-code'), 'bench-' + fixture.id, fixture.token, 'Uncalibrated existing browser fixture');
    }
    for (const fixture of fixtures) for (const dpi of [203, 300]) for (const dots of [1, 2, 3]) {
      const svg = doc.createElementNS(ns, 'svg');
      const options = {format: 'CODE128', width: dots, height: Math.round(dpi * 0.5),
        margin: 10 * dots, displayValue: true, fontSize: 14};
      dom.window.JsBarcode(svg, fixture.token, options);
      const id = fixture.id + '-' + dpi + 'dpi-' + dots + 'dot';
      const measured = await inspectSvg(svg, id, fixture.token, {dpi, dots, options, physicalPrintVerified: false});
      assert.equal(resolve(fixture.token), fixture.resolution);
      profiles.push({id, token: fixture.token, dpi, xDots: dots, xMm: dots / dpi * 25.4,
        symbolWithQuietZonesMm: measured.width / dpi * 25.4,
        totalHeightMm: measured.height / dpi * 25.4, barModules: measured.barModules,
        physicalPrintVerified: false, rangeVerified: false});
    }
    // Blank opaque rasters at both printer profiles must produce zero symbols.
    for (const dpi of [203, 300]) {
      const canvas = createCanvas(600, 160), ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 160);
      const p = ctx.getImageData(0, 0, 600, 160).data;
      const symbols = await scanRGBABuffer(p.buffer.slice(p.byteOffset, p.byteOffset + p.byteLength), 600, 160, scanner);
      assert.equal(symbols.length, 0);
      results.push({id: 'blank-control-' + dpi, expected: 'No symbols', actual: 'No symbols', passed: true});
    }
    assert.equal(resolve('https://example.invalid/'), 'Invalid input');
    assert.equal(resolve('TESTHU-00A17B29TESTHU-00A17B29'), 'Invalid input');
    assert.equal(externalCalls, 0);
    const report = {status: 'passed', observedAt: new Date().toISOString(), node: process.versions.node, platform: process.platform,
      generator: {name: 'JsBarcode', version: '3.11.6', sha256: hash(scripts[0].textContent)},
      renderer: {name: '@napi-rs/canvas', version: req('@napi-rs/canvas/package.json').version},
      dom: {name: 'jsdom', version: req('jsdom/package.json').version},
      decoder: {name: '@undecaf/zbar-wasm', version: '0.11.0', declaredNativeBaseline: '0.23.90',
        wasmSha256: hash(fs.readFileSync(decoderRequire.resolve('@undecaf/zbar-wasm/dist/zbar.wasm')))},
      benchSha256: hash(html), positiveDecodes: results.filter(r => r.format).length,
      blankControls: results.filter(r => !r.format).length, results, profiles,
      externalCalls, businessMutations: 0, physicalPrintVerified: false, androidInputVerified: false,
      rangeVerified: false, cloudIntegration: false, applicationDependencyAdopted: false};
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({positiveDecodes: report.positiveDecodes, blankControls: report.blankControls,
      externalCalls, businessMutations: 0, output, profiles: profiles.filter(p => p.token === fixtures[0].token)}, null, 2));
  } finally {
    if (scanner) scanner.destroy();
    dom.window.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
