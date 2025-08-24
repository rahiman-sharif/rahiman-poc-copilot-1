# 🚀 Kanakkar Executable Build & Logo Guide

## 📋 Complete Step-by-Step Process

### 🎯 **Quick One-Line Command (Recommended)**
```powershell
npm run createexe && node -e "const rcedit = require('rcedit'); const fs = require('fs'); const files = fs.readdirSync('dist').filter(f => f.endsWith('.exe')); files.forEach(f => rcedit('dist/' + f, { icon: 'assets/logo.ico' }).then(() => console.log('✅ Logo added to', f)));"
```

---

## 🔧 **Detailed Steps**

### **Step 1: Build Executable**
```powershell
# Build x64 version (default)
npm run createexe

# OR build x32 version
npm run createexe -- --x32

# OR build both versions
npm run createexe -- --both
```

### **Step 2: Add Logo to Executable**
```powershell
# Add logo to all executables in dist folder
node -e "const rcedit = require('rcedit'); const fs = require('fs'); const files = fs.readdirSync('dist').filter(f => f.endsWith('.exe')); files.forEach(f => rcedit('dist/' + f, { icon: 'assets/logo.ico' }).then(() => console.log('✅ Logo added to', f)));"
```

### **Step 3: Refresh Windows Icon Cache**
```powershell
# Method A: Quick refresh
ie4uinit.exe -show

# Method B: Full explorer restart (if Method A doesn't work)
taskkill /f /im explorer.exe; Start-Sleep 2; explorer.exe
```

### **Step 4: Verify Logo**
```powershell
# Open dist folder
explorer.exe "dist"

# Then manually:
# 1. Right-click on the .exe file
# 2. Select "Properties"
# 3. Check icon at top of Properties dialog
# 4. Your custom logo should appear there
```

---

## 🛠️ **Advanced Options**

### **Build Specific Architecture**
```powershell
# x64 only (default)
npm run createexe

# x32 only
npm run createexe -- --x32

# Both architectures
npm run createexe -- --both
```

### **Manual Logo Addition (if needed)**
```powershell
# For specific file
node -e "const rcedit = require('rcedit'); rcedit('dist/YourFileName.exe', { icon: 'assets/logo.ico' }).then(() => console.log('✅ Logo added')).catch(console.error);"
```

### **Cache Clearing Options**
```powershell
# Option 1: IE cache refresh
ie4uinit.exe -show

# Option 2: Icon cache database rebuild
ie4uinit.exe -ClearIconCache

# Option 3: Full system refresh (restart explorer)
taskkill /f /im explorer.exe; Start-Sleep 3; explorer.exe
```

---

## 📁 **File Requirements**

### **Required Files:**
- ✅ `assets/logo.ico` - Your logo in ICO format
- ✅ `package.json` - Contains build scripts and dependencies
- ✅ Dependencies: `pkg` and `rcedit` (already installed)

### **Generated Files:**
- 📦 `dist/Kanakkar_YYYY-MM-DDTHH-MM_x64.exe` - x64 executable
- 📦 `dist/Kanakkar_YYYY-MM-DDTHH-MM_x32.exe` - x32 executable (if built)

---

## 🎯 **Quick Verification Checklist**

1. **Build Success**: ✅ Executable appears in `dist/` folder
2. **Logo Added**: ✅ See "Logo added successfully" message
3. **Cache Refresh**: ✅ Run `ie4uinit.exe -show`
4. **Visual Check**: ✅ Right-click → Properties → See custom icon

---

## 🚨 **Troubleshooting**

### **If Logo Doesn't Appear:**
```powershell
# 1. Clear icon cache
ie4uinit.exe -ClearIconCache

# 2. Restart explorer
taskkill /f /im explorer.exe; explorer.exe

# 3. Check file was modified
Get-ItemProperty -Path "dist/*.exe" | Select-Object Name, LastWriteTime
```

### **If Build Fails:**
```powershell
# Check dependencies
npm list pkg rcedit

# Reinstall if needed
npm install pkg rcedit --save-dev
```

---

## 💡 **Pro Tips**

1. **Always run cache refresh** after adding logo
2. **Use Properties dialog** to verify icon (most reliable)
3. **Build + Logo in one command** saves time
4. **ICO format required** - PNG won't work for executable icons
5. **File timestamps** indicate successful modification

---

## 🔄 **Development Workflow**

### **Regular Build:**
```powershell
npm run createexe && node -e "const rcedit = require('rcedit'); const fs = require('fs'); const files = fs.readdirSync('dist').filter(f => f.endsWith('.exe')); files.forEach(f => rcedit('dist/' + f, { icon: 'assets/logo.ico' }).then(() => console.log('✅ Logo added to', f)));" && ie4uinit.exe -show
```

### **Testing Changes:**
```powershell
# 1. Make your code changes
# 2. Run build command above
# 3. Test executable: dist/Kanakkar_*.exe
```

---

*Generated: August 24, 2025*
*Kanakkar Technology Solutions*
