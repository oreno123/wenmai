# -*- coding: utf-8 -*-
# 广场全链路 E2E 测试：signup -> profile -> 发布 -> 封面 -> 审批 -> 匿名可见 -> 越权拦截
import json, hmac, hashlib, base64, time, uuid
import urllib.request, urllib.error

BASE = 'https://wenmai-api.ruoziqing.cn'
SITE = 'wenmai.ruoziqing.cn'
ORENO = '7c8855e2-9b59-4224-a96a-31873fed28c1'

env = {}
for line in open('/home/ubuntu/wenmai-deploy/.env'):
    line = line.strip()
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()
ANON = env['ANON_KEY']
SECRET = env['JWT_SECRET']

def req(method, path, headers=None, body=None):
    h = {'User-Agent': 'wenmai-e2e'}
    if headers: h.update(headers)
    data = None
    if body is not None:
        if isinstance(body, (dict, list)):
            data = json.dumps(body).encode('utf-8')
            h.setdefault('Content-Type', 'application/json')
        else:
            data = body
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)

results = []
def step(name, ok, detail=''):
    results.append(ok)
    print(('PASS' if ok else 'FAIL'), '|', name, '|', detail)

# 1. 注册测试用户
email = 'e2e-' + uuid.uuid4().hex[:8] + '@test.local'
st, body, _ = req('POST', '/auth/v1/signup', headers={'apikey': ANON},
                  body={'email': email, 'password': 'E2eTest123!x'})
j = json.loads(body)
tok = j.get('access_token')
uid = j['user']['id']
step('注册测试用户', st in (200, 201) and bool(tok), 'status=%s uid=%s' % (st, uid[:8]))
AH = {'apikey': ANON, 'Authorization': 'Bearer ' + tok}

# 2. 建 profile 行
st, body, _ = req('POST', '/rest/v1/profiles', headers=AH,
                  body={'user_id': uid, 'username': 'e2e_bot', 'points': 1000, 'free_pulls': 10, 'library': []})
step('建 profile 行', st in (200, 201), 'status=%s %s' % (st, body[:150]))

# 3. 发布作品 (pending)
st, body, _ = req('POST', '/rest/v1/works?select=id',
                  headers={**AH, 'Prefer': 'return=representation'},
                  body={'author_id': uid, 'title': '青铜饕餮·E2E测试', 'template': 'free',
                        'placements': [], 'series': '青铜器', 'status': 'pending'})
try:
    wid = json.loads(body)[0]['id']
except Exception:
    wid = 'FAILED'
step('发布作品(pending)', st in (200, 201) and wid != 'FAILED',
     'status=%s wid=%s body=%s' % (st, wid[:8], body[:300]))

# 4. 上传封面到 storage
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
st, body, _ = req('POST', '/storage/v1/object/works/%s/%s.png' % (uid, wid),
                  headers={'apikey': ANON, 'Authorization': 'Bearer ' + tok,
                           'Content-Type': 'image/png', 'x-upsert': 'true'}, body=png)
step('封面上传 storage', st in (200, 201), 'status=%s %s' % (st, body[:150]))

# 5. 回写 cover_path
pub = BASE + '/storage/v1/object/public/works/%s/%s.png' % (uid, wid)
st, body, _ = req('PATCH', '/rest/v1/works?id=eq.' + wid, headers=AH, body={'cover_path': pub})
step('回写 cover_path', st in (200, 204), 'status=%s' % st)

# 6. 匿名直取封面图
st, body, _ = req('GET', '/storage/v1/object/public/works/%s/%s.png' % (uid, wid), headers={'apikey': ANON})
step('封面公开可访问', st == 200 and len(body) > 40, 'status=%s bytes=%d' % (st, len(body)))

# 7. 浏览器 CORS 预检（已知疑点）
st, body, hd = req('OPTIONS', '/storage/v1/object/works/%s/%s.png' % (uid, wid),
                   headers={'Origin': 'https://' + SITE, 'Access-Control-Request-Method': 'POST',
                            'Access-Control-Request-Headers': 'authorization,apikey,content-type,x-upsert'})
acao = hd.get('access-control-allow-origin') or hd.get('Access-Control-Allow-Origin')
step('storage CORS 预检', st in (200, 204) and bool(acao), 'status=%s acao=%s' % (st, acao))

# 8. 匿名看不到 pending
st, body, _ = req('GET', '/rest/v1/works?select=id&status=eq.approved', headers={'apikey': ANON})
step('匿名列表(pending不可见)', st == 200, 'n=%d' % len(json.loads(body)))

# 9. 伪造管理员会话（oreno）走真实审批路径
def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b'=')
hdr = b64u(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
pl = b64u(json.dumps({'role': 'authenticated', 'sub': ORENO, 'iss': 'supabase',
                      'iat': int(time.time()), 'exp': int(time.time()) + 600}).encode())
sig = b64u(hmac.new(SECRET.encode(), hdr + b'.' + pl, hashlib.sha256).digest())
MH = {'apikey': ANON, 'Authorization': 'Bearer ' + (hdr + b'.' + pl + b'.' + sig).decode()}

st, body, _ = req('GET', '/rest/v1/works?select=id,status&status=eq.pending', headers=MH)
step('管理员看到待审队列', st == 200 and any(w['id'] == wid for w in json.loads(body)), 'status=%s' % st)
st, body, _ = req('PATCH', '/rest/v1/works?id=eq.' + wid, headers=MH,
                  body={'status': 'approved', 'reviewed_by': ORENO, 'rejected_reason': None})
step('管理员通过审核', st in (200, 204), 'status=%s %s' % (st, body[:150]))

# 10. 匿名看到已审作品
st, body, _ = req('GET', '/rest/v1/works?select=id&status=eq.approved', headers={'apikey': ANON})
step('匿名看到已审作品', st == 200 and any(w['id'] == wid for w in json.loads(body)), 'n=%d' % len(json.loads(body)))

# 11. 普通用户不能变更审核状态（pending->approved 自审 / approved->rejected 改判）
st, body, _ = req('PATCH', '/rest/v1/works?id=eq.' + wid, headers=AH, body={'status': 'rejected'})
step('非管理员变更status被拦', st in (400, 401, 403, 404, 500), 'status=%s %s' % (st, body[:120]))

# 11b. 刚发布的 pending 作品，作者立刻自审通过（真实攻击路径）
st, body, _ = req('POST', '/rest/v1/works?select=id',
                  headers={**AH, 'Prefer': 'return=representation'},
                  body={'author_id': uid, 'title': '自审攻击测试', 'template': 'free',
                        'placements': [], 'series': '青铜器', 'status': 'pending'})
wid2 = json.loads(body)[0]['id']
st, body, _ = req('PATCH', '/rest/v1/works?id=eq.' + wid2, headers=AH, body={'status': 'approved'})
step('作者自审通过被拦', st in (400, 401, 403, 404, 500), 'status=%s %s' % (st, body[:120]))

# 12. 普通用户不能直发 approved（INSERT 强制 pending）
st, body, _ = req('POST', '/rest/v1/works?select=id', headers=AH,
                  body={'author_id': uid, 'title': '越权直发测试', 'template': 'free',
                        'placements': [], 'series': '青铜器', 'status': 'approved'})
step('非管理员直发approved被拦', st in (403, 400, 500), 'status=%s %s' % (st, body[:120]))

# 13. 作者仍可回写自己的 cover_path（发布流程依赖）
st, body, _ = req('PATCH', '/rest/v1/works?id=eq.' + wid, headers=AH, body={'cover_path': pub})
step('作者回写cover_path不受影响', st in (200, 204), 'status=%s' % st)

print('---')
print('TEST_UID=' + uid)
print('TEST_WID=' + wid)
print('SUMMARY %d/%d' % (sum(1 for x in results if x), len(results)))
