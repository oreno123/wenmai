"""Rasterize a bronze GLB's COLOR_0 semantic annotations into its UV space.

Bronze cannot use the Qinghua cobalt detector: patina and relief share the same
olive/brown texture range. The scanning pipeline already bakes motif IDs into each
vertex's COLOR_0.r channel, so this produces an exact texture-space hit map from the
model geometry itself.
"""
import argparse
import json
import struct
from pathlib import Path

from PIL import Image, ImageDraw


COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
FORMATS = {5121: ("B", 1), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}


def glb(path: Path):
    data = path.read_bytes()
    json_length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + json_length].decode('utf-8').rstrip(' \0'))
    binary_start = 20 + json_length
    binary_length = struct.unpack_from('<I', data, binary_start)[0]
    return doc, data[binary_start + 8:binary_start + 8 + binary_length]


def accessor(doc, binary, index):
    access = doc['accessors'][index]
    view = doc['bufferViews'][access['bufferView']]
    fmt, size = FORMATS[access['componentType']]
    width = COMPONENTS[access['type']]
    stride = view.get('byteStride', size * width)
    offset = view.get('byteOffset', 0) + access.get('byteOffset', 0)
    unpack = struct.Struct('<' + fmt * width).unpack_from
    return [unpack(binary, offset + item * stride) for item in range(access['count'])]


def build(model: Path, output: Path, size: int, max_id: int | None):
    doc, binary = glb(model)
    primitive = doc['meshes'][0]['primitives'][0]
    attrs = primitive['attributes']
    if 'COLOR_0' not in attrs or 'TEXCOORD_0' not in attrs:
        raise RuntimeError('GLB has no baked COLOR_0 / TEXCOORD_0 motif annotations')
    uvs = accessor(doc, binary, attrs['TEXCOORD_0'])
    colors = accessor(doc, binary, attrs['COLOR_0'])
    indices = accessor(doc, binary, primitive['indices'])
    canvas = Image.new('L', (size, size))
    draw = ImageDraw.Draw(canvas)
    written = set()
    for start in range(0, len(indices), 3):
        triangle = [indices[start + offset][0] for offset in range(3)]
        ids = [int(colors[vertex][0]) - 1 for vertex in triangle]
        if min(ids) < 0 or len(set(ids)) != 1:
            continue
        motif = ids[0] + 1
        if max_id is not None and motif > max_id:
            continue
        points = [(round(uvs[vertex][0] * (size - 1)), round((1 - uvs[vertex][1]) * (size - 1))) for vertex in triangle]
        draw.polygon(points, fill=motif)
        written.add(motif)
    if not written:
        raise RuntimeError('No complete motif triangles found in COLOR_0')
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)
    print(f'{model.parent.name}: {len(written)} annotated motif IDs → {output.name}')


parser = argparse.ArgumentParser()
parser.add_argument('model', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--size', type=int, default=1024)
parser.add_argument('--max-id', type=int, default=None, help='keep only motif IDs backed by the manifest')
args = parser.parse_args()
build(args.model, args.output, args.size, args.max_id)
