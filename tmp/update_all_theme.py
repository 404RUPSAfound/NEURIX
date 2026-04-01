import os
import re

TARGET_DIR = r"c:/Users/RUPSA/Desktop/NEURIX/app"

def process_file(filepath):
    if 'index.tsx' in filepath or '_layout.tsx' in filepath or 'auth.tsx' in filepath or 'login.tsx' in filepath or 'otp-verify.tsx' in filepath:
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    og_content = content
    
    # Specific targeted gradients
    content = content.replace("['#05080A', '#020508']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("['#0A0505', '#050202']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("['#111111', '#000000']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("['#1E1E1E', '#121212']", "['#ebfbedff', '#cafbc1ff']")
    content = content.replace("['#0F2027', '#28623A']", "['#ebfbedff', '#cafbc1ff']") # Wait, #0F2027 is the tactical header, we should probably keep that if it's the tactical header, but if it's the main background we replace it. Wait, the tactical header is used across screens.
    
    # Let's restore tactical headers if they got replaced (in index.tsx it's colors={['#0F2027', '#28623A']} style={s.header}) - actually I won't replace that one.
    
    content = content.replace("backgroundColor: '#05080A'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#0A0505'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#000'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#111'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#1E1E1E'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#121212'", "backgroundColor: '#ebfbedff'")
    content = content.replace("backgroundColor: '#2A2A2A'", "backgroundColor: '#FFF'")
    
    # Cards / Boxes
    content = content.replace("backgroundColor: 'rgba(255,255,255,0.02)'", "backgroundColor: '#FFF'")
    content = content.replace("backgroundColor: 'rgba(255,255,255,0.03)'", "backgroundColor: '#FFF'")
    content = content.replace("backgroundColor: 'rgba(255,255,255,0.04)'", "backgroundColor: '#FFF'")
    content = content.replace("backgroundColor: 'rgba(255,255,255,0.05)'", "backgroundColor: '#FFF'")
    
    # Borders
    content = content.replace("borderColor: 'rgba(255,255,255,0.05)'", "borderColor: 'rgba(0,0,0,0.05)'")
    content = content.replace("borderColor: 'rgba(255,255,255,0.1)'", "borderColor: 'rgba(0,0,0,0.1)'")
    content = content.replace("borderBottomColor: 'rgba(255,255,255,0.05)'", "borderBottomColor: 'rgba(0,0,0,0.05)'")
    content = content.replace("borderTopColor: 'rgba(255,255,255,0.03)'", "borderTopColor: 'rgba(0,0,0,0.03)'")
    
    # Text Colors
    content = content.replace("color: '#FFF'", "color: '#1E2F23'")
    content = content.replace("color: '#FFFFFF'", "color: '#1E2F23'")
    content = content.replace("color: '#F9F9F9'", "color: '#1E2F23'")
    content = content.replace("color: '#555'", "color: '#90A4AE'")
    content = content.replace("color: '#444'", "color: '#B0BEC5'")
    content = content.replace("color: '#666'", "color: '#90A4AE'")
    content = content.replace("color: '#7A8C99'", "color: '#546E7A'")
    content = content.replace("color: '#888'", "color: '#90A4AE'")
    content = content.replace("color: '#AAA'", "color: '#B0BEC5'")
    content = content.replace("color: '#CCC'", "color: '#1E2F23'")
    content = content.replace("color: DESIGN.text", "color: '#1E2F23'")
    
    if "['#ebfbedff', '#cafbc1ff']" in content and "bg-pattern.jpg" not in content:
        content = content.replace(
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />",
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={StyleSheet.absoluteFill} />\n      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode=\"cover\" />"
        )
        content = content.replace(
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={s.container} />",
            "LinearGradient colors={['#ebfbedff', '#cafbc1ff']} style={s.container} />\n      <Image source={require('../../assets/images/bg-pattern.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} resizeMode=\"cover\" />"
        )
        
        # Import injection
        if "<Image" in content and "Image" not in content[:content.find('react-native')]:
            if 'from "react-native";' in content: content = content.replace('from "react-native";', ', Image } from "react-native";')
            elif "from 'react-native';" in content: content = content.replace("from 'react-native';", ", Image } from 'react-native';")
            
    if og_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated", filepath)

for root, _, files in os.walk(TARGET_DIR):
    for f in files:
        if f.endswith('.tsx'):
            process_file(os.path.join(root, f))
