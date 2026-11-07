#!/usr/bin/env python3
"""Build cat-at-the-window.html, the one-file copy people download, from index.html, the scripts and the songs.

    python build.py           write cat-at-the-window.html
    python build.py --check   fail if cat-at-the-window.html is out of date

Standard library only. Run it after changing index.html, a script or a song.
"""
import base64
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "cat-at-the-window.html"


def embed_songs(js: str) -> str:
    """Swap each song's file path for the file itself, as base64."""
    def embed(m: re.Match) -> str:
        data = base64.b64encode((HERE / m.group(1)).read_bytes()).decode("ascii")
        return f"data: '{data}'"
    return re.sub(r"src: '(songs/[^']+)'", embed, js)


def build() -> str:
    html = (HERE / "index.html").read_text(encoding="utf-8")
    html = re.sub(r"[ \t]*<!-- only:hosted -->.*?<!-- /only -->\n", "", html, flags=re.S)
    html = re.sub(r"[ \t]*<!-- only:file\n(.*?)[ \t]*/only -->\n", r"\1", html, flags=re.S)

    def inline(m: re.Match) -> str:
        js = (HERE / m.group(1)).read_text(encoding="utf-8")
        if m.group(1) == "songs.js":
            js = embed_songs(js)
        return "<script>\n" + js.replace("</script", "<\\/script") + "</script>"

    html, n = re.subn(r'<script src="([a-z]+\.js)"></script>', inline, html)
    if n != 4:
        sys.exit(f"build.py: expected 4 script tags in index.html, found {n}")
    return html


def main() -> int:
    html = build()
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != html:
            print("cat-at-the-window.html is out of date: run python build.py")
            return 1
        print("cat-at-the-window.html is up to date")
        return 0
    OUT.write_text(html, encoding="utf-8", newline="\n")
    print(f"wrote {OUT.name}: {OUT.stat().st_size / 1e6:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
