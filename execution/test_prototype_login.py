"""Integration checks for the isolated password-form preview service.

Run on the prototype Docker network with ALDIA_TEST_PASSWORD set.
"""

import http.client
import os
from urllib.parse import urlencode


host = os.environ.get("ALDIA_TEST_HOST", "auth")
password = os.environ["ALDIA_TEST_PASSWORD"]
connection = http.client.HTTPConnection(host, 8090, timeout=5)


def request(method, path, body=None, headers=None):
    connection.request(method, path, body=body, headers=headers or {})
    response = connection.getresponse()
    result = (response.status, dict(response.getheaders()), response.read())
    return result


status, headers, body = request("GET", "/")
assert status == 200 and b"Entrar a la demostraci" in body
assert b"app.js" not in body

status, headers, body = request("GET", "/app.js")
assert status == 303 and headers.get("Location") == "/"

bad = urlencode({"username": "piloto", "password": "incorrecta"})
status, headers, body = request("POST", "/login", bad, {"Content-Type": "application/x-www-form-urlencoded"})
assert status == 200 and b"incorrectos" in body
assert "Set-Cookie" not in headers

good = urlencode({"username": "piloto", "password": password})
status, headers, body = request("POST", "/login", good, {"Content-Type": "application/x-www-form-urlencoded"})
assert status == 303 and headers.get("Location") == "/"
cookie = headers["Set-Cookie"]
assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=Lax" in cookie

auth_header = {"Cookie": cookie.split(";", 1)[0]}
for path, marker in (("/", b"AlD"), ("/app.js", b"aldia-prototype-v2"), ("/styles.css", b"font-family")):
    status, headers, body = request("GET", path, headers=auth_header)
    assert status == 200 and marker in body, (path, status)

status, headers, body = request("GET", "/../.env", headers=auth_header)
assert status == 404
connection.close()
print("OK: login, contraseña errónea, cookie segura, archivos protegidos y rutas restringidas")
