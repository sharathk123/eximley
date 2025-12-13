# E2E Test Suite

Comprehensive Playwright E2E tests covering the entire application from signup to shipping bills.

## Test Structure

### Test Helpers (`tests/helpers/`)
- `auth.ts` - Authentication utilities (login, logout, signup)
- `data-factory.ts` - Test data creation functions
- `assertions.ts` - Reusable assertion helpers

### Test Suites (`tests/e2e/`)
1. **01-auth.spec.ts** - Authentication & onboarding
2. **02-dashboard.spec.ts** - Dashboard & navigation
3. **09-analytics.spec.ts** - Analytics dashboards (all modules)
4. **10-workflows.spec.ts** - Complete workflows & UI/UX
5. **modules.spec.ts** - Individual module tests (existing)

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (recommended for development)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run in headed mode (see browser)
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

## Test Coverage

### ✅ Implemented
- Authentication (login, logout, validation)
- Dashboard display and navigation
- Analytics dashboards (all 6 modules)
- UI/UX consistency checks
- Module navigation
- View toggles
- Search functionality

### 📋 Existing Tests
- Module-specific tests (enquiries, quotes, proforma, orders, shipping bills, purchase orders)
- CRUD operations
- Tab navigation
- Detail views

## Environment Variables

Create a `.env.test` file with:

```env
TEST_EMAIL=test@example.com
TEST_PASSWORD=your_test_password
```

## Best Practices

1. **Use test helpers** - Reuse auth, data-factory, and assertion helpers
2. **Descriptive test names** - Clearly describe what is being tested
3. **Wait for elements** - Use `waitForSelector` for dynamic content
4. **Clean up** - Tests should be independent
5. **Screenshots on failure** - Automatically captured by Playwright

## Adding New Tests

1. Create test file in `tests/e2e/`
2. Import helpers from `tests/helpers/`
3. Use `test.describe()` to group related tests
4. Use `test.beforeEach()` for common setup (e.g., login)
5. Write descriptive test names

## Troubleshooting

- **Tests timing out**: Increase timeout in `playwright.config.ts`
- **Element not found**: Check selectors, use `data-testid` attributes
- **Flaky tests**: Add proper waits, avoid hard-coded delays
- **Authentication issues**: Verify test credentials in `.env.test`
