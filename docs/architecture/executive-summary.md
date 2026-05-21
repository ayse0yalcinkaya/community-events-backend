# Executive Summary

Bu architecture, **Boilerplate** projesi için enterprise-grade NestJS backend boilerplate'in teknik kararlarını ve implementation pattern'lerini tanımlar. Proje, hrsync-backend'den kanıtlanmış pattern'leri kullanarak 12 core module içerir ve PostgreSQL/MongoDB dual-database desteği sunar.

**Architecture Approach:** Modular monolith with clear separation of concerns, production-ready from day one, optimized for AI agent consistency.

**Key Decisions:**
- NestJS v11.1.8 + TypeScript Strict Mode
- Prisma ORM v6.16.0 (dual PostgreSQL/MongoDB schemas)
- JWT + Refresh Token hybrid authentication
- Module-based RBAC permission system
- AWS S3 file storage
- Provider-abstracted communication (SMS/Email)
- hrsync-backend proven patterns enforced

---
