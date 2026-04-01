import glob
import re

files = glob.glob('app/*.tsx') + glob.glob('app/(tabs)/*.tsx')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        c = file.read()
    orig = c
    
    # Fix " , Image }" -> ", Image }"
    c = c.replace(' , Image }', ', Image }')
    
    # Fix ", Image }" at start of line (broken multi-line import)
    c = re.sub(r'\n, Image \} from', ', Image } from', c)
    c = re.sub(r'\r\n, Image \} from', ', Image } from', c)
    
    if orig != c:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(c)
        print('Cleaned import in', f)

print('Done')
