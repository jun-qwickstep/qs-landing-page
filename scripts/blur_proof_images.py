"""Blur PII regions on proof screenshots and write the blurred copies into
proof_assets/deployed/ for proof.html to consume.

Reads originals from proof_assets/not_deployed/ and writes to proof_assets/deployed/.
- Phone (10 booked): blur the right column where client names + dates live
- Instantly: blur ONLY the email-address line under each notification
- Positive-response screenshots: blur the sender email on line 1
- Ryan's calendar: blur each cell's event content (leaving date numbers crisp)
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "proof_assets")
SOURCE = os.path.join(ASSETS, "not_deployed")
OUTPUT = os.path.join(ASSETS, "deployed")


def blur_region(img, box, radius=10):
    """Blur a single (left, top, right, bottom) region in-place."""
    region = img.crop(box).filter(ImageFilter.GaussianBlur(radius=radius))
    img.paste(region, box[:2])


# ─── 10 booked appointments: blur the right column where names + dates live ───
phone = Image.open(os.path.join(SOURCE, "10 booked appointments.PNG")).convert("RGB")
blur_region(phone, (420, 80, 1100, 2556), radius=22)
phone.save(os.path.join(OUTPUT, "10 booked appointments blurred.png"))
print("saved: 10 booked appointments blurred.png")


# ─── Instantly: blur each card's email line (line 3 of 3) — leave titles intact ───
inst = Image.open(os.path.join(SOURCE, "instantly new sales opportunities.PNG")).convert("RGB")
email_ys = [560, 810, 1060, 1315, 1580, 1860, 2105]
for y in email_ys:
    blur_region(inst, (200, y - 30, 970, y + 30), radius=18)
inst.save(os.path.join(OUTPUT, "instantly new sales opportunities blurred.png"))
print("saved: instantly new sales opportunities blurred.png")


# ─── Positive-response screenshots: blur the sender email only ───
positive_responses = [
    ("interested in hearing more.png",        (485, 8, 845, 56)),
    ("outreach is amazing, im all ears.png",  (478, 8, 875, 58)),
    ("would love to chat.png",                (420, 12, 760, 62)),
]
for fname, box in positive_responses:
    p = Image.open(os.path.join(SOURCE, fname)).convert("RGB")
    blur_region(p, box, radius=14)
    out_name = fname.rsplit(".", 1)[0] + " blurred.png"
    p.save(os.path.join(OUTPUT, out_name))
    print(f"saved: {out_name}")


# ─── Ryan's calendar: blur each cell's content area (preserve date numbers) ───
cal = Image.open(os.path.join(SOURCE, "ryan's fully filled calendar.png")).convert("RGB")
W, H = cal.size  # 889 × 848
HEADER_H = 22
DATE_NUM_W = 22
DATE_NUM_H = 18
COLS, ROWS = 7, 3
col_w = W / COLS
row_h = (H - HEADER_H) / ROWS

for r in range(ROWS):
    for c in range(COLS):
        cell_x = int(c * col_w)
        cell_y = int(HEADER_H + r * row_h)
        cell_x2 = int((c + 1) * col_w) - 2
        cell_y2 = int(HEADER_H + (r + 1) * row_h) - 2
        # row right of date number (preserve top-left date corner)
        blur_region(cal, (cell_x + DATE_NUM_W, cell_y + 2, cell_x2, cell_y + DATE_NUM_H + 6), radius=8)
        # everything below the date-number row
        blur_region(cal, (cell_x + 2, cell_y + DATE_NUM_H, cell_x2, cell_y2), radius=8)

cal.save(os.path.join(OUTPUT, "ryan's fully filled calendar blurred.png"))
print("saved: ryan's fully filled calendar blurred.png")
