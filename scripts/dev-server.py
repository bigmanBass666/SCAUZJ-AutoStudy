import http.server
import socketserver
import urllib.request
import urllib.error
import json
import sys

PORT = 18923
BAIDU_OCR_TOKEN_URL = "https://aip.baidubce.com/oauth/2.0/token"
BAIDU_OCR_API_URL = "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic"

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/ocr-proxy':
            self.handle_cors_preflight()
            return
        if self.path.startswith('/ocr-proxy?'):
            self.proxy_baidu_ocr()
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/ocr-proxy':
            self.proxy_baidu_ocr()
            return
        self.send_error(404)

    def handle_cors_preflight(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def proxy_baidu_ocr(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            
            params = {}
            if body:
                body_str = body.decode('utf-8')
                for pair in body_str.split('&'):
                    if '=' in pair:
                        k, v = pair.split('=', 1)
                        params[urllib.parse.unquote(k)] = urllib.parse.unquote(v)

            if 'image' in params and 'access_token' not in params:
                api_key = params.get('api_key', '')
                secret_key = params.get('secret_key', '')
                
                token_url = f"{BAIDU_OCR_TOKEN_URL}?grant_type=client_credentials&client_id={api_key}&client_secret={secret_key}"
                req = urllib.request.Request(token_url, method='POST')
                with urllib.request.urlopen(req, timeout=10) as resp:
                    token_data = json.loads(resp.read().decode())
                
                access_token = token_data.get('access_token', '')
                ocr_url = f"{BAIDU_OCR_API_URL}?access_token={access_token}"
                post_data = urllib.parse.urlencode({'image': params['image']}).encode()
                
                req = urllib.request.Request(ocr_url, data=post_data, method='POST')
                req.add_header('Content-Type', 'application/x-www-form-urlencoded')
                with urllib.request.urlopen(req, timeout=10) as resp:
                    result = resp.read().decode()
            elif 'access_token' in params and 'image' in params:
                ocr_url = f"{BAIDU_OCR_API_URL}?access_token={params['access_token']}"
                post_data = urllib.parse.urlencode({'image': params['image']}).encode()
                req = urllib.request.Request(ocr_url, data=post_data, method='POST')
                req.add_header('Content-Type', 'application/x-www-form-urlencoded')
                with urllib.request.urlopen(req, timeout=10) as result:
                    result = result.read().decode()
            else:
                self.send_json(400, {'error': 'Missing image or credentials'})
                return

            self.send_json(200, json.loads(result))

        except urllib.error.HTTPError as e:
            self.send_json(e.code, {'error': str(e), 'body': e.read().decode() if e.fp else ''})
        except Exception as e:
            self.send_json(500, {'error': str(e)})

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        print(f"[Proxy {self.log_date_time_string()}] {format % args}")

print(f"🚀 Dev Server with OCR Proxy starting on http://localhost:{PORT}")
print(f"   Static files: scripts/")
print(f"   OCR Proxy:  http://localhost:{PORT}/ocr-proxy")
with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
    httpd.serve_forever()
