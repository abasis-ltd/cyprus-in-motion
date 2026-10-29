"""Generate the expo QR codes as crisp SVG (for print and screens) plus PNG (for decode checks).

Uses reportlab's bundled QR encoder (already installed for the booth kit), no other deps.
Run: python3 build_qr.py && swift ../transport-booth-kit/verify-qr.swift assets/qr-play.png
"""
import pathlib, struct, zlib
from reportlab.graphics.barcode import qrencoder

SITE = "https://abasis-ltd.github.io/cyprus-in-motion/"
CODES = {"qr-site": SITE, "qr-play": SITE + "play/"}
OUT = pathlib.Path(__file__).resolve().parent / "assets"
QUIET = 4


def matrix(text, version=4):
    # smallest version that fits, starting from `version` (URLs fit in 4; a vCard needs more)
    for v in range(version, 21):
        try:
            qr = qrencoder.QRCode(v, qrencoder.QRErrorCorrectLevel.M)
            qr.addData(text)
            qr.make()
            break
        except Exception:
            continue
    n = qr.getModuleCount()
    return [[bool(qr.isDark(r, c)) for c in range(n)] for r in range(n)]


def svg(m, dark="#0F172A"):
    n = len(m) + 2 * QUIET
    # one path of unit squares, merged per row run so the file stays small
    d = []
    for r, row in enumerate(m):
        c = 0
        while c < len(row):
            if row[c]:
                start = c
                while c < len(row) and row[c]:
                    c += 1
                d.append(f"M{start + QUIET} {r + QUIET}h{c - start}v1h-{c - start}z")
            else:
                c += 1
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
            f'<rect width="{n}" height="{n}" fill="#fff"/><path fill="{dark}" d="{"".join(d)}"/></svg>\n')


def png(m, scale=12):
    n = (len(m) + 2 * QUIET) * scale
    rows = []
    for y in range(n):
        r = y // scale - QUIET
        line = bytearray([0])
        for x in range(n):
            c = x // scale - QUIET
            dark = 0 <= r < len(m) and 0 <= c < len(m) and m[r][c]
            line.append(0 if dark else 255)
        rows.append(bytes(line))
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


if __name__ == "__main__":
    import sys
    # extra codes on demand, e.g. a contact card that must stay out of git:
    #   python3 build_qr.py --text qr-vcard "$(cat contact.vcf)"
    if len(sys.argv) == 4 and sys.argv[1] == "--text":
        CODES = {sys.argv[2]: sys.argv[3]}
    for name, url in CODES.items():
        m = matrix(url)
        (OUT / f"{name}.svg").write_text(svg(m))
        (OUT / f"{name}.png").write_bytes(png(m))
        print(name, url.splitlines()[0], f"{len(m)}x{len(m)} modules")
