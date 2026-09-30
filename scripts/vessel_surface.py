"""Bake a rotational vessel's actual GLB surface into angle/height coordinates.

Texture atlas islands are not image regions. Interpolate mesh UVs on the surface
first, retaining the outermost radius where an inner wall overlaps the body.
"""
import json
import struct
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def read_model(path):
    data = Path(path).read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + length].rstrip(b'\0 '))
    binary = data[28 + length:]

    def access(index):
        a = doc['accessors'][index]
        v = doc['bufferViews'][a['bufferView']]
        dtype = np.dtype({5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']])
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        return np.ndarray((a['count'], width), dtype=dtype, buffer=binary,
                          offset=v.get('byteOffset', 0) + a.get('byteOffset', 0),
                          strides=(v.get('byteStride', dtype.itemsize * width), dtype.itemsize)).copy()

    # Current captured vessels each have one mesh. Fail closed for unsupported
    # hierarchies rather than silently extracting a different mesh/material.
    nodes = [n for n in doc['nodes'] if 'mesh' in n]
    if len(nodes) != 1 or any(n.get('children') for n in doc['nodes']):
        raise ValueError('Expected one unparented vessel mesh')
    node = nodes[0]
    primitives = doc['meshes'][node['mesh']]['primitives']
    if len(primitives) != 1:
        raise ValueError('Expected one material primitive')
    p = primitives[0]
    xyz = access(p['attributes']['POSITION']).astype(np.float64)
    if 'matrix' in node:
        matrix = np.array(node['matrix']).reshape(4, 4).T
        xyz = (np.c_[xyz, np.ones(len(xyz))] @ matrix.T)[:, :3]
    else:
        x, y, z, w = node.get('rotation', [0, 0, 0, 1])
        rotation = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                             [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                             [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
        xyz = (xyz * node.get('scale', [1, 1, 1])) @ rotation.T + node.get('translation', [0, 0, 0])
    uv = access(p['attributes']['TEXCOORD_0']).astype(np.float64)
    triangles = access(p['indices']).reshape(-1, 3)
    mat = doc['materials'][p.get('material', 0)]['pbrMetallicRoughness']
    tex = mat['baseColorTexture']
    if tex.get('extensions') or tex.get('texCoord', 0) != 0:
        raise ValueError('Texture transform/alternate UV needs explicit handling')
    img = doc['images'][doc['textures'][tex['index']]['source']]
    view = doc['bufferViews'][img['bufferView']]
    offset = view.get('byteOffset', 0)
    texture = np.asarray(Image.open(BytesIO(binary[offset:offset + view['byteLength']])).convert('RGB'))
    return xyz, uv, triangles, texture


def pixels(points, width, height):
    """Pixel centres and barycentric weights inside a triangle."""
    lo = np.maximum(np.floor(points.min(axis=0)).astype(int), 0)
    hi = np.minimum(np.ceil(points.max(axis=0)).astype(int), [width-1, height-1])
    if np.any(hi < lo):
        return None
    a, b, c = points
    den = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
    if abs(den) < 1e-9:
        return None
    yy, xx = np.mgrid[lo[1]:hi[1]+1, lo[0]:hi[0]+1]
    u = ((b[1]-c[1])*(xx+.5-c[0]) + (c[0]-b[0])*(yy+.5-c[1])) / den
    v = ((c[1]-a[1])*(xx+.5-c[0]) + (a[0]-c[0])*(yy+.5-c[1])) / den
    w = 1-u-v
    inside = (u >= -1e-6) & (v >= -1e-6) & (w >= -1e-6)
    return xx[inside], yy[inside], np.stack([u[inside], v[inside], w[inside]], axis=1)


def surface_coordinates(xyz):
    center = (xyz.min(axis=0) + xyz.max(axis=0)) / 2
    delta = xyz - center
    radius = np.hypot(delta[:, 0], delta[:, 2])
    angle = (np.arctan2(delta[:, 2], delta[:, 0]) / (2*np.pi)) % 1
    height = (xyz[:, 1].max() - xyz[:, 1]) / np.ptp(xyz[:, 1])
    return np.c_[angle, height], radius


def unwrap(model, width=2400, height=1600):
    xyz, uv, triangles, texture = read_model(model)
    coords, radius = surface_coordinates(xyz)
    depth = np.full((height, width), -np.inf, dtype=np.float32)
    map_u = np.full((height, width), -1, dtype=np.float32)
    map_v = map_u.copy()
    for tri in triangles:
        q = coords[tri].copy()
        if np.ptp(q[:, 0]) > .5:
            q[q[:, 0] < .5, 0] += 1
        for shift in ([0, -1] if q[:, 0].max() > 1 else [0]):
            result = pixels((q + [shift, 0]) * [width, height], width, height)
            if result is None:
                continue
            xx, yy, weights = result
            r = weights @ radius[tri]
            keep = r > depth[yy, xx]
            xx, yy, weights, r = xx[keep], yy[keep], weights[keep], r[keep]
            texcoords = weights @ uv[tri]
            depth[yy, xx] = r
            map_u[yy, xx] = texcoords[:, 0]
            map_v[yy, xx] = texcoords[:, 1]
    # glTF's texture origin is top-left (GLTFLoader uses flipY=false).
    baked = cv2.remap(texture, map_u * texture.shape[1] - .5, map_v * texture.shape[0] - .5,
                      cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    valid = np.isfinite(depth)
    baked[~valid] = [240, 237, 224]
    return baked, valid, (xyz, uv, triangles, coords, radius, depth)


def atlas_labels(labels, geometry, size=2048):
    """Back-project surface labels into mesh UV; retain existing picker orientation."""
    xyz, uv, triangles, coords, radius, depth = geometry
    height, width = labels.shape
    result = np.zeros((size, size), np.uint8)
    for tri in triangles:
        hit = pixels(uv[tri] * size, size, size)
        if hit is None:
            continue
        xx, yy, weights = hit
        q = coords[tri].copy()
        if np.ptp(q[:, 0]) > .5:
            q[q[:, 0] < .5, 0] += 1
        surface = weights @ q
        sx = np.floor(surface[:, 0] * width).astype(int) % width
        sy = np.clip((surface[:, 1] * height).astype(int), 0, height-1)
        outer = (weights @ radius[tri]) >= depth[sy, sx] - np.ptp(xyz, axis=0).max() * .012
        result[yy[outer], xx[outer]] = labels[sy[outer], sx[outer]]
    # RelicPage samples 1 - hit.uv.y, including the historic bronze assets.
    return np.flipud(result)
