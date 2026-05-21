// Libraries
import 'reflect-metadata';

/**
 * Reflection metadata key for Excel adapter name
 * Used to store adapter name on class for factory discovery
 */
export const EXCEL_ADAPTER_NAME_KEY = 'excel_adapter_name';

/**
 * Register Excel Adapter Decorator
 *
 * Decorator factory that registers an Excel adapter class with a unique name
 * for factory-based auto-discovery. The adapter name is stored as reflection
 * metadata on the class, allowing factories to discover and instantiate adapters.
 *
 * The adapter name is normalized (trimmed and lowercased) to ensure consistency.
 *
 * @param adapterName - Unique identifier for the adapter (will be normalized)
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * @RegisterExcelAdapter('user-report')
 * export class UserReportAdapter extends BaseExcelAdapter {
 *   readonly adapterName = 'user-report';
 *   // ...
 * }
 * ```
 */
export function RegisterExcelAdapter(adapterName: string): ClassDecorator {
  return function (target: any) {
    // Normalize adapter name: trim whitespace and convert to lowercase
    const normalizedName = adapterName.trim().toLowerCase();

    // Store adapter name as reflection metadata
    Reflect.defineMetadata(EXCEL_ADAPTER_NAME_KEY, normalizedName, target);
  };
}
