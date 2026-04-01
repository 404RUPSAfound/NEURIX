import glob

files = glob.glob('app/*.tsx') + glob.glob('app/(tabs)/*.tsx')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        c = file.read()
    orig = c
    
    # Fix broken design texts
    c = c.replace("'#1E2F23'Secondary", "DESIGN.textSecondary")
    c = c.replace("'#1E2F23'Muted", "DESIGN.textMuted")
    
    # Fix duplicated RNImage issues
    c = c.replace("import { Dimensions, Image as RNImage , Image } from 'react-native';", "import { Dimensions } from 'react-native';")
    c = c.replace("import { Dimensions, Image as RNImage } from 'react-native';", "import { Dimensions } from 'react-native';")
    
    if orig != c:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(c)
        print("Fixed syntax errs in", f)
