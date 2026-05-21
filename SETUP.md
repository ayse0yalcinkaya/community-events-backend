# Developer Setup

Bu dosya proje gelistirme ortamini hizli kurmak icin kisa bir referanstir.

## Recommended Extensions

- `esbenp.prettier-vscode`
- `dbaeumer.vscode-eslint`
- `achilleshr.vscode-run-on-save`

Kontrol komutu:

```bash
npm run check:extensions
```

## First-Time Setup

```bash
npm install
npm run prepare
npm run check:extensions
```

## Formatting

Tum projeyi formatla:

```bash
npm run format
```

Tek dosyada import comment duzenlemesi icin:

```bash
node scripts/add-service-comment.mjs src/modules/auth/auth.service.ts
```

## Workflow Notes

- Husky commit oncesi formatlama calistirir.
- `.vscode/settings.json` workspace seviyesinde uygulanir.
- Import siralamasi Prettier konfigurasyonu ile yonetilir.

## Troubleshooting

Prettier calismiyorsa:

- `Format Document` deneyin.
- VS Code icinde `editor.formatOnSave` ayarini kontrol edin.

ESLint gorunmuyorsa:

- Extension'in aktif oldugunu kontrol edin.
- Problems panelini acin.
