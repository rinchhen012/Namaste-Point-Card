import { lazy, ComponentType } from 'react';

// Type for component import function
type ComponentImportFn<T = ComponentType<any>> = () => Promise<{ default: T }>;

/**
 * Enhanced lazy loading utility that supports preloading
 *
 * This creates a lazy component with an attached preload method
 * that can be called to start loading the component before it's needed
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  importFn: ComponentImportFn<T>
) {
  // Create the lazy component
  const LazyComponent = lazy(importFn);

  // Store the import function for preloading
  const loadComponentModule = () => importFn();

  // Attach the preload method to the lazy component
  (LazyComponent as any).preload = () => {
    loadComponentModule();
  };

  return LazyComponent as typeof LazyComponent & { preload: () => void };
}
