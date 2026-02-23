from PyPDF2 import PdfReader

reader = PdfReader('/Users/kaizenllc/Downloads/RMSBX.pdf')
catalog = reader.trailer['/Root'].get_object()

if '/AcroForm' in catalog:
    acroform = catalog['/AcroForm'].get_object()
    print('AcroForm found:', list(acroform.keys()))
    if '/XFA' in acroform:
        print('XFA form detected (Adobe LiveCycle)')
        xfa = acroform['/XFA']
        if isinstance(xfa, list):
            for i, item in enumerate(xfa):
                if isinstance(item, str):
                    print(f'  [{i}] key: {item}')
                else:
                    try:
                        data = item.get_object().get_data()[:500]
                        print(f'  [{i}] data preview: {data[:300]}')
                    except Exception as e:
                        print(f'  [{i}] error: {e}')
        else:
            print('XFA is not a list, type:', type(xfa))
    if '/Fields' in acroform:
        fields = acroform['/Fields']
        print(f'Fields: {len(fields)}')
        for f in fields[:10]:
            obj = f.get_object()
            print(f'  Field: T={obj.get("/T")}, FT={obj.get("/FT")}')
else:
    print('No AcroForm found')
    print('Catalog keys:', list(catalog.keys()))
