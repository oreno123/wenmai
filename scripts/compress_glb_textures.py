"""Compress embedded GLB textures without changing the mesh or source file."""
import argparse
import json
import struct
from io import BytesIO
from pathlib import Path

from PIL import Image


def read_glb(path: Path):
    data = path.read_bytes()
    magic, version, total = struct.unpack_from('<4sII', data, 0)
    if magic != b'glTF' or version != 2 or total != len(data):
        raise ValueError(f'{path} is not a valid glTF 2.0 binary')
    json_length, json_type = struct.unpack_from('<II', data, 12)
    if json_type != 0x4E4F534A:
        raise ValueError('missing JSON chunk')
    start = 20 + json_length
    bin_length, bin_type = struct.unpack_from('<II', data, start)
    if bin_type != 0x004E4942:
        raise ValueError('missing BIN chunk')
    gltf = json.loads(data[20:start].decode('utf-8').rstrip(' \0'))
    return gltf, data[start + 8:start + 8 + bin_length]


def pad4(data: bytes):
    return data + b'\0' * ((4 - len(data) % 4) % 4)


def image_bytes(blob: bytes, max_size: int):
    image = Image.open(BytesIO(blob)).convert('RGB')
    image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(output, 'JPEG', quality=88, optimize=True, progressive=True)
    return output.getvalue(), image.copy()


def compress(source: Path, target: Path, max_size: int = 2048):
    gltf, binary = read_glb(source)
    image_views = {image['bufferView']: index for index, image in enumerate(gltf.get('images', []))}
    rebuilt = bytearray()
    views = []
    previews = {}
    for index, view in enumerate(gltf.get('bufferViews', [])):
        start = view.get('byteOffset', 0)
        raw = binary[start:start + view['byteLength']]
        next_view = {key: value for key, value in view.items() if key not in ('byteOffset', 'byteLength')}
        if index in image_views:
            raw, preview = image_bytes(raw, max_size)
            previews[image_views[index]] = preview
        offset = len(rebuilt)
        rebuilt.extend(raw)
        rebuilt.extend(b'\0' * ((4 - len(rebuilt) % 4) % 4))
        next_view['byteOffset'] = offset
        next_view['byteLength'] = len(raw)
        views.append(next_view)
    gltf['bufferViews'] = views
    gltf['buffers'] = [{'byteLength': len(rebuilt)}]
    for image in gltf.get('images', []):
        image['mimeType'] = 'image/jpeg'
    json_data = pad4(json.dumps(gltf, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
    bin_data = pad4(bytes(rebuilt))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(json_data) + 8 + len(bin_data)) + struct.pack('<II', len(json_data), 0x4E4F534A) + json_data + struct.pack('<II', len(bin_data), 0x004E4942) + bin_data)
    base_index = gltf.get('materials', [{}])[0].get('pbrMetallicRoughness', {}).get('baseColorTexture', {}).get('index', 0)
    if base_index in previews:
        previews[base_index].save(target.parent / 'texture.jpg', 'JPEG', quality=92, optimize=True)
        previews[base_index].thumbnail((720, 720), Image.Resampling.LANCZOS)
        previews[base_index].save(target.parent / 'thumb.jpg', 'JPEG', quality=86, optimize=True)
    print(f'{source.name}: {source.stat().st_size // 1024 // 1024}MB -> {target.stat().st_size // 1024 // 1024}MB')


def check(path: Path):
    gltf, _ = read_glb(path)
    print(f'{path}: valid GLB, meshes={len(gltf.get("meshes", []))}, textures={len(gltf.get("textures", []))}, animations={len(gltf.get("animations", []))}')


parser = argparse.ArgumentParser()
parser.add_argument('paths', nargs='+', type=Path)
parser.add_argument('--check', action='store_true')
parser.add_argument('--max-size', type=int, default=2048)
args = parser.parse_args()
if args.check:
    for model in args.paths:
        check(model)
elif len(args.paths) == 2:
    compress(args.paths[0], args.paths[1], args.max_size)
else:
    parser.error('provide INPUT OUTPUT, or --check MODEL [...]')
