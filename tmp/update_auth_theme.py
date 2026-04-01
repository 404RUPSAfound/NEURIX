import os
import re

TARGET_DIR = r"c:/Users/RUPSA/Desktop/NEURIX/app"

def process_file(filepath):
    if 'index.tsx' in filepath or '_layout.tsx' in filepath:
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    og_content = content
    
    # Auth files
    content = re.sub(r"colors=\{\[DESIGN\.bg,\s*DESIGN\.bgSurface\]\}", "colors={['#ebfbedff', '#cafbc1ff']}", content)
    content = content.replace("backgroundColor: DESIGN.bgCard", "backgroundColor: '#FFF'")
    content = content.replace("backgroundColor: DESIGN.bg", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: DESIGN.bgSurface", "backgroundColor: '#FFF'")
    
    # Text colors
    content = content.replace("color: '#FFF'", "color: '#1E2F23'")
    content = content.replace("color: '#FFFFFF'", "color: '#1E2F23'")
    content = content.replace("color: '#F9F9F9'", "color: '#1E2F23'")
    content = content.replace("color: '#555'", "color: '#90A4AE'")
    
    # Inject pattern image import and usage
    if "['#ebfbedff', '#cafbc1ff']" in content and "bg-pattern.jpg" not in content:
        content = content.replace(
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />",
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />\n      <Image source={require('../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode=\"cover\" />"
        )
        
        # Import injection
        if "<Image" in content and "Image" not in content[:content.find('react-native')]:
            if 'from "react-native";' in content: content = content.replace('from "react-native";', ', Image } from "react-native";')
            elif "from 'react-native';" in content: content = content.replace("from 'react-native';", ", Image } from 'react-native';")
            
    if og_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated auth/other in", filepath)

for root, _, files in os.walk(TARGET_DIR):
    for f in files:
        if f.endswith('.tsx'):
            process_file(os.path.join(root, f))
