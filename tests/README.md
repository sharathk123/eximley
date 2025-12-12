# Test Environment Setup

Create a `.env.test` file with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_ANON_KEY=your-anon-key

# Test Credentials
TEST_EMAIL=test@example.com
TEST_PASSWORD=testpassword123
TEST_AUTH_TOKEN=your-test-user-jwt-token

# Base URL
BASE_URL=http://localhost:3000
```

## Running Tests

### Database Tests
```bash
# Connect to your Supabase database
psql -h db.your-project.supabase.co -U postgres -d postgres -f scripts/test-db.sql
```

### API Tests (curl)
```bash
# Set your auth token
export SUPABASE_ANON_KEY="your-anon-key"

# Run tests
./scripts/test-api.sh
```

### API Tests (Vitest)
```bash
# Install dependencies
npm install -D vitest @vitejs/plugin-react jsdom

# Run tests
npm run test
```

### E2E Tests (Playwright)
```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Run tests
npm run test:e2e

# Run with UI
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
```

### Manual Tests
Follow checklists in:
- `tests/manual/ui-checklist.md`
- `tests/integration/export-lifecycle.md`

## Test Data Setup

Create test fixtures:

```sql
-- Create test org
INSERT INTO organizations (id, name) 
VALUES ('test-org-123', 'Test Company Ltd');

-- Create test user  
-- (Use Supabase Auth dashboard or API)

-- Create test buyer
INSERT INTO entities (org_id, entity_type, name, country)
VALUES ('test-org-123', 'buyer', 'Test Buyer Inc', 'USA');

-- Create test supplier
INSERT INTO entities (org_id, entity_type, name, country)
VALUES ('test-org-123', 'supplier', 'Test Supplier Co', 'India');

-- Create test SKUs
INSERT INTO skus (org_id, sku_code, name, unit_price)
VALUES 
  ('test-org-123', 'SKU-001', 'Widget Alpha', 100),
  ('test-org-123', 'SKU-002', 'Widget Beta', 200);
```

## Continuous Integration

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
        with:
          node-version: '18'
          
      - run: npm ci
      
      - name: Run API Tests
        run: npm run test
        env:
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          
      - name: Run E2E Tests
        run: npm run test:e2e
        env:
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```
