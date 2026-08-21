#!/usr/bin/env python3
"""Create a compact ZWS logo for embedding in generated SVG maps."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Image.open(root / "ZWS.png").convert("RGBA")
source.resize((220, 220), Image.Resampling.LANCZOS).save(
    root / "zws-map-mark.webp", "WEBP", quality=88, method=6
)
