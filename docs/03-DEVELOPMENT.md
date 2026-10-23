# Development Guide

Complete guide for developers working on Cosmos.

## Development Setup

### Prerequisites

- Node.js 22.22+ (24 LTS recommended)
- npm or yarn
- Git
- VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd cosmos-app

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your keys (optional)

# Start development servers
npm run dev:full
```

## Development Modes

### Full Development Mode (Recommended)

```bash
npm run dev:full
```

Runs three servers concurrently:
- **Next.js** (port 3000) - Main application
- **File Server** (port 3001) - Auto-persistence to companies.ts
- **LLM Server** (port 3002) - AI analysis endpoints

**Benefits:**
- Real-time file updates
- Test LLM features locally
- Complete development experience

### Individual Servers

```bash
# Next.js only
npm run dev

# File server only (Terminal 2)
npm run dev:file-server

# LLM server only (Terminal 3)
npm run dev:llm-server
```

## Project Structure

```
cosmos-app/
├── src/
│   ├── components/         # React components
│   │   ├── CMFGraphExplorerNew.tsx
│   │   ├── CompanyGraph.tsx
│   │   ├── CompanyDetailPanel.tsx
│   │   └── __tests__/     # Component tests
│   ├── data/              # Static data
│   │   └── companies.ts   # User exploration state
│   ├── services/          # Business logic
│   │   └── ExplorationStateManager.ts
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   │   ├── graphDataTransform.ts
│   │   ├── companyValidation.ts
│   │   └── __tests__/     # Utility tests
│   └── types/             # TypeScript definitions
├── app/
│   ├── api/               # API routes
│   │   └── llm/          # LLM endpoints
│   └── page.tsx          # Main page
├── docs/                  # Documentation
├── tests/                 # E2E tests
└── public/               # Static assets
```

## Test-Driven Development

### TDD Workflow

1. **Write Test First (Red)**
   ```bash
   # Create test file
   touch src/utils/__tests__/newFeature.test.ts

   # Watch mode
   npm test
   ```

2. **Implement Feature (Green)**
   ```typescript
   // src/utils/newFeature.ts
   export function newFeature() {
     // Implementation
   }
   ```

3. **Refactor (Keep Green)**
   - Improve code quality
   - Keep tests passing
   - Maintain coverage

### Running Tests

```bash
# Watch mode (development)
npm test

# Run once (CI)
npm run test:run

# With coverage
npm run test:coverage

# UI mode
npm run test:ui

# Performance tests
npm run test:performance

# E2E tests
npm run test:e2e
npm run test:e2e:ui
```

### Test Organization

**Unit Tests** (`__tests__/*.test.ts`):
- Individual functions
- Pure logic
- No DOM/React

**Component Tests** (`__tests__/*.test.tsx`):
- React components
- User interactions
- Rendering behavior

**Integration Tests** (`__tests__/*.integration.test.ts`):
- Complete workflows
- Multiple components
- State management

**Performance Tests** (`__tests__/*.performance.test.ts`):
- Infinite loop detection
- API call monitoring
- Render performance

**E2E Tests** (`tests/e2e/*.spec.ts`):
- Full user journeys
- Visual regression
- Cross-browser

## Code Patterns

### Component Structure

```typescript
// ComponentName.tsx
import React from 'react';
import { InterfaceName } from '../types';

interface ComponentNameProps {
  prop1: string;
  prop2: number;
  onAction: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2,
  onAction
}) => {
  // Hooks
  const [state, setState] = useState(initialState);

  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // Handlers
  const handleClick = () => {
    onAction();
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

### Utility Functions

```typescript
// utils/utilityName.ts

/**
 * Description of what the function does
 * @param param1 - Description
 * @param param2 - Description
 * @returns Description of return value
 */
export function utilityName(param1: string, param2: number): ReturnType {
  // Implementation
}
```

### Test Structure

```typescript
// __tests__/componentName.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '../ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName prop1="test" prop2={42} onAction={vi.fn()} />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('should call onAction when clicked', () => {
    const onAction = vi.fn();
    render(<ComponentName prop1="test" prop2={42} onAction={onAction} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
```

## Performance Best Practices

### Avoid Infinite Loops

```typescript
// ❌ Bad - Unstable dependency
useEffect(() => {
  setData({ ...data, updated: true });
}, [data]); // data changes → effect runs → data changes → ...

// ✅ Good - Stable dependency
const memoizedData = useMemo(() => ({ ...data }), [data.id]);
useEffect(() => {
  setData({ ...memoizedData, updated: true });
}, [memoizedData]);
```

### Optimize Re-renders

```typescript
// ✅ Good - Memoized
const MemoizedComponent = React.memo(ExpensiveComponent);

// ✅ Good - useMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.score - b.score);
}, [data]);

// ✅ Good - useCallback for event handlers
const handleClick = useCallback(() => {
  onAction(id);
}, [id, onAction]);
```

## Debugging

### Browser DevTools

1. **React DevTools** - Component hierarchy and props
2. **Network Tab** - API calls and responses
3. **Console** - Logs and errors
4. **Performance Tab** - Profiling

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### Common Issues

See [08-TROUBLESHOOTING.md](08-TROUBLESHOOTING.md) for solutions.

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `test/what-testing` - Test additions
- `refactor/what-refactored` - Refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
```

### Pull Requests

1. Create feature branch
2. Make changes with tests
3. Ensure all tests pass
4. Push and create PR
5. Address review feedback
6. Merge when approved

## Building for Production

```bash
# Build
npm run build

# Preview build
npm run preview

# Analyze bundle
npm run build -- --analyze
```

## Environment Variables

Required for full functionality:

```bash
# .env.local

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Anthropic (optional)
ANTHROPIC_API_KEY=

# Logo.dev (optional)
NEXT_PUBLIC_LOGO_DEV_KEY=
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Cytoscape.js](https://js.cytoscape.org/)

## Need Help?

- Check [Testing Guide](guides/TESTING.md)
- See [Troubleshooting](08-TROUBLESHOOTING.md)
- Review [Contributing Guide](09-CONTRIBUTING.md)
- Open an issue on GitHub
