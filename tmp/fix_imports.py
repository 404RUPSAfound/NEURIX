import glob
import os

files = glob.glob('app/*.tsx') + glob.glob('app/(tabs)/*.tsx')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Check if we injected the `<Image` tag but didn't import `Image`
    if '<Image' in content:
        # Simple check if "Image" is in the first 1000 characters which usually contains imports
        head = content[:1500]
        if ' Image' not in head and '{Image' not in head and '{ Image' not in head:
            # We need to add Image to react-native import
            if 'from "react-native";' in content:
                content = content.replace('from "react-native";', ', Image } from "react-native";')
            elif "from 'react-native';" in content:
                content = content.replace("from 'react-native';", ", Image } from 'react-native';")
            
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f"Fixed Image import in {f}")
