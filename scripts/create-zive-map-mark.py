#!/usr/bin/env python3
"""Create a compact ZIVE logo crop for embedding in generated SVG maps."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Image.open(root / "ZIVE.png").convert("RGBA")
# Keep the central radar/ZIVE mark; the full square contains small tagline text
# that is not legible in a map header.
mark = source.crop((70, 145, 970, 660)).resize((320, 183), Image.Resampling.LANCZOS)
mark.save(root / "zive-map-mark.webp", "WEBP", quality=88, method=6)
