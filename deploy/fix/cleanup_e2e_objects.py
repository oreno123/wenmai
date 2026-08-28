# -*- coding: utf-8 -*-
# 逐文件夹列出 works 桶内文件，删掉非 oreno 的（Storage API）
import json, urllib.request

BASE = 'https://wenmai-api.ruoziqing.cn'
ORENO = '7c8855e2-9b59-4224-a96a-31873fed28c1'

env = {}
for line in open('/home/ubuntu/wenmai-deploy/.env'):
    line = line.strip()
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()
SR = env['SERVICE_ROLE_KEY']
H = {'apikey': SR, 'Authorization': 'Bearer ' + SR, 'Content-Type': 'application/json'}

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=H)
    with urllib.request.urlopen(r) as resp:
        return resp.status, resp.read()

def ls(prefix):
    st, raw = call('POST', '/storage/v1/object/list/works',
                   {'prefix': prefix, 'limit': 100, 'offset': 0,
                    'sortBy': {'column': 'name', 'order': 'asc'}})
    return json.loads(raw)

roots = ls('')
targets = []
for entry in roots:
    name = entry.get('name', '')
    if name.startswith(ORENO):
        continue
    if entry.get('id') is None and not name.endswith('.png'):
        # 文件夹：递归一层
        for f in ls(name + '/'):
            if f.get('id') is not None:
                targets.append(name + '/' + f['name'])
    elif entry.get('id') is not None:
        targets.append(name)

print('deleting files:', len(targets))
for t in targets:
    print(' -', t[:60])
if targets:
    st, raw = call('DELETE', '/storage/v1/object/works', {'prefixes': targets})
    print('batch delete:', st, raw[:200])

left = 0
for entry in ls(''):
    if entry.get('id') is None:
        left += len([f for f in ls(entry.get('name', '') + '/') if f.get('id') is not None])
    else:
        left += 1
print('remaining files:', left)
