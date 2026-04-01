import glob
import re

files = glob.glob('app/*.tsx') + glob.glob('app/(tabs)/*.tsx')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        c = file.read()
    orig = c
    # Fix patterns like '#1E2F23'Primary -> DESIGN.textPrimary
    c = re.sub(r"'#1E2F23'([A-Za-z]+)", r'DESIGN.text\1', c)
    if orig != c:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(c)
        print('Fixed in', f)

print('Done')
