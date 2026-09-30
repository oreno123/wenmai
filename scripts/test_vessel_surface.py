"""Geometry/texture regressions using a synthetic two-colour cylinder."""
import json
import struct
import tempfile
import unittest
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

from vessel_surface import atlas_labels, unwrap
from extract_qinghua_patterns import ink_alpha


def cylinder(path):
    positions, uv, indices = [], [], []
    segments = 48
    for y in (0, .5, 1):
        for i in range(segments+1):
            a = i / segments * 2*np.pi
            positions.append([np.cos(a), y, np.sin(a)])
            uv.append([i/segments, 1-y])
    for ring in range(2):
        for i in range(segments):
            a = ring*(segments+1)+i
            b = a+segments+1
            indices.extend([a, a+1, b, a+1, b+1, b])
    tex = np.zeros((128, 128, 3), np.uint8)
    tex[:64] = [220, 30, 30]
    tex[64:] = [30, 30, 220]
    image = BytesIO()
    Image.fromarray(tex).save(image, format='PNG')
    chunks = [np.array(positions, '<f4').tobytes(), np.array(uv, '<f4').tobytes(),
              np.array(indices, '<u4').tobytes(), image.getvalue()]
    binary, views = bytearray(), []
    for chunk in chunks:
        views.append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(chunk)})
        binary.extend(chunk)
        binary.extend(b'\0' * (-len(binary) % 4))
    doc = {'asset': {'version': '2.0'}, 'nodes': [{'mesh': 0}], 'bufferViews': views,
           'buffers': [{'byteLength': len(binary)}], 'accessors': [
               {'bufferView': 0, 'componentType': 5126, 'count': len(positions), 'type': 'VEC3'},
               {'bufferView': 1, 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'},
               {'bufferView': 2, 'componentType': 5125, 'count': len(indices), 'type': 'SCALAR'}],
           'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'TEXCOORD_0': 1}, 'indices': 2}]}],
           'materials': [{'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}}}],
           'textures': [{'source': 0}], 'images': [{'bufferView': 3, 'mimeType': 'image/png'}]}
    data = json.dumps(doc).encode()
    data += b' ' * (-len(data) % 4)
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, 28+len(data)+len(binary)) +
                     struct.pack('<II', len(data), 0x4E4F534A) + data +
                     struct.pack('<II', len(binary), 0x004E4942) + binary)


class SurfaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.model = Path(self.temp.name) / 'test.glb'
        cylinder(self.model)

    def test_gltf_texture_top_left_and_angle_seam(self):
        rgb, valid, _ = unwrap(self.model, 192, 128)
        self.assertGreater(valid.mean(), .99)
        for x in (0, 96, 191):
            np.testing.assert_allclose(rgb[20, x], [220, 30, 30], atol=2)
            np.testing.assert_allclose(rgb[100, x], [30, 30, 220], atol=2)

    def test_surface_labels_round_trip_to_existing_picker(self):
        _, _, geometry = unwrap(self.model, 192, 128)
        labels = np.zeros((128, 192), np.uint8)
        labels[10:50] = 1
        labels[80:120] = 2
        mask = atlas_labels(labels, geometry, size=128)
        # Browser's picker samples (u, 1-v), so v=.2 is near row .8.
        self.assertEqual(mask[int(.8*128), 64], 1)
        self.assertEqual(mask[int(.2*128), 64], 2)
        self.assertEqual(mask[64, 64], 0)

    def test_thin_stem_survives_and_isolated_speck_is_rejected(self):
        rgb = np.full((64, 64, 3), [230, 226, 214], np.uint8)
        rgb[10:50, 30] = [65, 90, 130]
        rgb[3, 3] = [65, 90, 130]
        mask = ink_alpha(rgb, np.ones((64, 64), bool))
        self.assertGreater(mask[30, 30], 128)
        self.assertEqual(mask[3, 3], 0)
        self.assertEqual(mask[30, 40], 0)


if __name__ == '__main__':
    unittest.main()
