"""Password-form gate for the static, fictitious AlDía APP prototype.

Run behind the HTTPS reverse proxy only. No expense data is stored server-side.
"""

from __future__ import annotations

import base64
import binascii
from collections import deque
import hashlib
import hmac
import html
import os
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import secrets
from threading import BoundedSemaphore, Lock
import time
from urllib.parse import parse_qs, urlsplit


STATIC_DIR = Path(os.environ.get("ALDIA_STATIC_DIR", Path(__file__).resolve().parents[1] / "apps" / "prototype"))
PASSWORD_SALT = bytes.fromhex(os.environ["ALDIA_PASSWORD_SALT"])
PASSWORD_HASH = bytes.fromhex(os.environ["ALDIA_PASSWORD_HASH"])
SESSION_KEY = bytes.fromhex(os.environ["ALDIA_SESSION_KEY"])
COOKIE_NAME = "aldia_preview"
SESSION_SECONDS = 8 * 60 * 60
LOGIN_WINDOW_SECONDS = 60
MAX_LOGIN_ATTEMPTS = 30
LOGIN_HASH_SLOTS = BoundedSemaphore(2)
LOGIN_ATTEMPTS = deque()
LOGIN_ATTEMPTS_LOCK = Lock()
FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
}


def session_token() -> str:
    payload = f"{int(time.time()) + SESSION_SECONDS}:{secrets.token_hex(16)}"
    signature = hmac.new(SESSION_KEY, payload.encode("ascii"), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{signature}".encode("ascii")).decode("ascii").rstrip("=")


def valid_session(token: str) -> bool:
    if len(token) > 200:
        return False
    try:
        raw = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)).decode("ascii")
        expiry, nonce, signature = raw.split(":")
        if not nonce or len(nonce) != 32 or not expiry.isdecimal() or int(expiry) < time.time():
            return False
        payload = f"{expiry}:{nonce}"
        expected = hmac.new(SESSION_KEY, payload.encode("ascii"), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)
    except (ValueError, UnicodeError, binascii.Error):
        return False


def allow_login_attempt() -> bool:
    now = time.monotonic()
    with LOGIN_ATTEMPTS_LOCK:
        while LOGIN_ATTEMPTS and LOGIN_ATTEMPTS[0] <= now - LOGIN_WINDOW_SECONDS:
            LOGIN_ATTEMPTS.popleft()
        if len(LOGIN_ATTEMPTS) >= MAX_LOGIN_ATTEMPTS:
            return False
        LOGIN_ATTEMPTS.append(now)
        return True


def login_page(error: str = "") -> bytes:
    warning = f'<p class="error" role="alert">{html.escape(error)}</p>' if error else ""
    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acceso · AlDía APP</title><style>
:root{{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17352e;background:#f5f7f4}}
*{{box-sizing:border-box}}body{{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}}
.card{{width:min(420px,100%);background:white;border:1px solid #e5ece6;border-radius:20px;padding:34px;box-shadow:0 16px 48px #173b3412}}
.brand{{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px}}.mark{{width:36px;height:36px;border-radius:10px;background:#d7f4a3;display:grid;place-items:center}}
h1{{font-size:27px;line-height:1.12;margin:28px 0 9px}}p{{color:#718777;font-size:14px;line-height:1.5}}
label{{display:block;font-size:13px;font-weight:700;margin:18px 0 7px}}input{{width:100%;border:1px solid #dce6dc;border-radius:10px;padding:12px;font:inherit}}
input:focus{{outline:2px solid #70ad69;outline-offset:2px}}button{{width:100%;border:0;border-radius:10px;background:#1d6a4b;color:white;padding:13px;margin-top:24px;font:inherit;font-weight:750;cursor:pointer}}
.error{{background:#fff1ed;color:#9e3929;padding:11px;border-radius:9px}}.note{{font-size:12px;margin-top:20px}}
</style></head><body><main class="card"><div class="brand"><span class="mark">a.</span>AlDía APP</div>
<h1>Entrar a la demostración</h1><p>Escribe la contraseña de prueba que te compartimos. No necesitas importar datos de Chrome.</p>
{warning}<form method="post" action="/login" autocomplete="off"><label for="username">Usuario</label><input id="username" name="username" required autocomplete="username" value="piloto">
<label for="password">Contraseña</label><input id="password" name="password" type="password" required autocomplete="current-password">
<button type="submit">Entrar a AlDía APP →</button></form><p class="note">Prototipo con datos ficticios. Los cambios se guardan solo en este navegador.</p></main></body></html>""".encode("utf-8")


class LoginHandler(BaseHTTPRequestHandler):
    server_version = "AlDiaPreview"

    def setup(self) -> None:
        self.request.settimeout(10)
        super().setup()

    def send_bytes(self, status: int, body: bytes, content_type: str, *, cookie: str | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def redirect(self, location: str, *, cookie: str | None = None) -> None:
        self.send_response(HTTPStatus.SEE_OTHER)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()

    def authenticated(self) -> bool:
        cookies = SimpleCookie()
        try:
            cookies.load(self.headers.get("Cookie", ""))
            item = cookies.get(COOKIE_NAME)
            return bool(item and valid_session(item.value))
        except Exception:
            return False

    def do_HEAD(self) -> None:
        self.do_GET()

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path not in FILES:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not self.authenticated():
            if path in ("/", "/index.html"):
                self.send_bytes(HTTPStatus.OK, login_page(), "text/html; charset=utf-8")
            else:
                self.redirect("/")
            return
        filename, content_type = FILES[path]
        self.send_bytes(HTTPStatus.OK, (STATIC_DIR / filename).read_bytes(), content_type)

    def do_POST(self) -> None:
        if urlsplit(self.path).path != "/login":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST)
            return
        if not 0 < length <= 4096:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return
        fields = parse_qs(self.rfile.read(length).decode("utf-8", errors="replace"), keep_blank_values=True)
        if not allow_login_attempt():
            self.send_error(HTTPStatus.TOO_MANY_REQUESTS, "Demasiados intentos. Espera un minuto.")
            return
        if not LOGIN_HASH_SLOTS.acquire(blocking=False):
            self.send_error(HTTPStatus.SERVICE_UNAVAILABLE, "Inténtalo de nuevo en un momento.")
            return
        username = fields.get("username", [""])[0]
        password = fields.get("password", [""])[0]
        try:
            candidate = hashlib.scrypt(password.encode("utf-8"), salt=PASSWORD_SALT, n=16384, r=8, p=1) if username == "piloto" else b""
        finally:
            LOGIN_HASH_SLOTS.release()
        if username != "piloto" or not hmac.compare_digest(candidate, PASSWORD_HASH):
            self.send_bytes(HTTPStatus.OK, login_page("Usuario o contraseña incorrectos."), "text/html; charset=utf-8")
            return
        token = session_token()
        self.redirect("/", cookie=f"{COOKIE_NAME}={token}; Max-Age={SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax")


def main() -> None:
    if len(PASSWORD_SALT) < 16 or len(PASSWORD_HASH) != 64 or len(SESSION_KEY) < 32:
        raise RuntimeError("La configuración de acceso no cumple las longitudes mínimas")
    if not STATIC_DIR.is_dir() or any(not (STATIC_DIR / name).is_file() for name, _ in FILES.values()):
        raise RuntimeError(f"Faltan archivos del prototipo en {STATIC_DIR}")
    server = ThreadingHTTPServer(("0.0.0.0", 8090), LoginHandler)
    print("Acceso del prototipo escuchando dentro de Docker en :8090", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
