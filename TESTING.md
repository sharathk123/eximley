# Test Automation Guide

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
src/test/
├── setup.ts                    # Test configuration
├── helpers/
│   ├── api.test.ts            # Helper function tests
│   └── transactions.test.ts   # Transaction tests
├── constants/
│   └── messages.test.ts       # Constants tests
└── integration/
    └── (future integration tests)
```

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/myModule'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### API Route Test Example
```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/myroute/route'

describe('GET /api/myroute', () => {
  it('should return data', async () => {
    const request = new Request('http://localhost/api/myroute')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('success')
  })
})
```

## Coverage Goals

- **Helpers**: 90%+ coverage
- **Constants**: 100% coverage
- **API Routes**: 70%+ coverage
- **Components**: 60%+ coverage

## Current Test Coverage

Run `npm run test:coverage` to see detailed coverage report.

## CI/CD Integration

Add to `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
```
