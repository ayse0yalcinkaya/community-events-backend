# Monitoring & Observability

## Logging Strategy

**Format:** Structured JSON logs (Winston)

```typescript
{
  timestamp: "2025-11-04T12:00:00.000Z",
  level: "info",
  message: "User created successfully",
  context: {
    module: "UsersService",
    method: "create",
    domainID: "domain-uuid",
    userID: "user-uuid",
    requestId: "req-123"
  },
  meta: {
    email: "user@example.com",
    duration: 45
  }
}
```

**Log Levels:**
- `debug`: Development only, verbose details
- `info`: Important events (user actions, state changes)
- `warn`: Recoverable issues (missing optional config, fallbacks)
- `error`: Errors requiring attention (exceptions, failures)

**Exclusions:**
- Passwords, tokens, API keys
- PII (phone numbers, addresses) unless necessary
- Full request/response bodies (log IDs only)

**Request/Response Logging:**
```typescript
// LoggingInterceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const requestId = headers['x-request-id'] || uuid();

    this.logger.log({
      type: 'request',
      method,
      url,
      requestId,
      userAgent: headers['user-agent'],
    });

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          type: 'response',
          method,
          url,
          requestId,
          duration: Date.now() - now,
        });
      }),
    );
  }
}
```

## Error Tracking (Sentry)

**Configuration:**
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
  beforeSend(event, hint) {
    // Scrub sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers.authorization;
    }
    return event;
  },
});
```

**Context Enrichment:**
```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  domainID: user.domainID,
});

Sentry.setTag('module', 'users');
Sentry.setTag('action', 'create');

Sentry.addBreadcrumb({
  message: 'User validation completed',
  level: 'info',
});
```

## Health Checks

**Endpoints:**
```typescript
GET /health
  Response: { status: 'ok', timestamp: '...' }
  Use: Load balancer health check

GET /health/db
  Response: {
    status: 'ok',
    database: 'connected',
    responseTime: 23
  }
  Use: Database connectivity check

GET /health/services (future)
  Response: {
    status: 'ok',
    services: {
      database: 'ok',
      redis: 'ok',
      s3: 'ok',
      sentry: 'ok'
    }
  }
  Use: Comprehensive service health
```

## Performance Monitoring

**Request Duration:**
- Logged automatically by LoggingInterceptor
- Sentry transaction tracing (10% sample rate)

**Database Query Performance:**
- Slow query logging (> 1 second)
- Prisma query event hooks

**Metrics Collection (Phase 2):**
- Prometheus metrics export
- Grafana dashboards
- Custom business metrics

---
