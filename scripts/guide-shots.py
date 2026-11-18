"""Take the pictures of the user guide from the demo copy (fake data only).
usage: python3 scripts/guide-shots.py http://localhost:3201 public/guide
Each picture shows only the part of the page that its guide section explains."""
import sys, shutil, io
from playwright.sync_api import sync_playwright
from PIL import Image

BASE, OUT = sys.argv[1], sys.argv[2]
C1 = "00000000-0000-4000-8000-0000000000c1"  # the demo case with questions, meetings and payments
SAMPLE = "00000000-0000-4000-8000-0000000000c6"

HIDE = "nextjs-portal{display:none!important}"  # the development badge

def section(h2):
    return lambda pg: pg.locator("section", has=pg.locator("h2", has_text=h2)).first

SHOTS = [
    ("home", "/", lambda pg: pg.locator("main div.grid").first),
    ("sample", f"/cases/{SAMPLE}", lambda pg: pg.locator("h1", has_text="بيانات الدعوى والأطراف").locator("xpath=../..")),
    ("cases", "/cases/new", lambda pg: pg.locator("main")),
    ("questions", f"/cases/{C1}", section("أسئلة واستفسارات الخبير")),
    ("events", f"/cases/{C1}", section("المواعيد")),
    ("money", f"/cases/{C1}", section("الأمانة والأتعاب")),
    ("docs", f"/cases/{C1}", section("مستندات ونماذج الخبير")),
    ("bundle", f"/cases/{C1}", section("حافظة المستندات")),
    ("refs", "/refs", lambda pg: pg.locator("main")),
    ("procedures", f"/procedures?case={C1}", lambda pg: pg.locator("main")),
    ("team", "/team", lambda pg: pg.locator("main")),
]

CROP = {"cases": 300}  # pages that are mostly empty space below the part that matters

def save(png, name, max_h=900):
    im = Image.open(io.BytesIO(png)).convert("RGB")
    if im.height > max_h * 2:
        im = im.crop((0, 0, im.width, max_h * 2))
    if im.width > 2000:
        im = im.resize((2000, round(im.height * 2000 / im.width)))
    im.save(f"{OUT}/{name}.webp", "WEBP", quality=78)
    print(name, im.size)

ch = shutil.which("google-chrome") or shutil.which("chromium")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=ch, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=2)
    for name, path, loc in SHOTS:
        pg.goto(BASE + path, wait_until="networkidle")
        pg.add_style_tag(content=HIDE)
        pg.wait_for_timeout(500)
        el = loc(pg)
        el.scroll_into_view_if_needed()
        save(el.screenshot(), name, CROP.get(name, 900))
    # the support window
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.add_style_tag(content=HIDE)
    pg.get_by_label("الدعم والمساعدة").click()
    pg.wait_for_timeout(600)
    save(pg.get_by_role("dialog").screenshot(), "support", 900)
    b.close()
