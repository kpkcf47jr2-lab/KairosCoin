#!/usr/bin/env python3
"""Convert Kairos Wallet logo from PDF to PNG at multiple sizes."""
import os
import Quartz

pdf_path = os.path.expanduser("~/Downloads/Kairos 2.pdf")
output_dir = os.path.dirname(os.path.abspath(__file__))

# Open PDF
pdf_url = Quartz.CFURLCreateFromFileSystemRepresentation(
    None, pdf_path.encode(), len(pdf_path.encode()), False
)
pdf_doc = Quartz.CGPDFDocumentCreateWithURL(pdf_url)
page = Quartz.CGPDFDocumentGetPage(pdf_doc, 1)
rect = Quartz.CGPDFPageGetBoxRect(page, Quartz.kCGPDFMediaBox)
print(f"PDF page size: {rect.size.width} x {rect.size.height}")

# Render at high resolution
scale = 4
width = int(rect.size.width * scale)
height = int(rect.size.height * scale)

cs = Quartz.CGColorSpaceCreateDeviceRGB()
ctx = Quartz.CGBitmapContextCreate(
    None, width, height, 8, width * 4, cs, Quartz.kCGImageAlphaPremultipliedLast
)

# Transparent background
Quartz.CGContextSetRGBFillColor(ctx, 0, 0, 0, 0)
Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(0, 0, width, height))

# Scale and draw PDF
Quartz.CGContextScaleCTM(ctx, scale, scale)
Quartz.CGContextDrawPDFPage(ctx, page)

# Get rendered image
image = Quartz.CGBitmapContextCreateImage(ctx)

# Save at multiple sizes
sizes = [
    (512, "logo-512.png"),
    (192, "logo-192.png"),
    (180, "logo-180.png"),
    (32, "favicon-32.png"),
    (16, "favicon-16.png"),
]

for size, name in sizes:
    out_path = os.path.join(output_dir, name)
    url = Quartz.CFURLCreateFromFileSystemRepresentation(
        None, out_path.encode(), len(out_path.encode()), False
    )
    dest = Quartz.CGImageDestinationCreateWithURL(url, "public.png", 1, None)

    # Resize
    resize_ctx = Quartz.CGBitmapContextCreate(
        None, size, size, 8, size * 4, cs, Quartz.kCGImageAlphaPremultipliedLast
    )
    Quartz.CGContextSetInterpolationQuality(
        resize_ctx, Quartz.kCGInterpolationHigh
    )
    Quartz.CGContextDrawImage(
        resize_ctx, Quartz.CGRectMake(0, 0, size, size), image
    )
    resized = Quartz.CGBitmapContextCreateImage(resize_ctx)

    Quartz.CGImageDestinationAddImage(dest, resized, None)
    Quartz.CGImageDestinationFinalize(dest)
    print(f"Created {name} ({size}x{size})")

# Full resolution
out_path = os.path.join(output_dir, "logo-full.png")
url = Quartz.CFURLCreateFromFileSystemRepresentation(
    None, out_path.encode(), len(out_path.encode()), False
)
dest = Quartz.CGImageDestinationCreateWithURL(url, "public.png", 1, None)
Quartz.CGImageDestinationAddImage(dest, image, None)
Quartz.CGImageDestinationFinalize(dest)
print(f"Created logo-full.png ({width}x{height})")
print("Done!")
