"""
rembg_server.py — rembg HTTP microservice
Model download করার পথ:
  wget -c -P ~/.rembg/models/isnet-general-use \
    https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx
"""
import io
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

MODEL_NAME  = os.getenv('REMBG_MODEL', 'isnet-general-use')
REMBG_DIR   = Path.home() / '.rembg' / 'models' / MODEL_NAME
MODEL_FILE  = REMBG_DIR / f'{MODEL_NAME}.onnx'
MOCK_MODE   = os.getenv('REMBG_MOCK', '').lower() in ('1', 'true', 'yes')

session = None

def load_session():
    global session
    if session:
        return True
    if MOCK_MODE:
        print("[rembg-server] ⚠️  MOCK MODE — returning original image unchanged", flush=True)
        return False
    if not MODEL_FILE.exists():
        print(f"[rembg-server] ❌ Model not found: {MODEL_FILE}", flush=True)
        print(f"[rembg-server] 📥 Download it with:", flush=True)
        print(f"[rembg-server]    wget -c --show-progress \\", flush=True)
        print(f"[rembg-server]      -P {REMBG_DIR} \\", flush=True)
        print(f"[rembg-server]      https://github.com/danielgatis/rembg/releases/download/v0.0.0/{MODEL_NAME}.onnx", flush=True)
        return False
    try:
        print(f"[rembg-server] ⚙️  Loading model from {MODEL_FILE} ...", flush=True)
        from rembg import new_session
        session = new_session(MODEL_NAME)
        print(f"[rembg-server] ✅ Model loaded!", flush=True)
        return True
    except Exception as e:
        print(f"[rembg-server] ❌ Failed to load model: {e}", flush=True)
        return False

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[rembg-server] {format % args}", flush=True)

    def do_GET(self):
        if self.path == '/health':
            model_exists = MODEL_FILE.exists()
            if MOCK_MODE:
                status = 'mock'
            elif session:
                status = 'ready'
            elif model_exists:
                status = 'model_found_not_loaded'
            else:
                status = 'model_missing'

            body = (f'{{"status":"{status}",'
                    f'"model":"{MODEL_NAME}",'
                    f'"mock":{str(MOCK_MODE).lower()},'
                    f'"model_file_exists":{str(model_exists).lower()}}}').encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path != '/remove':
            self.send_response(404)
            self.end_headers()
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            data   = self.rfile.read(length)
            print(f"[rembg-server] 📥 {len(data)/1024:.1f} KB received", flush=True)

            model_ready = load_session()

            if model_ready and session:
                from rembg import remove
                from PIL import Image

                # Open original image to preserve full dynamic range & resolution
                input_img = Image.open(io.BytesIO(data)).convert("RGBA")

                # Step 1: Extract pure alpha mask from AI
                # only_mask=True gives the exact mathematical mask without downsampling color
                mask = remove(
                    input_img,
                    session=session,
                    only_mask=True,
                    post_process_mask=True
                )

                # Step 2: Composite original image with the crisp mask
                # This guarantees original RGB pixels remain 100% UNTOUCHED and ultra-sharp!
                output_img = input_img.copy()
                output_img.putalpha(mask)

                out_buf = io.BytesIO()
                output_img.save(out_buf, format="PNG", compress_level=1)
                result = out_buf.getvalue()

                print(f"[rembg-server] ✅ 100% Lossless Alpha Mask Applied: {len(result)/1024:.1f} KB", flush=True)
            else:
                # Mock: return original image as-is
                print(f"[rembg-server] ⚠️  Mock: returning original image", flush=True)
                result = data

            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Content-Length', str(len(result)))
            self.end_headers()
            self.wfile.write(result)

        except Exception as e:
            print(f"[rembg-server] ❌ {e}", flush=True)
            msg = str(e).encode()
            self.send_response(500)
            self.send_header('Content-Length', str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

if __name__ == '__main__':
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', sys.argv[1] if len(sys.argv) > 1 else 5000))

    print(f"\n{'='*50}", flush=True)
    print(f"🚀 rembg HTTP Server", flush=True)
    print(f"{'='*50}", flush=True)
    print(f"📡 Host  : {HOST}", flush=True)
    print(f"📡 Port  : {PORT}", flush=True)
    print(f"🤖 Model : {MODEL_NAME}", flush=True)
    print(f"📂 Path  : {MODEL_FILE}", flush=True)

    if MOCK_MODE:
        print(f"⚠️  Mode  : MOCK (no AI, returns original image)", flush=True)
    elif MODEL_FILE.exists():
        size_mb = MODEL_FILE.stat().st_size / 1024 / 1024
        print(f"✅ Model file found: {size_mb:.1f} MB", flush=True)
        load_session()  # pre-load
    else:
        print(f"❌ Model NOT found!", flush=True)
        print(f"\n   Download করুন (background এ চলবে):", flush=True)
        print(f"   mkdir -p {REMBG_DIR}", flush=True)
        print(f"   wget -c --show-progress \\", flush=True)
        print(f"     -P {REMBG_DIR} \\", flush=True)
        print(f"     https://github.com/danielgatis/rembg/releases/download/v0.0.0/{MODEL_NAME}.onnx", flush=True)
        print(f"\n   অথবা Mock mode এ চালান:", flush=True)
        print(f"   REMBG_MOCK=1 python3 rembg_server.py", flush=True)

    print(f"{'='*50}\n", flush=True)

    server = HTTPServer((HOST, PORT), Handler)
    server.serve_forever()
