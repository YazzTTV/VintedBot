import socketserver
import http.server
import threading
import os
import subprocess
import time

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length)
        print(f"\n--- INTERCEPTED POST to {self.path} ---")
        print("HEADERS:", self.headers)
        print("BODY:", body.decode('utf-8', errors='replace'))
        print("---------------------------------------\n")
        
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"id":"fake-id","status":"completed","results":[{"url":"http://fake"}]}')

    def do_GET(self):
        print(f"\n--- INTERCEPTED GET to {self.path} ---")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{}')

def run_proxy():
    with socketserver.TCPServer(("", 8080), ProxyHandler) as httpd:
        print("Proxy sniffing on port 8080...")
        httpd.serve_forever()

if __name__ == "__main__":
    t = threading.Thread(target=run_proxy, daemon=True)
    t.start()
    time.sleep(1)
    
    env = os.environ.copy()
    env["HTTP_PROXY"] = "http://localhost:8080"
    env["HTTPS_PROXY"] = "http://localhost:8080"
    
    cmd = ["higgsfield.cmd" if os.name == "nt" else "higgsfield", "generate", "create", "nano_banana", "--prompt", "test", "--json"]
    print("Running CLI...")
    p = subprocess.run(cmd, env=env, capture_output=True)
    print("CLI STDOUT:", p.stdout.decode('utf-8', errors='replace'))
    print("CLI STDERR:", p.stderr.decode('utf-8', errors='replace'))
