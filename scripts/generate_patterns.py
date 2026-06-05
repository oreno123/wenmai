"""
纹脉 — 即梦 AI 4.0 批量纹样图片生成脚本
使用火山引擎即梦 AI-图片生成4.0 API

用法：
  1. 填入 AK 和 SK（火山引擎 IAM 密钥管理获取）
  2. python generate_patterns.py              # 生成所有待生成纹样
  3. python generate_patterns.py --id cloud-1  # 只生成指定 ID
  4. python generate_patterns.py --dry-run     # 只列出要生成的
  5. python generate_patterns.py --retry       # 重试失败的

依赖：pip install requests
"""

import os
import sys
import json
import time
import hashlib
import hmac
import datetime
import argparse
import base64
from pathlib import Path
from urllib.parse import quote

import requests

# ── 配置 ──────────────────────────────────────────────

# 火山引擎 IAM 密钥（https://console.volcengine.com/iam/keymanage/）
AK = os.environ.get("VOLC_AK", "AKLTNzZjMjMyMTczYWMyNDhkN2FkMWI1NjExN2MwMzNmM2M")
SK = os.environ.get("VOLC_SK", "WWpBeE9URXpObUl6T1RBeU5HSmpZV0kxWlRrNFlqWXhPR1JrTmpjek5XTQ==")

API_HOST = "visual.volcengineapi.com"
API_URL = f"https://{API_HOST}"
SERVICE = "cv"
REGION = "cn-north-1"

OUTPUT_DIR = Path(r"D:\desktop\纹脉\wenmai\public\patterns")
SOURCE_DIR = Path(r"D:\desktop\纹样照片")

# 轮询间隔和超时
POLL_INTERVAL = 5    # 秒
MAX_POLL_TIME = 300  # 5分钟

# ── 纹样 Prompt 数据 ──────────────────────────────────

PATTERN_PROMPTS = [
    {
        "id": "basic-1", "name": "如意云纹", "output": "ruyi_cloud.png",
        "prompt": "中国传统如意云纹，云头内卷呈如意形，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，单张图片",
    },
    {
        "id": "cloud-1", "name": "流云纹", "output": "liuyun.png",
        "prompt": "中国传统流云纹，汉代风格，云气飘逸横向流动，正圆形构图，金色线条，宣纸底色，精细工笔风格，流动感，无阴影，单张图片",
    },
    {
        "id": "cloud-2", "name": "祥云纹", "output": "xiangyun.png",
        "prompt": "中国传统祥云纹，唐代风格，层叠云头五瓣如意，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，单张图片",
    },
    {
        "id": "cloud-3", "name": "朵云纹", "output": "duoyun.png",
        "prompt": "中国传统朵云纹，宋代风格，云团聚如花朵绽放，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，单张图片",
    },
    {
        "id": "taotie-1", "name": "饕餮纹·商", "output": "taotie_shang.png",
        "prompt": "中国传统饕餮纹，商代青铜器风格，正面兽面，双目突出，双角对称，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，单张图片",
    },
    {
        "id": "taotie-2", "name": "饕餮纹·周", "output": "taotie_zhou.png",
        "prompt": "中国传统饕餮纹，西周风格，兽面更修长精致，纹饰卷曲繁复，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，单张图片",
    },
    {
        "id": "taotie-3", "name": "夔龙饕餮纹", "output": "kuilong_taotie.png",
        "prompt": "中国传统夔龙饕餮纹，战国风格，兽面两侧配夔龙纹，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，单张图片",
    },
    {
        "id": "dragon-1", "name": "蟠龙纹", "output": "panlong.png",
        "prompt": "中国传统蟠龙纹，汉代风格，龙身盘曲呈圆形，鳞爪清晰，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，单张图片",
    },
    {
        "id": "dragon-2", "name": "行龙纹", "output": "xinglong.png",
        "prompt": "中国传统行龙纹，唐代风格，龙横向行走，鬃毛飘动，动态姿势，正圆形构图，金色线条，宣纸底色，精细工笔风格，无阴影，单张图片",
    },
    {
        "id": "dragon-3", "name": "升龙纹", "output": "shenglong.png",
        "prompt": "中国传统升龙纹，明代风格，五爪龙上升飞腾，皇家风格，正圆形构图，金色线条，宣纸底色，精细工笔风格，无阴影，单张图片",
    },
    {
        "id": "scroll-3", "name": "宝相花卷草", "output": "baoxiang.png",
        "prompt": "中国传统宝相花卷草纹，唐代风格，宝相花与卷草组合纹样，融莲花牡丹元素，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，单张图片",
    },
    {
        "id": "corner-1", "name": "如意角花", "output": "ruyi_corner.png",
        "prompt": "中国传统如意角花，如意头形角隅装饰纹样，四分之一圆构图，金色线条，宣纸底色，精细工笔风格，无阴影，单张图片",
    },
    {
        "id": "corner-2", "name": "凤鸟角花", "output": "fengniao_corner.png",
        "prompt": "中国传统凤鸟角花，凤鸟纹角隅装饰纹样，四分之一圆构图，金色线条，宣纸底色，精细工笔风格，无阴影，单张图片",
    },
    {
        "id": "tile-1", "name": "万字不到头", "output": "wanzi_endless.png",
        "prompt": "中国传统万字不到头纹，万字互连几何连续纹样，方形构图，金色线条，宣纸底色，精细工笔风格，四方连续，无阴影，单张图片",
    },
    {
        "id": "tile-2", "name": "冰裂纹", "output": "binglie.png",
        "prompt": "中国传统冰裂纹，不规则几何冰裂网络纹样，方形构图，金色线条，宣纸底色，精细工笔风格，随机几何感，无阴影，单张图片",
    },
]

# ── 火山引擎 V4 签名 ──────────────────────────────────

def hmac_sha256(key, msg):
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

def get_signing_key(secret_key, date, region, service):
    k_date = hmac_sha256(secret_key.encode("utf-8"), date)
    k_region = hmac_sha256(k_date, region)
    k_service = hmac_sha256(k_region, service)
    k_signing = hmac_sha256(k_service, "request")
    return k_signing

def sign_request(method, host, path, query_params, headers, body, ak, sk, region=REGION, service=SERVICE):
    now = datetime.datetime.utcnow()
    date_stamp = now.strftime("%Y%m%d")
    x_date = now.strftime("%Y%m%dT%H%M%SZ")

    # Canonical query string
    sorted_params = sorted(query_params.items())
    canonical_querystring = "&".join(f"{quote(k, safe='')}={quote(v, safe='')}" for k, v in sorted_params)

    # Payload hash
    body_str = json.dumps(body, ensure_ascii=False) if isinstance(body, dict) else body
    payload_hash = hashlib.sha256(body_str.encode("utf-8")).hexdigest()

    # Headers for signing
    signed_headers_list = ["content-type", "host", "x-content-sha256", "x-date"]
    canonical_headers = (
        f"content-type:application/json\n"
        f"host:{host}\n"
        f"x-content-sha256:{payload_hash}\n"
        f"x-date:{x_date}\n"
    )
    signed_headers = ";".join(signed_headers_list)

    # Canonical request
    canonical_request = f"{method}\n{path}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}"

    # String to sign
    credential_scope = f"{date_stamp}/{region}/{service}/request"
    string_to_sign = f"HMAC-SHA256\n{x_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"

    # Signing
    signing_key = get_signing_key(sk, date_stamp, region, service)
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    # Authorization header
    authorization = f"HMAC-SHA256 Credential={ak}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"

    return {
        "Authorization": authorization,
        "Content-Type": "application/json",
        "Host": host,
        "X-Content-Sha256": payload_hash,
        "X-Date": x_date,
    }

# ── API 调用 ──────────────────────────────────────────

def submit_task(prompt, ak, sk):
    """提交图片生成任务"""
    query = {
        "Action": "CVSync2AsyncSubmitTask",
        "Version": "2022-08-31",
    }
    body = {
        "req_key": "jimeng_t2i_v40",
        "prompt": prompt,
        "width": 2048,
        "height": 2048,
        "force_single": True,
    }

    headers = sign_request("POST", API_HOST, "/", query, {}, body, ak, sk)
    body_str = json.dumps(body, ensure_ascii=False).encode("utf-8")
    resp = requests.post(API_URL, params=query, headers=headers, data=body_str, timeout=30)
    data = resp.json()

    if data.get("code") != 10000:
        raise Exception(f"提交失败: {data.get('message', 'unknown error')} (code={data.get('code')})")

    return data["data"]["task_id"]

def poll_result(task_id, ak, sk):
    """轮询任务结果"""
    start = time.time()
    query = {
        "Action": "CVSync2AsyncGetResult",
        "Version": "2022-08-31",
    }
    body = {
        "req_key": "jimeng_t2i_v40",
        "task_id": task_id,
        "req_json": json.dumps({"return_url": True}),
    }

    while time.time() - start < MAX_POLL_TIME:
        headers = sign_request("POST", API_HOST, "/", query, {}, body, ak, sk)
        resp = requests.post(API_URL, params=query, headers=headers, json=body, timeout=30)
        data = resp.json()

        if data.get("code") != 10000:
            raise Exception(f"查询失败: {data.get('message', 'unknown error')}")

        status = data["data"].get("status")
        if status == "done":
            urls = data["data"].get("image_urls", [])
            if not urls:
                raise Exception("任务完成但没有返回图片")
            return urls
        elif status in ("in_queue", "generating"):
            print(f"    状态: {status}，等待 {POLL_INTERVAL}s...")
            time.sleep(POLL_INTERVAL)
        elif status in ("not_found", "expired"):
            raise Exception(f"任务异常: {status}")
        else:
            raise Exception(f"未知状态: {status}")

    raise Exception("超时")

def download_image(url, output_path):
    """下载图片到本地"""
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    output_path.write_bytes(resp.content)

# ── 批量生成 ──────────────────────────────────────────

def generate_single(pattern, ak, sk, output_dir):
    """生成单个纹样"""
    name = pattern["name"]
    output_path = output_dir / pattern["output"]

    if output_path.exists():
        print(f"  跳过（已存在）: {name}")
        return True

    print(f"  生成: {name}")
    try:
        task_id = submit_task(pattern["prompt"], ak, sk)
        print(f"    任务ID: {task_id}")
        urls = poll_result(task_id, ak, sk)
        download_image(urls[0], output_path)
        size_mb = output_path.stat().st_size / 1024 / 1024
        print(f"    完成: {output_path.name} ({size_mb:.1f}MB)")
        return True
    except Exception as e:
        print(f"    失败: {e}")
        return False

def generate_batch(patterns, ak, sk, output_dir):
    """批量生成"""
    print(f"\n开始生成 {len(patterns)} 个纹样")
    print(f"输出目录: {output_dir}")
    print("=" * 50)

    results = {"success": [], "failed": []}
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, p in enumerate(patterns, 1):
        print(f"\n[{i}/{len(patterns)}]", end="")
        ok = generate_single(p, ak, sk, output_dir)
        if ok:
            results["success"].append(p["id"])
        else:
            results["failed"].append(p["id"])

    print("\n" + "=" * 50)
    print(f"完成！成功: {len(results['success'])}, 失败: {len(results['failed'])}")
    if results["failed"]:
        print(f"失败列表: {', '.join(results['failed'])}")
        print("用 --retry 重试失败的")

    # 保存结果
    result_file = output_dir / "_generation_results.json"
    result_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    return results

# ── 入口 ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="纹脉 — 即梦 AI 批量纹样生成")
    parser.add_argument("--id", type=str, help="只生成指定 ID 的纹样")
    parser.add_argument("--dry-run", action="store_true", help="只列出要生成的")
    parser.add_argument("--retry", action="store_true", help="重试上次失败的")
    args = parser.parse_args()

    ak = AK or input("请输入 Access Key (AK): ").strip()
    sk = SK or input("请输入 Secret Key (SK): ").strip()

    if not ak or not sk:
        print("错误: 需要提供 AK 和 SK")
        print("获取地址: https://console.volcengine.com/iam/keymanage/")
        sys.exit(1)

    # 选择要生成的纹样
    patterns = PATTERN_PROMPTS

    if args.id:
        patterns = [p for p in patterns if p["id"] == args.id]
        if not patterns:
            print(f"未找到 ID: {args.id}")
            sys.exit(1)
    elif args.retry:
        result_file = OUTPUT_DIR / "_generation_results.json"
        if result_file.exists():
            results = json.loads(result_file.read_text(encoding="utf-8"))
            failed_ids = results.get("failed", [])
            patterns = [p for p in patterns if p["id"] in failed_ids]
            print(f"重试 {len(patterns)} 个失败的")
        else:
            print("没有找到上次的结果文件")

    if args.dry_run:
        print(f"将生成 {len(patterns)} 个纹样:")
        for p in patterns:
            exists = (OUTPUT_DIR / p["output"]).exists()
            print(f"  {'✓' if exists else '○'} {p['id']}: {p['name']} → {p['output']}")
        return

    generate_batch(patterns, ak, sk, OUTPUT_DIR)

if __name__ == "__main__":
    main()
