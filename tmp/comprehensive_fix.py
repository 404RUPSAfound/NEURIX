import glob
import re

files = glob.glob('app/*.tsx') + glob.glob('app/(tabs)/*.tsx')
fixed_count = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        c = file.read()
    orig = c

    # Fix pattern: '#ebfbedff'Card -> DESIGN.bgCard
    c = c.replace("'#ebfbedff'Card", "DESIGN.bgCard")
    c = c.replace("'#ebfbedff'Surface", "DESIGN.bgSurface")
    
    # Fix pattern: '#1E2F23'Primary -> DESIGN.textPrimary (and variants)
    c = re.sub(r"'#1E2F23'([A-Z][a-zA-Z]*)", r"DESIGN.text\1", c)
    
    # Fix broken import: } , Image } -> , Image }
    c = c.replace("} , Image }", ", Image }")
    
    # Fix duplicate Image imports from react-native when expo-image is also used
    if "import { Image } from 'expo-image';" in c or "import { Image as ExpoImage } from 'expo-image';" in c:
        # Remove Image from react-native import if it conflicts
        c = re.sub(r",\s*Image\s*}", " }", c.replace("import { Image }", ""))
        # But only in the react-native import line, be more careful:
        lines = c.split('\n')
        new_lines = []
        for line in lines:
            if "from 'react-native'" in line and ', Image }' in line and ('expo-image' in c):
                line = line.replace(', Image }', ' }')
                line = line.replace(', Image,', ',')
            if "from 'react-native'" in line and ' Image,' in line and ('expo-image' in c):
                line = line.replace(' Image,', '')
            new_lines.append(line)
        c = '\n'.join(new_lines)
    
    # Fix duplicate Dimensions import
    if c.count("import { Dimensions }") > 0 and "Dimensions" in c.split("from 'react-native'")[0]:
        c = c.replace("\nimport { Dimensions } from 'react-native';", "")
        c = c.replace("\r\nimport { Dimensions } from 'react-native';", "")
    
    if orig != c:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(c)
        fixed_count += 1
        print(f"Fixed: {f}")

print(f"\nTotal files fixed: {fixed_count}")
