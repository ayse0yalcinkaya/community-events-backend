// Libraries
import 'reflect-metadata';

/**
 * Reflection metadata key for PDF adapter template name
 * Used to store template name on class for factory discovery
 */
export const PDF_ADAPTER_TEMPLATE_KEY = 'pdf_adapter_template';

/**
 * Register PDF Adapter Decorator
 *
 * Decorator factory that registers a PDF adapter class with a unique template name
 * for factory-based auto-discovery. The template name is stored as reflection
 * metadata on the class, allowing factories to discover and instantiate adapters.
 *
 * The template name is normalized (trimmed and lowercased) to ensure consistency.
 *
 * @param templateName - Unique identifier for the template (will be normalized)
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * @RegisterPdfAdapter('invoice')
 * export class InvoicePdfAdapter extends BasePdfAdapter {
 *   readonly templateName = 'invoice';
 *   readonly styleName = 'invoice';
 *   // ...
 * }
 * ```
 */
export function RegisterPdfAdapter(templateName: string): ClassDecorator {
  return function (target: any) {
    // Normalize template name: trim whitespace and convert to lowercase
    const normalizedName = templateName.trim().toLowerCase();

    // Store template name as reflection metadata
    Reflect.defineMetadata(PDF_ADAPTER_TEMPLATE_KEY, normalizedName, target);
  };
}
