import os
import sys
import subprocess
from PIL import Image, ImageDraw

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC_DIR = os.path.join(PROJECT_ROOT, 'public')
RES_DIR = os.path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res')
LOGO_SVG = os.path.join(PUBLIC_DIR, 'logo.svg')
MASTER_PNG = os.path.join(PUBLIC_DIR, 'master-logo.png')
CAT_SVG = os.path.join(PUBLIC_DIR, 'cat-character.svg')
CAT_PNG = os.path.join(PUBLIC_DIR, 'cat-character.png')
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

print("🎨 1. Extracting cat character without background squircle...")
with open(LOGO_SVG, 'r', encoding='utf-8') as f:
    svg_lines = f.readlines()

# Remove line with index 2 (<path d="M777.143 0H22.8571..." fill="url(#paint0_radial_646_5466)"/>)
cat_lines = [line for i, line in enumerate(svg_lines) if i != 2]
with open(CAT_SVG, 'w', encoding='utf-8') as f:
    f.writelines(cat_lines)

print("🎨 2. Rendering high-res PNGs with Edge headless...")
for svg_file, png_file in [(LOGO_SVG, MASTER_PNG), (CAT_SVG, CAT_PNG)]:
    cmd = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--default-background-color=00000000",
        "--window-size=800,800",
        f"--screenshot={png_file}",
        f"file:///{svg_file.replace(os.sep, '/')}"
    ]
    subprocess.run(cmd, check=True)

# Crop full logo
master_im = Image.open(MASTER_PNG)
bbox = master_im.getbbox()
logo_cropped = master_im.crop(bbox) if bbox else master_im
logo_w, logo_h = logo_cropped.size
print(f"   Cropped full logo: {logo_w}x{logo_h}")

# Crop cat character
cat_im = Image.open(CAT_PNG)
cat_bbox = cat_im.getbbox()
cat_cropped = cat_im.crop(cat_bbox) if cat_bbox else cat_im
cat_w, cat_h = cat_cropped.size
print(f"   Cropped cat character: {cat_w}x{cat_h}")

# Colors
BRAND_CREAM = (255, 242, 201, 255) # #FFF2C9
BRAND_CREAM_HEX = "#FFF2C9"
SPLASH_BG = (255, 245, 247, 255)  # #FFF5F7 (Catlendar pink)

def create_adaptive_foreground(size):
    """Adaptive icon foreground (108dp canvas with safe zone ~72dp = 66%)."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    # Target cat width is 62% of size (fits well within safe zone 66-72dp)
    target_w = int(size * 0.62)
    target_h = int(target_w * (cat_h / cat_w))
    
    resized_cat = cat_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (size - target_w) // 2
    # Vertically center with slight optical offset for ears
    y = (size - target_h) // 2 - int(size * 0.01)
    canvas.paste(resized_cat, (x, y), resized_cat)
    return canvas

def create_legacy_icon(size, is_round=False):
    """Legacy launcher icon with soft cream background and cute cat."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    
    if is_round:
        draw.ellipse([(0, 0), (size - 1, size - 1)], fill=BRAND_CREAM)
    else:
        corner_r = int(size * 0.22)
        draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=corner_r, fill=BRAND_CREAM)
        
    target_w = int(size * 0.72)
    target_h = int(target_w * (cat_h / cat_w))
    resized_cat = cat_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    x = (size - target_w) // 2
    y = (size - target_h) // 2 - int(size * 0.01)
    canvas.paste(resized_cat, (x, y), resized_cat)
    return canvas

print("📱 3. Generating mipmap icon sets...")
MIPMAP_SPECS = [
    ('mipmap-mdpi', 48, 108),
    ('mipmap-hdpi', 72, 162),
    ('mipmap-xhdpi', 96, 216),
    ('mipmap-xxhdpi', 144, 324),
    ('mipmap-xxxhdpi', 192, 432),
]

for folder, icon_size, fg_size in MIPMAP_SPECS:
    folder_path = os.path.join(RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # 1. ic_launcher.png (legacy square/squircle)
    legacy = create_legacy_icon(icon_size, is_round=False)
    legacy.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
    
    # 2. ic_launcher_round.png (legacy round)
    round_icon = create_legacy_icon(icon_size, is_round=True)
    round_icon.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')
    
    # 3. ic_launcher_foreground.png (adaptive foreground)
    fg = create_adaptive_foreground(fg_size)
    fg.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')
    
    print(f"   ✓ {folder}: icon {icon_size}x{icon_size}, fg {fg_size}x{fg_size}")

print("✨ 4. Generating splash screens with logo...")
SPLASH_SPECS = [
    ('drawable', 480, 800),
    ('drawable-land-mdpi', 480, 320),
    ('drawable-land-hdpi', 800, 480),
    ('drawable-land-xhdpi', 1280, 720),
    ('drawable-land-xxhdpi', 1600, 960),
    ('drawable-land-xxxhdpi', 1920, 1280),
    ('drawable-port-mdpi', 320, 480),
    ('drawable-port-hdpi', 480, 800),
    ('drawable-port-xhdpi', 720, 1280),
    ('drawable-port-xxhdpi', 960, 1600),
    ('drawable-port-xxxhdpi', 1280, 1920),
]

for folder, width, height in SPLASH_SPECS:
    folder_path = os.path.join(RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    splash = Image.new('RGBA', (width, height), SPLASH_BG)
    # Full squircle logo target height is ~35% of min(width, height)
    min_dim = min(width, height)
    target_h = int(min_dim * 0.35)
    target_w = int(target_h * (logo_w / logo_h))
    
    resized_logo = logo_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (width - target_w) // 2
    y = (height - target_h) // 2
    splash.paste(resized_logo, (x, y), resized_logo)
    splash.save(os.path.join(folder_path, 'splash.png'), 'PNG')

print("🧹 5. Removing conflicting vector drawables...")
obsolete_files = [
    os.path.join(RES_DIR, 'drawable-v24', 'ic_launcher_foreground.xml'),
    os.path.join(RES_DIR, 'drawable', 'ic_launcher_background.xml'),
]
for f in obsolete_files:
    if os.path.exists(f):
        os.remove(f)
        print(f"   ✓ Removed obsolete file: {os.path.basename(f)}")

print(f"🎨 6. Updating ic_launcher_background.xml to brand cream {BRAND_CREAM_HEX}...")
bg_xml_path = os.path.join(RES_DIR, 'values', 'ic_launcher_background.xml')
with open(bg_xml_path, 'w', encoding='utf-8') as f:
    f.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{BRAND_CREAM_HEX}</color>\n</resources>\n')

print("🌐 7. Generating web icons (pwa/favicon)...")
# Favicon 32x32: cat face
fav32 = cat_cropped.resize((32, int(32 * (cat_h / cat_w))), Image.Resampling.LANCZOS)
fav32_canvas = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
fav32_canvas.paste(fav32, (0, (32 - fav32.size[1]) // 2), fav32)
fav32_canvas.save(os.path.join(PUBLIC_DIR, 'favicon-32x32.png'), 'PNG')

# PWA icons: full logo
fav192 = logo_cropped.resize((192, 192), Image.Resampling.LANCZOS)
fav192.save(os.path.join(PUBLIC_DIR, 'pwa-192x192.png'), 'PNG')

fav512 = logo_cropped.resize((512, 512), Image.Resampling.LANCZOS)
fav512.save(os.path.join(PUBLIC_DIR, 'pwa-512x512.png'), 'PNG')

# Copy logo.svg to favicon.svg
with open(LOGO_SVG, 'r', encoding='utf-8') as src_f:
    svg_content = src_f.read()
with open(os.path.join(PUBLIC_DIR, 'favicon.svg'), 'w', encoding='utf-8') as dest_f:
    dest_f.write(svg_content)

# Clean up temporary SVG/PNG
for tmp_f in [CAT_SVG, CAT_PNG]:
    if os.path.exists(tmp_f):
        os.remove(tmp_f)

print("✅ All icons and splash screens successfully generated!")
