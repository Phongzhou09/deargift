import re

for tid in [21, 53, 65, 69]:
    fname = f'demos/demo_{tid}.html'
    try:
        with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
            c = f.read()
        print(f"=== {fname} ===")
        # check iframes, audio, scripts
        iframes = re.findall(r'<iframe[^>]+src=[\"\']([^\"\']+)[\"\']', c)
        audios = re.findall(r'(?:bgMusic|music|audio)[\"\']?\s*:\s*[\"\']([^\"\']+)[\"\']', c)
        print("  iframes:", iframes)
        print("  audios:", audios)
    except Exception as e:
        print(f"Error {fname}:", e)
