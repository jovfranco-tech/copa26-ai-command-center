/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

// Suppress React error boundary console.error in tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterEach(() => {
  cleanup();
});
afterAll(() => {
  console.error = originalError;
});

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error: component crashed');
  return <div>Child content rendered</div>;
}

describe('RouteErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Child content rendered')).toBeTruthy();
  });

  it('shows error UI when child throws', () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Error inesperado')).toBeTruthy();
  });

  it('displays the error message', () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Test error: component crashed')).toBeTruthy();
  });

  it('shows a reload button', () => {
    render(
      <RouteErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Recargar página')).toBeTruthy();
  });
});
