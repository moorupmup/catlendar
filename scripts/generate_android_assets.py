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
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

print("🎨 1. Rendering high-res SVG master PNG with Edge headless...")
cmd = [
    EDGE_PATH,
    "--headless=new",
    "--disable-gpu",
    "--default-background-color=00000000",
    "--window-size=1200,1200",
    f"--screenshot={MASTER_PNG}",
    f"file:///{LOGO_SVG.replace(os.sep, '/')}"
]
subprocess.run(cmd, check=True)

print("🔍 2. Loading and cropping master logo...")
master_im = Image.open(MASTER_PNG)
bbox = master_im.getbbox()
if bbox:
    logo_cropped = master_im.crop(bbox)
else:
    logo_cropped = master_im

logo_w, logo_h = logo_cropped.size
print(f"   Cropped logo dimensions: {logo_w}x{logo_h}")

BG_COLOR = (255, 245, 247, 255) # #FFF5F7 (Catlendar pastel pink)
BG_COLOR_RGB = (255, 245, 247)

def create_adaptive_foreground(size):
    """Adaptive icon foreground (108dp canvas with safe zone ~72dp = 68-72%)."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    target_h = int(size * 0.70)
    aspect = logo_w / logo_h
    target_w = int(target_h * aspect)
    
    resized_logo = logo_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    canvas.paste(resized_logo, (x, y), resized_logo)
    return canvas

def create_legacy_icon(size, is_round=False):
    """Legacy launcher icon with pastel background."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    
    if is_round:
        draw.ellipse([(0, 0), (size - 1, size - 1)], fill=BG_COLOR)
    else:
        corner_r = int(size * 0.22)
        draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=corner_r, fill=BG_COLOR)
        
    target_h = int(size * 0.75)
    aspect = logo_w / logo_h
    target_w = int(target_h * aspect)
    resized_logo = logo_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    canvas.paste(resized_logo, (x, y), resized_logo)
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
    
    splash = Image.new('RGBA', (width, height), BG_COLOR)
    # Logo target height is ~25% of min(width, height)
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

print("🎨 6. Updating ic_launcher_background.xml to brand pink #FFF5F7...")
bg_xml_path = os.path.join(RES_DIR, 'values', 'ic_launcher_background.xml')
with open(bg_xml_path, 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFF5F7</color>\n</resources>\n')

print("🌐 7. Generating web icons (pwa/favicon)...")
# Favicon 32x32, 64x64, 192x192, 512x512
fav32 = logo_cropped.resize((32, 32), Image.Resampling.LANCZOS)
fav32.save(os.path.join(PUBLIC_DIR, 'favicon-32x32.png'), 'PNG')

fav192 = create_legacy_icon(192, is_round=False)
fav192.save(os.path.join(PUBLIC_DIR, 'pwa-192x192.png'), 'PNG')

fav512 = create_legacy_icon(512, is_round=False)
fav512.save(os.path.join(PUBLIC_DIR, 'pwa-512x512.png'), 'PNG')

# Copy logo.svg to favicon.svg
with open(LOGO_SVG, 'r', encoding='utf-8') as src_f:
    svg_content = src_f.read()
with open(os.path.join(PUBLIC_DIR, 'favicon.svg'), 'w', encoding='utf-8') as dest_f:
    dest_f.write(svg_content)

print("✅ All icons and splash screens successfully generated!")
