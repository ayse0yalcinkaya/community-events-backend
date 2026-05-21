# 🚀 VS Code Setup Guide

## Zorunlu Extensions

Bu projeyi açtığınızda VS Code otomatik olarak aşağıdaki extension'ları önerecektir:

### 1. **Prettier - Code Formatter** (esbenp.prettier-vscode)
- **Gerekli**: ✅
- Import sıralama ve code formatting
- **Kurulum**: `Ctrl+Shift+X` → "Prettier" ara → Install

### 2. **ESLint** (dbaeumer.vscode-eslint)
- **Gerekli**: ✅
- Code linting ve hata kontrolü
- **Kurulum**: `Ctrl+Shift+X` → "ESLint" ara → Install

### 3. **Run on Save** (achilleshr.vscode-run-on-save)
- **Önerilen**: 💡
- Dosya kaydında otomatik format
- **Kurulum**: `Ctrl+Shift+X` → "Run on Save" ara → Install

## Extension Kontrolü

Yüklü extension'ları kontrol etmek için:

```bash
npm run check:extensions
```

## Otomatik Setup

### 1. Extension'ları Manuel Yükle
VS Code'u açtığınızda sağ altta notification görünecek:
- "Install Recommended Extensions" butonuna tıklayın
- Veya `Ctrl+Shift+X` ile Extensions panelini açın ve yukarıdaki extension'ları arayın

### 2. CLI ile Yükleme (Eğer VS Code CLI kuruluysa)
```bash
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension achilleshr.vscode-run-on-save
```

## Yapılandırma

### Save'de Otomatik Format

#### Seçenek 1: Run on Save Extension (Önerilen)
1. `achilleshr.vscode-run-on-save` extension'ını yükle
2. Settings'de otomatik aktif olur

#### Seçenek 2: Husky Git Hook
```bash
git add .
git commit -m "feat: new feature"
# Otomatik: npm run format çalışır
```

#### Seçenek 3: Manuel
```bash
npm run format
```

## Import Comment Sistemi

Bu proje özel import comment sistemi kullanır:

```typescript
// DTOs
import { LoginDto } from './dto/login.dto';

// Services
import { UserService } from './user.service';
import { AuthService } from './auth.service';
```

**Otomatik Eklenen Tipler**:
- DTOs, Entities, Interfaces, Types, Enums
- Guards, Decorators, Pipes, Filters, Interceptors, Middleware
- Services, Repositories, Controllers, Modules

## Format Komutları

### Tüm Projeyi Formatla
```bash
npm run format
```

### Tek Dosya Formatla
```bash
node scripts/add-service-comment.mjs src/modules/auth/auth.service.ts
```

### Extensions Kontrolü
```bash
npm run check:extensions
```

## Proje İlk Kurulum

```bash
# 1. Dependencies yükle
npm install

# 2. Husky setup
npm run prepare

# 3. Extension'ları kontrol et
npm run check:extensions

# 4. VS Code'u yeniden başlat
```

## Troubleshooting

### Prettier Çalışmıyor
- `Ctrl+Shift+P` → "Format Document" deneyin
- `.vscode/settings.json`'da `"editor.formatOnSave": true` olduğundan emin olun

### ESLint Hataları Görünmüyor
- Extension'ın aktif olduğunu kontrol edin
- `Ctrl+Shift+M` ile Problems panelini açın

### Comment'ler Eklenmiyor
```bash
npm run format
# veya
node scripts/add-service-comment.mjs <dosya-yolu>
```

## 💡 İpuçları

1. **Prettier workspace default**: `.vscode/settings.json` ayarları workspace'e uygulanır
2. **Git hooks**: Her commit'te otomatik format çalışır
3. **Import order**: `.prettier.config.js` ayarlarına göre sıralanır
4. **Save on focus change**: Settings'de aktif edilmiş olabilir

---

**⚠️ Not**: Extension'lar güvenlik nedeniyle otomatik yüklenemez. Kullanıcı onayı gereklidir.
