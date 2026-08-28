# -*- coding: utf-8 -*-
# 给 wenmai-api 的 /storage/v1/ location 插入 OPTIONS 预检直答块（复刻 /auth/v1/ 的 08-27 修法）
p = '/etc/nginx/sites-available/wenmai-api'
s = open(p).read()
if 'location /storage/v1/' not in s:
    raise SystemExit('storage location not found')
if 'x-upsert' in s:
    raise SystemExit('already patched')
block = '''        # 预检直答：放行 apikey/x-upsert 等头，不进 storage-api
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Accept, Authorization, Content-Type, apikey, X-Client-Info, X-Supabase-Api-Version, x-upsert, cache-control, Prefer";
            add_header Access-Control-Max-Age "86400";
            return 204;
        }
'''
marker = 'location /storage/v1/ {'
i = s.index(marker) + len(marker)
new = s[:i] + '\n' + block + s[i:]
open('/tmp/wenmai-api-new', 'w').write(new)
print('patched block written to /tmp/wenmai-api-new')
