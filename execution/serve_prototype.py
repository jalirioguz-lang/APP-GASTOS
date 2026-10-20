"""Serve the local AlDía APP prototype only on the VPS loopback interface."""

from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


PROTOTYPE_DIR = Path(__file__).resolve().parents[1] / "apps" / "prototype"


class PrototypeHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'none'; object-src 'none'; "
            "base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        )
        super().end_headers()

    def list_directory(self, path: str) -> None:
        self.send_error(403, "Directory listing disabled")
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8088)
    args = parser.parse_args()
    if not PROTOTYPE_DIR.is_dir():
        parser.error(f"Prototype directory missing: {PROTOTYPE_DIR}")
    if not 1024 <= args.port <= 65535:
        parser.error("Port must be between 1024 and 65535")

    handler = partial(PrototypeHandler, directory=str(PROTOTYPE_DIR))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Private preview: http://127.0.0.1:{args.port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
