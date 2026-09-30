import fs from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

const [input, output, ratioText = '0.12'] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node scripts/simplify_glb_mesh.mjs INPUT OUTPUT [ratio]');

const align4 = (bytes) => {
  const pad = (4 - bytes.length % 4) % 4;
  return pad ? Buffer.concat([bytes, Buffer.alloc(pad)]) : bytes;
};
const alignJson4 = (bytes) => {
  const pad = (4 - bytes.length % 4) % 4;
  return pad ? Buffer.concat([bytes, Buffer.alloc(pad, 0x20)]) : bytes;
};
const read = (path) => {
  const data = fs.readFileSync(path);
  if (data.toString('ascii', 0, 4) !== 'glTF') throw new Error('Expected GLB');
  const jsonLength = data.readUInt32LE(12);
  const json = JSON.parse(data.toString('utf8', 20, 20 + jsonLength).replace(/[\0\s]+$/g, ''));
  const binStart = 20 + jsonLength + 8;
  return { json, bin: data.subarray(binStart) };
};
const write = (outputPath, json, bin) => {
  const jsonChunk = alignJson4(Buffer.from(JSON.stringify(json)));
  const binChunk = align4(bin);
  const head = Buffer.alloc(12);
  head.write('glTF'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  const jsonHead = Buffer.alloc(8); jsonHead.writeUInt32LE(jsonChunk.length, 0); jsonHead.writeUInt32LE(0x4e4f534a, 4);
  const binHead = Buffer.alloc(8); binHead.writeUInt32LE(binChunk.length, 0); binHead.writeUInt32LE(0x004e4942, 4);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.concat([head, jsonHead, jsonChunk, binHead, binChunk]));
};
const copyFloat = (bin, view, count, width) => {
  const offset = view.byteOffset ?? 0;
  return new Float32Array(bin.buffer, bin.byteOffset + offset, count * width).slice();
};
const copyIndices = (bin, view, count) => {
  const offset = view.byteOffset ?? 0;
  return new Uint32Array(bin.buffer, bin.byteOffset + offset, count).slice();
};

const { json, bin } = read(input);
const primitive = json.meshes?.[0]?.primitives?.[0];
if (!primitive || (primitive.mode !== undefined && primitive.mode !== 4)) throw new Error('Expected one triangle primitive');
const posAccessor = json.accessors[primitive.attributes.POSITION];
const normalAccessor = json.accessors[primitive.attributes.NORMAL];
const uvAccessor = json.accessors[primitive.attributes.TEXCOORD_0];
const indexAccessor = json.accessors[primitive.indices];
if ([posAccessor, normalAccessor, uvAccessor].some(a => a.componentType !== 5126) || indexAccessor.componentType !== 5125) throw new Error('Expected float attributes and uint32 indices');
const posViewIndex = posAccessor.bufferView, normalViewIndex = normalAccessor.bufferView, uvViewIndex = uvAccessor.bufferView, indexViewIndex = indexAccessor.bufferView;
const positions = copyFloat(bin, json.bufferViews[posViewIndex], posAccessor.count, 3);
const normals = copyFloat(bin, json.bufferViews[normalViewIndex], normalAccessor.count, 3);
const uvs = copyFloat(bin, json.bufferViews[uvViewIndex], uvAccessor.count, 2);
const indices = copyIndices(bin, json.bufferViews[indexViewIndex], indexAccessor.count);
const attributes = new Float32Array(posAccessor.count * 5);
for (let i = 0; i < posAccessor.count; i++) attributes.set([...normals.subarray(i * 3, i * 3 + 3), ...uvs.subarray(i * 2, i * 2 + 2)], i * 5);
await MeshoptSimplifier.ready;
const ratio = Math.max(0.04, Math.min(0.5, Number(ratioText)));
const [simplified] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, attributes, 5, [0.35, 0.35, 0.35, 1, 1], null, Math.max(3, Math.floor(indices.length * ratio / 3) * 3), 0.015, ['LockBorder']);
const originals = [...new Set(simplified)].sort((a, b) => a - b);
const remap = new Map(originals.map((oldIndex, newIndex) => [oldIndex, newIndex]));
const nextPos = new Float32Array(originals.length * 3), nextNormal = new Float32Array(originals.length * 3), nextUv = new Float32Array(originals.length * 2), nextIndex = new Uint32Array(simplified.length);
originals.forEach((oldIndex, newIndex) => { nextPos.set(positions.subarray(oldIndex * 3, oldIndex * 3 + 3), newIndex * 3); nextNormal.set(normals.subarray(oldIndex * 3, oldIndex * 3 + 3), newIndex * 3); nextUv.set(uvs.subarray(oldIndex * 2, oldIndex * 2 + 2), newIndex * 2); });
simplified.forEach((oldIndex, index) => { nextIndex[index] = remap.get(oldIndex); });
const replacements = new Map([[posViewIndex, Buffer.from(nextPos.buffer)], [normalViewIndex, Buffer.from(nextNormal.buffer)], [uvViewIndex, Buffer.from(nextUv.buffer)], [indexViewIndex, Buffer.from(nextIndex.buffer)]]);
const rebuilt = []; let offset = 0;
json.bufferViews = json.bufferViews.map((view, index) => { const raw = replacements.get(index) ?? bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength); const next = { ...view, byteOffset: offset, byteLength: raw.length }; rebuilt.push(raw); offset += align4(raw).length; return next; });
json.buffers = [{ byteLength: offset }];
posAccessor.count = normalAccessor.count = uvAccessor.count = originals.length; indexAccessor.count = nextIndex.length;
posAccessor.min = [Infinity, Infinity, Infinity];
posAccessor.max = [-Infinity, -Infinity, -Infinity];
for (const oldIndex of originals) {
  for (let axis = 0; axis < 3; axis++) {
    const value = positions[oldIndex * 3 + axis];
    posAccessor.min[axis] = Math.min(posAccessor.min[axis], value);
    posAccessor.max[axis] = Math.max(posAccessor.max[axis], value);
  }
}
write(output, json, Buffer.concat(rebuilt.map(align4)));
console.log(`${input}: ${indices.length / 3 | 0} triangles -> ${nextIndex.length / 3 | 0}; ${fs.statSync(input).size / 1024 / 1024 | 0}MB -> ${fs.statSync(output).size / 1024 / 1024 | 0}MB`);
