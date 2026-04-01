import os
import re

TARGET_DIR = r"c:/Users/RUPSA/Desktop/NEURIX/app"

def process_file(filepath):
    if 'index.tsx' in filepath or '_layout.tsx' in filepath or 'auth.tsx' in filepath or 'login.tsx' in filepath or 'otp-verify.tsx' in filepath:
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    og_content = content
    
    # 1. Replace any LinearGradient that uses StyleSheet.absoluteFill or DESIGN.bg
    content = re.sub(r"colors=\{\[DESIGN\.bg,\s*DESIGN\.bgSurface\]\}", "colors={['#ebfbedff', '#cafbc1ff']}", content)
    content = re.sub(r"colors=\{\[DESIGN\.gradientStart,\s*DESIGN\.gradientMid,\s*DESIGN\.gradientEnd\]\}", "colors={['#ebfbedff', '#cafbc1ff']}", content)
    
    # Custom dark gradients left in report, community, chat
    content = content.replace("['#02050A', '#050A19', '#081033']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("['#05080C', '#010305']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("['#10141A', '#05080A']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("['#020408', '#050810', '#0A0E1A']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("['#1A1A1A', '#101010']", "['#FFF', '#F0F0F0']") # tierBanner in profile
    
    # Also replace DESIGN variables that imply dark mode and might be used elsewhere
    content = content.replace("backgroundColor: DESIGN.bg", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: DESIGN.bgSurface", "backgroundColor: '#FFF'")
    content = content.replace("backgroundColor: DESIGN.bgCard", "backgroundColor: '#FFF'")
    
    # More cards
    content = content.replace("backgroundColor: '#10141A'", "backgroundColor: '#FFF'")
    content = content.replace("backgroundColor: '#05080A'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#1E1E1E'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: 'rgba(255,255,255,0.05)'", "backgroundColor: '#FFF'")
    
    if "['#ebfbedff', '#cafbc1ff']" in content and "bg-pattern.jpg" not in content:
        content = content.replace(
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />",
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />\n      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode=\"cover\" />"
        )
        content = content.replace(
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={s.container} />",
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={s.container} />\n      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode=\"cover\" />"
        )
        
        if "<Image" in content and "Image" not in content[:content.find('react-native')]:
            if 'from "react-native";' in content: content = content.replace('from "react-native";', ', Image } from "react-native";')
            elif "from 'react-native';" in content: content = content.replace("from 'react-native';", ", Image } from 'react-native';")

    if og_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated Theme in", filepath)

for root, _, files in os.walk(TARGET_DIR):
    for f in files:
        if f.endswith('.tsx'):
            process_file(os.path.join(root, f))
