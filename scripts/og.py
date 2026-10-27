# Imagen para compartir (Open Graph, 1200x630) y apple-touch-icon, con el estilo del grafo.
#   python3 scripts/og.py   (requiere Pillow y la fuente JetBrains Mono en el sistema)
import math, random
from PIL import Image, ImageDraw, ImageFont

FONDO, TINTA, ROJO, GRIS = (8, 8, 8), (236, 236, 234), (179, 35, 43), (111, 109, 105)
MONO = '/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-Bold.ttf'
MONO_R = '/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-Regular.ttf'

def grafo(d, w, h, n, semilla, hubs=()):
    r = random.Random(semilla)
    pts = [(r.uniform(0, w), r.uniform(0, h)) for _ in range(n)]
    for i, (x, y) in enumerate(pts):  # cada punto con sus 2 vecinos más cercanos
        cerca = sorted(range(n), key=lambda j: (pts[j][0]-x)**2 + (pts[j][1]-y)**2)[1:3]
        for j in cerca:
            d.line([pts[i], pts[j]], fill=(40, 40, 40), width=1)
    for i, (x, y) in enumerate(pts):
        c = ROJO if r.random() < 0.06 else (90, 90, 88)
        rad = r.uniform(1.2, 2.6)
        d.ellipse([x-rad, y-rad, x+rad, y+rad], fill=c)
    for (x, y) in hubs:
        for k in range(10):
            a = k / 10 * math.tau
            d.line([(x, y), (x + math.cos(a) * 70, y + math.sin(a) * 50)], fill=(55, 55, 55), width=1)
        d.ellipse([x-26, y-26, x+26, y+26], outline=TINTA, width=3, fill=FONDO)

og = Image.new('RGB', (1200, 630), FONDO)
d = ImageDraw.Draw(og)
grafo(d, 1200, 630, 260, 7, hubs=[(140, 120), (1060, 140), (1090, 500), (170, 520), (600, 560)])
nombre = ImageFont.truetype(MONO, 66)
d.text((600, 270), 'Bryan Iban Mamani Quispe', font=nombre, fill=TINTA, anchor='mm')
w = d.textlength('Bryan Iban Mamani Quispe', font=nombre)
d.text((600 + w / 2, 318), '@bryanmq-dev', font=ImageFont.truetype(MONO_R, 28), fill=ROJO, anchor='rm')
d.text((600, 392), 'Full-stack developer · proyectos, IA y comunidad', font=ImageFont.truetype(MONO_R, 26), fill=GRIS, anchor='mm')
d.rectangle([600 + w / 2 + 6, 290, 600 + w / 2 + 40, 296], fill=ROJO)  # el cursor "_"
og.save('public/og.png', optimize=True)

ic = Image.new('RGB', (180, 180), (13, 13, 13))
d = ImageDraw.Draw(ic)
a, b, c = (52, 58), (128, 58), (90, 126)
d.line([a, b, c, a], fill=TINTA, width=6)
for p, col, rad in ((a, TINTA, 16), (b, TINTA, 16), (c, ROJO, 19)):
    d.ellipse([p[0]-rad, p[1]-rad, p[0]+rad, p[1]+rad], fill=col)
ic.save('public/apple-touch-icon.png', optimize=True)
