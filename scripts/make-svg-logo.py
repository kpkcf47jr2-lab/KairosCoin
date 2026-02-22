from PIL import Image
import base64, io, shutil

img = Image.open('website/kairos-logo.png')
img = img.resize((32, 32), Image.LANCZOS)

buf = io.BytesIO()
img.save(buf, format='PNG', optimize=True)
png_bytes = buf.getvalue()

b64 = base64.b64encode(png_bytes).decode('utf-8')

svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32" viewBox="0 0 32 32">\n'
svg += '  <image width="32" height="32" xlink:href="data:image/png;base64,' + b64 + '"/>\n'
svg += '</svg>\n'

for path in ['assets/branding/kairos-icon-32.svg', 'website/kairos-icon-32.svg']:
    with open(path, 'w') as f:
        f.write(svg)

shutil.copy('website/kairos-icon-32.svg', '../Desktop/website/kairos-icon-32.svg')

img.save('assets/branding/kairos-icon-32.png', optimize=True)

print('32x32 PNG size:', len(png_bytes), 'bytes')
print('Base64 length:', len(b64), 'chars')
print('SVG file size:', len(svg), 'bytes')
print('All files updated!')
