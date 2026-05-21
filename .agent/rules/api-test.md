---
trigger: always_on
---

---

trigger: glob
globs: ["**/openapi.yaml", "**/swagger.json", "**/*.spec.yaml"]

---

# API Test Generator

## Görev

OpenAPI spec oku → her endpoint için curl testleri üret

## Test Kategorileri (her endpoint için)

1. VALID: Sadece required alanlar → 200/201
2. VALID: Tüm alanlar → 200/201
3. INVALID: Required alan eksik → 400
4. INVALID: Yanlış tip → 400
5. INVALID: Boundary aşımı (min-1, max+1) → 400
6. AUTH: Token yok → 401
7. AUTH: Geçersiz token → 401
8. EDGE: Boş string, null, unicode, özel karakterler,absurd uzunlukta girdi

## Çıktı Formatı

```bash
#!/bin/bash
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TOKEN="${API_TOKEN:-}"

# Test: [KATEGORİ] [endpoint] [senaryo]
curl -s -w "\n%{http_code}" -X METHOD \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d 'JSON' "$BASE_URL/endpoint"
# Expected: STATUS
```

## Kurallar

- Değişken kullan: $BASE_URL, $TOKEN
- Her endpoint ayrı fonksiyon
- Önce spec'i tamamen oku, sonra test üret

```

### 3. Kullanım

Windsurf'te openapi/swagger dosyanı aç ve şunu yaz:
```

Bu spec için tüm endpointlerin testlerini üret

```

veya spesifik olarak:
```

/users endpointi için tüm edge case testlerini üret
