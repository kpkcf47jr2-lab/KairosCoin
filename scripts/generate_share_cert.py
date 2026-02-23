from fpdf import FPDF

pdf = FPDF(orientation='P', unit='mm', format='Letter')
pdf.add_page()
pdf.set_auto_page_break(auto=False)

W = 215.9
H = 279.4
margin = 15

# ── Gold border (double line effect) ──
pdf.set_draw_color(212, 175, 55)
pdf.set_line_width(0.8)
pdf.rect(margin, margin, W - 2*margin, H - 2*margin)
pdf.set_line_width(0.3)
pdf.rect(margin + 3, margin + 3, W - 2*margin - 6, H - 2*margin - 6)

# ── Header ──
pdf.set_y(25)
pdf.set_font('Helvetica', 'B', 28)
pdf.set_text_color(26, 26, 26)
pdf.cell(0, 12, 'KAIROS 777 INC', align='C', new_x="LMARGIN", new_y="NEXT")

pdf.set_font('Helvetica', '', 10)
pdf.set_text_color(120, 120, 120)
pdf.cell(0, 6, 'Blockchain Financial Technology', align='C', new_x="LMARGIN", new_y="NEXT")

# Gold divider
pdf.set_draw_color(212, 175, 55)
pdf.set_line_width(0.6)
pdf.line(W/2 - 40, pdf.get_y() + 4, W/2 + 40, pdf.get_y() + 4)
pdf.ln(12)

# ── Title ──
pdf.set_font('Helvetica', 'B', 24)
pdf.set_text_color(212, 175, 55)
pdf.cell(0, 12, 'SHARE CERTIFICATE', align='C', new_x="LMARGIN", new_y="NEXT")

pdf.set_font('Helvetica', '', 11)
pdf.set_text_color(140, 140, 140)
pdf.cell(0, 7, 'Capitalization Table & Ownership Breakdown', align='C', new_x="LMARGIN", new_y="NEXT")

pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(170, 170, 170)
pdf.cell(0, 7, 'Certificate No. KAI-2026-001', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.ln(8)

# ── Company Information Section ──
pdf.set_font('Helvetica', 'B', 9)
pdf.set_text_color(160, 160, 160)
pdf.cell(0, 6, '    COMPANY INFORMATION', new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)

x_left = 25
x_right = W/2 + 5
box_w = (W - 50) / 2 - 5
box_h = 18

def info_box(x, y, label, value):
    pdf.set_fill_color(248, 248, 248)
    pdf.set_draw_color(230, 230, 230)
    pdf.rect(x, y, box_w, box_h, style='DF')
    pdf.set_xy(x + 3, y + 2)
    pdf.set_font('Helvetica', '', 7)
    pdf.set_text_color(160, 160, 160)
    pdf.cell(box_w - 6, 5, label)
    pdf.set_xy(x + 3, y + 8)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(26, 26, 26)
    pdf.cell(box_w - 6, 7, value)

y0 = pdf.get_y()
info_box(x_left, y0, 'LEGAL ENTITY NAME', 'Kairos 777 Inc')
info_box(x_right, y0, 'ENTITY TYPE', 'Corporation')

y1 = y0 + box_h + 4
info_box(x_left, y1, 'DATE OF ISSUANCE', 'February 22, 2026')
info_box(x_right, y1, 'TOTAL AUTHORIZED SHARES', '1,000 Common Shares')

pdf.set_y(y1 + box_h + 12)

# ── Ownership Table ──
pdf.set_font('Helvetica', 'B', 9)
pdf.set_text_color(160, 160, 160)
pdf.cell(0, 6, '    OWNERSHIP BREAKDOWN', new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)

table_x = 25
table_w = W - 50
col_widths = [table_w * 0.35, table_w * 0.30, table_w * 0.17, table_w * 0.18]
headers = ['Shareholder Name', 'Role', 'Shares Held', 'Ownership %']

# Header row
pdf.set_fill_color(26, 26, 26)
pdf.set_text_color(212, 175, 55)
pdf.set_font('Helvetica', 'B', 9)
x = table_x
y_table = pdf.get_y()
for i, h in enumerate(headers):
    pdf.set_xy(x, y_table)
    align = 'C' if i >= 2 else 'L'
    pdf.cell(col_widths[i], 10, '  ' + h if i < 2 else h, fill=True, align=align)
    x += col_widths[i]
pdf.ln(10)

# Data row
pdf.set_fill_color(255, 255, 255)
pdf.set_text_color(50, 50, 50)
pdf.set_font('Helvetica', '', 11)
data = ['Mario Isaac', 'Founder & Director', '1,000', '100%']
x = table_x
y_data = pdf.get_y()
for i, d in enumerate(data):
    pdf.set_xy(x, y_data)
    align = 'C' if i >= 2 else 'L'
    fw = 'B' if i >= 2 else ''
    pdf.set_font('Helvetica', fw, 11)
    pdf.cell(col_widths[i], 12, '  ' + d if i < 2 else d, align=align)
    x += col_widths[i]

# Bottom border of data row
pdf.set_draw_color(230, 230, 230)
pdf.line(table_x, y_data + 12, table_x + table_w, y_data + 12)
pdf.ln(12)

# Total row
pdf.set_draw_color(212, 175, 55)
pdf.set_line_width(0.5)
pdf.line(table_x, pdf.get_y(), table_x + table_w, pdf.get_y())

pdf.set_fill_color(247, 245, 239)
pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(26, 26, 26)
x = table_x
y_tot = pdf.get_y()
pdf.set_xy(x, y_tot)
pdf.cell(col_widths[0] + col_widths[1], 11, '  TOTAL', fill=True)
x += col_widths[0] + col_widths[1]
pdf.set_xy(x, y_tot)
pdf.cell(col_widths[2], 11, '1,000', fill=True, align='C')
x += col_widths[2]
pdf.set_xy(x, y_tot)
pdf.cell(col_widths[3], 11, '100%', fill=True, align='C')
pdf.ln(18)

# ── Certification Statement ──
pdf.set_fill_color(253, 252, 247)
pdf.set_draw_color(232, 226, 200)
cert_x = 25
cert_w = W - 50
cert_y = pdf.get_y()
pdf.rect(cert_x, cert_y, cert_w, 30, style='DF')
pdf.set_xy(cert_x + 5, cert_y + 4)
pdf.set_font('Helvetica', 'B', 10)
pdf.set_text_color(50, 50, 50)
pdf.cell(20, 5, 'Certification: ', new_x="END")
pdf.set_font('Helvetica', '', 9.5)
pdf.set_text_color(80, 80, 80)
pdf.set_xy(cert_x + 5, cert_y + 4)
pdf.multi_cell(cert_w - 10, 5,
    'Certification: This is to certify that the above ownership breakdown is a true and accurate '
    'representation of the capitalization structure of Kairos 777 Inc as of the date stated above. '
    'The shares listed are fully paid and non-assessable. This certificate is issued in accordance '
    'with the company\'s Articles of Incorporation and Bylaws.')

pdf.set_y(cert_y + 38)

# ── Signature Section ──
sig_y = pdf.get_y() + 5

# Typed signature name (like a digital signature)
pdf.set_font('Helvetica', 'BI', 20)
pdf.set_text_color(26, 26, 26)
pdf.set_xy(25, sig_y)
pdf.cell(80, 10, 'Mario Isaac', align='C')

# Date value
pdf.set_xy(W/2 + 5, sig_y)
pdf.set_font('Helvetica', '', 14)
pdf.cell(80, 10, 'February 22, 2026', align='C')

# Lines under signatures
line_y = sig_y + 14
pdf.set_draw_color(26, 26, 26)
pdf.set_line_width(0.5)
pdf.line(25, line_y, 105, line_y)
pdf.line(W/2 + 5, line_y, W/2 + 85, line_y)

# Labels under lines
pdf.set_font('Helvetica', 'B', 10)
pdf.set_text_color(26, 26, 26)
pdf.set_xy(25, line_y + 2)
pdf.cell(80, 6, 'Mario Isaac', align='C')
pdf.set_xy(W/2 + 5, line_y + 2)
pdf.cell(80, 6, 'Date', align='C')

pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(140, 140, 140)
pdf.set_xy(25, line_y + 8)
pdf.cell(80, 5, 'Founder & Director', align='C')

# ── Footer ──
pdf.set_draw_color(212, 175, 55)
pdf.set_line_width(0.5)
footer_y = H - 25
pdf.line(W/2 - 25, footer_y, W/2 + 25, footer_y)

pdf.set_font('Helvetica', '', 8)
pdf.set_text_color(180, 180, 180)
pdf.set_xy(0, footer_y + 3)
pdf.cell(W, 5, 'KAIROS 777 INC  |  info@kairos-777.com  |  kairos-777.com', align='C')

# ── Save ──
output_path = '/Users/kaizenllc/Desktop/Kairos_777_Share_Certificate.pdf'
pdf.output(output_path)
print(f'PDF saved to: {output_path}')
