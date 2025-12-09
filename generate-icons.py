from PIL import Image, ImageDraw, ImageFont
import os

# Colors
BG_COLOR = (14, 15, 29)  # #0E0F1D
THEME_COLOR = (102, 114, 231)  # #6672E7
WHITE = (255, 255, 255)

def create_icon(size, is_maskable=False):
    """Create an icon with quotes and sparkles"""
    img = Image.new('RGB', (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Calculate padding
    padding = int(size * 0.2) if is_maskable else int(size * 0.1)
    content_size = size - (padding * 2)
    center = size // 2
    
    # Draw gradient circle (simplified - solid color with alpha overlay)
    radius = content_size // 2
    for i in range(radius, 0, -1):
        alpha = int(255 * (1 - (i / radius) * 0.7))
        draw.ellipse(
            [center - i, center - i, center + i, center + i],
            fill=THEME_COLOR + (alpha,)
        )
    
    # Draw quote marks
    try:
        # Try to use a serif font
        font_size = int(size * 0.25)
        font = ImageFont.truetype("georgia.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("C:\\Windows\\Fonts\\georgia.ttf", font_size)
        except:
            # Fallback to default
            font = ImageFont.load_default()
    
    # Left quote
    draw.text((size * 0.25, size * 0.35), '"', fill=WHITE, font=font)
    # Right quote
    draw.text((size * 0.65, size * 0.6), '"', fill=WHITE, font=font)
    
    # Draw simple star sparkles
    star_size = int(size * 0.04)
    
    def draw_star(x, y):
        """Draw a simple 4-pointed star"""
        points = []
        for i in range(8):
            angle = i * 3.14159 / 4
            r = star_size if i % 2 == 0 else star_size // 3
            px = x + int(r * __import__('math').cos(angle))
            py = y + int(r * __import__('math').sin(angle))
            points.append((px, py))
        draw.polygon(points, fill=WHITE)
    
    # Position sparkles
    offset = int(content_size * 0.35)
    draw_star(center - offset, center - offset)
    draw_star(center + offset, center - offset)
    draw_star(center + offset, center + offset)
    
    return img

# Generate icons
icons_dir = os.path.join(os.getcwd(), 'public', 'icons')
os.makedirs(icons_dir, exist_ok=True)

sizes = [192, 512]
for size in sizes:
    # Regular icon
    img = create_icon(size, is_maskable=False)
    filepath = os.path.join(icons_dir, f'icon-{size}.png')
    img.save(filepath, 'PNG', optimize=True)
    file_size = os.path.getsize(filepath) // 1024
    print(f'✓ Generated icon-{size}.png ({file_size}KB)')
    
    # Maskable icon
    img_maskable = create_icon(size, is_maskable=True)
    filepath = os.path.join(icons_dir, f'maskable-{size}.png')
    img_maskable.save(filepath, 'PNG', optimize=True)
    file_size = os.path.getsize(filepath) // 1024
    print(f'✓ Generated maskable-{size}.png ({file_size}KB)')

# Apple touch icon (180x180)
img = create_icon(180, is_maskable=False)
filepath = os.path.join(icons_dir, 'apple-touch-icon.png')
img.save(filepath, 'PNG', optimize=True)
file_size = os.path.getsize(filepath) // 1024
print(f'✓ Generated apple-touch-icon.png ({file_size}KB)')

print('\n✨ All icons generated successfully!')
