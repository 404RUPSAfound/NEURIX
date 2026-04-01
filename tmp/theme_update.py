import os
import re

TARGET_DIR = r"c:/Users/RUPSA/Desktop/NEURIX/app/(tabs)"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip files that don't look like React Native screens or already have the light theme
    if '#ebfbedff' in content or 'index.tsx' in filepath or '_layout.tsx' in filepath:
        return

    og_content = content
    
    # Backgrounds
    content = content.replace("['#05080A', '#020508']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("backgroundColor: '#05080A'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#0A0505'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#000'", "backgroundColor: '#ebfbedff'")
    
    # Header gradient
    content = content.replace("backgroundColor: 'rgba(255,255,255,0.03)'", "backgroundColor: '#FFF'")
    content = content.replace("backgroundColor: 'rgba(255,255,255,0.05)'", "backgroundColor: '#FFF'")
    content = content.replace("backgroundColor: 'rgba(255,255,255,0.02)'", "backgroundColor: '#FFF'")
    
    # Text colors
    content = content.replace("color: '#FFF'", "color: '#1E2F23'")
    content = re.sub(r"color: '#[A-Fa-f0-9]{3,6}'", lambda match: "color: '#1E2F23'" if match.group(0).upper() in ["color: '#FFF'", "color: '#FFFFFF'", "color: '#F9F9F9'"] else match.group(0), content)
    content = content.replace("color: '#555'", "color: '#90A4AE'")
    
    # Borders
    content = content.replace("borderColor: 'rgba(255,255,255,0.05)'", "borderColor: 'rgba(0,0,0,0.05)'")
    content = content.replace("borderBottomColor: 'rgba(255,255,255,0.05)'", "borderBottomColor: 'rgba(0,0,0,0.05)'")
    
    # Fix the missing image tag if any
    if "['#ebfbedff', '#cafbc1ff']" in content and "bg-pattern.jpg" not in content:
        content = content.replace("LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />",
                                  "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />\n      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode=\"cover\" />")
        
    if og_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(TARGET_DIR):
    for file in files:
        if file.endswith('.tsx') and file != 'index.tsx' and file != '_layout.tsx':
            process_file(os.path.join(root, file))

print("Done")
