#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_images():
    """Create all missing image assets for the NexVision application"""
    
    print("Creating hero background image...")
    hero_bg = Image.new('RGB', (1920, 1080), color='#4a5568')
    draw = ImageDraw.Draw(hero_bg)
    for y in range(1080):
        color_val = int(74 + (45 - 74) * (y / 1080))
        draw.line([(0, y), (1920, y)], fill=(color_val, color_val + 10, color_val + 20))
    hero_bg.save('public/hero-bg.jpg', 'JPEG', quality=85)
    
    print("Creating demo before image...")
    demo_before = Image.new('RGB', (800, 600), color='#8B4513')
    draw = ImageDraw.Draw(demo_before)
    draw.rectangle([50, 50, 750, 550], fill='#DEB887', outline='#654321', width=3)
    draw.rectangle([100, 100, 300, 400], fill='#A0522D', outline='#654321', width=2)
    draw.rectangle([400, 150, 650, 350], fill='#2F4F4F', outline='#000000', width=2)
    draw.rectangle([200, 450, 600, 500], fill='#8B4513', outline='#654321', width=2)
    
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
    except:
        font = ImageFont.load_default()
    
    draw.text((250, 520), 'Traditional Living Room', fill='#000000', font=font)
    demo_before.save('public/home-demo-before.jpg', 'JPEG', quality=85)
    
    print("Creating demo after image...")
    demo_after = Image.new('RGB', (800, 600), color='#F5F5F5')
    draw = ImageDraw.Draw(demo_after)
    draw.rectangle([50, 50, 750, 550], fill='#FFFFFF', outline='#CCCCCC', width=3)
    draw.rectangle([100, 100, 300, 400], fill='#4169E1', outline='#000080', width=2)
    draw.rectangle([400, 150, 650, 350], fill='#000000', outline='#333333', width=2)
    draw.rectangle([200, 450, 600, 500], fill='#DCDCDC', outline='#A9A9A9', width=2)
    
    draw.text((250, 520), 'Modern Living Room', fill='#333333', font=font)
    demo_after.save('public/home-demo-after.jpg', 'JPEG', quality=85)
    
    print("Creating NexVision logo...")
    logo = Image.new('RGBA', (120, 120), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(logo)
    
    draw.ellipse([10, 10, 110, 110], fill='#FF7F50', outline='#FF6B3D', width=3)
    
    try:
        font_large = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 36)
    except:
        font_large = ImageFont.load_default()
    
    draw.text((35, 35), 'NV', fill='#FFFFFF', font=font_large)
    logo.save('public/nexvision-logo.png', 'PNG')
    
    print("All images created successfully!")
    print("Created files:")
    print("- public/hero-bg.jpg")
    print("- public/home-demo-before.jpg") 
    print("- public/home-demo-after.jpg")
    print("- public/nexvision-logo.png")

if __name__ == "__main__":
    create_images()
