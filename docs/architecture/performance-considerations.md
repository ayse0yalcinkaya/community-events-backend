# Performance Considerations

## Response Time Targets

```yaml
Simple CRUD (e.g., GET /users/:id):
  Target: < 200ms (p95)
  Strategy: Indexed queries, minimal joins

Complex Queries (e.g., GET /users with filters + pagination):
  Target: < 500ms (p95)
  Strategy: Database indexes, query optimization, eager loading

File Upload (< 10MB):
  Target: < 2s
  Strategy: Streaming upload to S3, async thumbnail generation

Document Generation (small):
  Target: < 5s
  Strategy: In-memory generation, caching templates

Document Generation (large):
  Target: Async (BullMQ in Phase 2)
  Strategy: Background job, notification on completion
```

## Database Optimization

**Connection Pooling:**
```typescript
// Prisma configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool: 5 min, 20 max
}
```

**Query Optimization:**
- Indexes on foreign keys and filter columns
- Pagination mandatory (max 100 items per request)
- Eager loading for relations (avoid N+1)
- Soft delete filter applied automatically

**Caching Strategy (Phase 2):**
```typescript
// Redis caching for:
// - User permissions (TTL: 5 minutes)
// - Frequently accessed data (TTL: varies)
// - API rate limiting counters
```

## Scalability Approach

**Horizontal Scaling:**
- Stateless design (JWT access tokens, no in-memory sessions)
- Database connection pooling
- Load balancer ready (health checks at /health)

**Vertical Scaling:**
- Node.js single-threaded (CPU-bound tasks to workers in Phase 2)
- Database: Read replicas (future)

**Asset Delivery:**
- S3 pre-signed URLs (client downloads directly from S3)
- CloudFront CDN (future, for static assets)

---
