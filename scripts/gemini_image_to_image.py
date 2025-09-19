#!/usr/bin/env python3
"""
Image-to-Image generation using Google Gemini via the google-genai SDK.

Reads GEMINI_API_KEY from .env.local (or environment), sends a prompt + input
image to the model 'gemini-2.5-flash-image-preview', and saves any returned
image parts to disk.

Usage:
  python scripts/gemini_image_to_image.py /path/to/input.png "your prompt here"

Notes:
  - Requires: pip install google-genai
  - If you prefer python-dotenv, add: pip install python-dotenv and replace
    the simple .env.local parser with load_dotenv('.env.local').
"""

import os
import re
import sys

try:
    from google import genai
    from google.genai import types
except Exception as e:
    raise SystemExit(
        "google-genai is required. Install with: pip install google-genai"
    )

# Pillow is not required for this script since we send raw bytes.


def read_env_key_from_file(path: str, key: str) -> str | None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        m = re.search(rf"^{re.escape(key)}=(.+)$", content, re.MULTILINE)
        if m:
            return m.group(1).strip()
    except FileNotFoundError:
        return None
    return None


def get_api_key() -> str:
    # Prefer environment, fallback to .env.local
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    key = read_env_key_from_file(".env.local", "GEMINI_API_KEY")
    if key:
        return key
    raise SystemExit("GEMINI_API_KEY not set in environment or .env.local")


def load_image_bytes(path: str) -> tuple[bytes, str]:
    # Detect mime from extension (fallback to PNG)
    ext = os.path.splitext(path)[1].lower()
    mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(ext, "image/png")
    with open(path, "rb") as f:
        return f.read(), mime


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: python scripts/gemini_image_to_image.py /path/to/input.png [prompt...]"
        )
        raise SystemExit(2)

    image_path = sys.argv[1]
    prompt = (
        " ".join(sys.argv[2:])
        or "Create a picture of my cat eating in a fancy restaurant under the Gemini constellation"
    )

    api_key = get_api_key()
    client = genai.Client(api_key=api_key)

    # Prepare parts: text + input image as inline_data Blob
    img_bytes, img_mime = load_image_bytes(image_path)
    parts: list[types.Part] = [
        types.Part(text=prompt),
        types.Part(inline_data=types.Blob(mime_type=img_mime, data=img_bytes)),
    ]

    model = "gemini-2.5-flash-image-preview"
    print(f"Calling model: {model}")

    response = client.models.generate_content(
        model=model,
        contents=parts,
    )

    # Print model_version if provided
    model_version = getattr(response, "model_version", None)
    if model_version is None and hasattr(response, "to_dict"):
        model_version = response.to_dict().get("model_version")
    if model_version:
        print("Response model_version:", model_version)

    # Iterate parts and save any inline images
    image_count = 0
    for cand in getattr(response, "candidates", []) or []:
        content = getattr(cand, "content", None)
        parts = getattr(content, "parts", []) if content else []
        for p in parts:
            text = getattr(p, "text", None)
            if text:
                print(text)
                continue
            inline = getattr(p, "inline_data", None)
            if inline and getattr(inline, "data", None):
                b = inline.data
                if isinstance(b, bytes):
                    data_bytes = b
                else:
                    # SDK typically returns bytes; if base64 string, decode
                    import base64

                    data_bytes = base64.b64decode(b)
                mime = getattr(inline, "mime_type", None) or "image/png"
                ext = ".png" if mime == "image/png" else ".jpg"
                image_count += 1
                out_name = f"generated_image_{image_count}{ext}"
                with open(out_name, "wb") as f:
                    f.write(data_bytes)
                print(f"Saved {out_name} ({len(data_bytes)} bytes, mime={mime})")

    if image_count == 0:
        print("No inline image returned by the model.")


if __name__ == "__main__":
    main()
