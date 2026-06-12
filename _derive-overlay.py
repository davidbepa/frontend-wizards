#!/usr/bin/env python3
# Derive the wizard LINE overlay from the photoreal wizard, so the glitch flash
# (which uses the overlay) is the exact same person in the exact same position
# as the hover reveal (which uses the photo). Run after regenerating the photo:
#   python3 _derive-overlay.py
# Input : public/wizard-real.jpg   (photoreal wizard, framed like the developer)
# Output: public/wizard-overlay.jpg (white edge-lines on black; the shader tints
#         it gold). Same dimensions → pixel-perfect registration with the photo.

import numpy as np
from PIL import Image, ImageFilter

SRC = "public/wizard-real.jpg"
OUT = "public/wizard-overlay.jpg"

# Grayscale + a mild blur so we trace shapes, not film grain.
im = Image.open(SRC).convert("L").filter(ImageFilter.GaussianBlur(1.1))
a = np.asarray(im, dtype=np.float32) / 255.0

# Sobel gradient magnitude.
ap = np.pad(a, 1, mode="edge")
gx = (
    -ap[:-2, :-2] - 2 * ap[1:-1, :-2] - ap[2:, :-2]
    + ap[:-2, 2:] + 2 * ap[1:-1, 2:] + ap[2:, 2:]
)
gy = (
    -ap[:-2, :-2] - 2 * ap[:-2, 1:-1] - ap[:-2, 2:]
    + ap[2:, :-2] + 2 * ap[2:, 1:-1] + ap[2:, 2:]
)
mag = np.sqrt(gx * gx + gy * gy)
mag /= mag.max() + 1e-6

# Soft threshold to drop faint texture and keep confident contours, then a gentle
# gamma to make the lines glow.
mag = np.clip((mag - 0.09) / (0.55 - 0.09), 0.0, 1.0) ** 0.85

out = (mag * 255.0).astype(np.uint8)
Image.fromarray(out, "L").save(OUT, quality=88)
print(f"wrote {OUT}  {out.shape[1]}x{out.shape[0]}  (edges of {SRC})")
