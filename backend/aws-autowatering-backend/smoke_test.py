#!/usr/bin/env python3
"""
Post-deploy smoke tests for AutoWatering backend.

Verifies that critical endpoints are reachable and return expected shapes.
Run after every deploy: python smoke_test.py --api-base-url <url>

Exit code 0 = all pass, 1 = at least one failure.
"""

import argparse
import json
import sys
import time
from urllib import request, error

TIMEOUT_SECONDS = 10

def get_json(url: str) -> dict:
    req = request.Request(url, method='GET')
    req.add_header('Accept', 'application/json')
    with request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        return json.loads(resp.read().decode())


def post_json(url: str, body: dict, headers: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(body).encode()
    req = request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            return resp.status, json.loads(resp.read().decode())
    except error.HTTPError as e:
        body_text = e.read().decode() if e.fp else '{}'
        try:
            return e.code, json.loads(body_text)
        except Exception:
            return e.code, {'raw': body_text}


class SmokeResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []

    def check(self, name: str, ok: bool, detail: str = ''):
        status = 'PASS' if ok else 'FAIL'
        self.results.append((name, status, detail))
        if ok:
            self.passed += 1
            print(f'  ✅ {name}')
        else:
            self.failed += 1
            print(f'  ❌ {name}: {detail}')

    def summary(self) -> bool:
        total = self.passed + self.failed
        print(f'\n{"=" * 50}')
        print(f'  Results: {self.passed}/{total} passed')
        print(f'{"=" * 50}')
        return self.failed == 0


def run_smoke_tests(base_url: str, admin_token: str | None = None) -> bool:
    r = SmokeResults()
    base = base_url.rstrip('/')

    print(f'\nSmoke testing: {base}\n')

    # 1. Health - liveness
    try:
        data = get_json(f'{base}/health')
        r.check('GET /health', data.get('ok') is True)
    except Exception as e:
        r.check('GET /health', False, str(e))

    # 2. Health - deep
    try:
        data = get_json(f'{base}/health/deep')
        r.check('GET /health/deep', data.get('ok') is True, f'checks={len(data.get("checks", []))}')
    except Exception as e:
        r.check('GET /health/deep', False, str(e))

    # 3. Health - OTA
    try:
        data = get_json(f'{base}/health/ota')
        r.check('GET /health/ota', data.get('subsystem') == 'ota')
    except Exception as e:
        r.check('GET /health/ota', False, str(e))

    # 4. Health - Stripe
    try:
        data = get_json(f'{base}/health/stripe')
        r.check('GET /health/stripe', data.get('subsystem') == 'stripe')
    except Exception as e:
        r.check('GET /health/stripe', False, str(e))

    # 5. Health - Provisioning
    try:
        data = get_json(f'{base}/health/provision')
        r.check('GET /health/provision', data.get('subsystem') == 'provisioning')
    except Exception as e:
        r.check('GET /health/provision', False, str(e))

    # 6. AI Doctor health
    try:
        data = get_json(f'{base}/aiDoctorHealth')
        r.check('GET /aiDoctorHealth', data.get('status') is not None)
    except Exception as e:
        r.check('GET /aiDoctorHealth', False, str(e))

    # 7. Plant ID health
    try:
        data = get_json(f'{base}/plantIdHealth')
        r.check('GET /plantIdHealth', data.get('status') is not None)
    except Exception as e:
        r.check('GET /plantIdHealth', False, str(e))

    # 8. OTA latest (should return 401 without auth, or 200 with data)
    try:
        data = get_json(f'{base}/ota/latest?board=arduino_nano_33_ble&channel=stable')
        r.check('GET /ota/latest (reachable)', True)
    except error.HTTPError as e:
        # 401 is expected without auth token — endpoint is reachable
        r.check('GET /ota/latest (reachable)', e.code in (401, 200, 404), f'status={e.code}')
    except Exception as e:
        r.check('GET /ota/latest (reachable)', False, str(e))

    # 9. Unauthenticated route returns proper error
    try:
        data = get_json(f'{base}/subscriptionStatus')
        r.check('GET /subscriptionStatus (auth guard)', False, 'Expected 401')
    except error.HTTPError as e:
        r.check('GET /subscriptionStatus (auth guard)', e.code == 401, f'status={e.code}')
    except Exception as e:
        r.check('GET /subscriptionStatus (auth guard)', False, str(e))

    # 10. 404 for unknown route
    try:
        data = get_json(f'{base}/nonexistent_route_xyz')
        r.check('GET /unknown → 404', False, 'Expected 404')
    except error.HTTPError as e:
        r.check('GET /unknown → 404', e.code == 404, f'status={e.code}')
    except Exception as e:
        r.check('GET /unknown → 404', False, str(e))

    # 11. OTA admin (if token provided)
    if admin_token:
        try:
            code, data = post_json(f'{base}/ota/releases', {}, {'x-admin-token': 'invalid-token-xxx'})
            r.check('POST /ota/releases (bad token)', code == 401 or code == 403, f'status={code}')
        except error.HTTPError as e:
            r.check('POST /ota/releases (bad token)', e.code in (401, 403), f'status={e.code}')
        except Exception as e:
            r.check('POST /ota/releases (bad token)', False, str(e))

    return r.summary()


def main():
    parser = argparse.ArgumentParser(description='Backend smoke tests')
    parser.add_argument('--api-base-url', required=True, help='API Gateway base URL')
    parser.add_argument('--admin-token', default=None, help='OTA admin token (optional)')
    args = parser.parse_args()

    ok = run_smoke_tests(args.api_base_url, args.admin_token)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
