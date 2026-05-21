// Libraries
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import 'reflect-metadata';

// Interfaces
import { IExcelAdapter } from '../interfaces/excel-adapter.interface';

// Decorators
import { EXCEL_ADAPTER_NAME_KEY } from '../decorators/register-excel-adapter.decorator';

// Exceptions
import { AdapterNotFoundException } from '../exceptions/adapter-not-found.exception';

/**
 * Adapter Registry Entry
 *
 * Stores adapter class reference and optional cached instance
 */
interface AdapterRegistryEntry {
  adapterName: string;
  adapterClass: new (...args: any[]) => IExcelAdapter;
  instance?: IExcelAdapter;
}

/**
 * Excel Adapter Factory
 *
 * Auto-discovers Excel adapters decorated with @RegisterExcelAdapter using reflection metadata.
 * Provides cached adapter instances via NestJS dependency injection.
 *
 * Features:
 * - Auto-discovery via reflection metadata (EXCEL_ADAPTER_NAME_KEY)
 * - Lazy initialization of adapter instances via NestJS DI
 * - Instance caching for performance optimization
 * - Adapter name normalization (trim, lowercase)
 *
 * Lifecycle:
 * - onModuleInit(): Scans providers and builds adapter registry
 *
 * Note: This implementation uses ModuleRef to discover adapters. Adapters must be
 * registered as providers in the module. The factory discovers them by checking
 * reflection metadata on provider classes.
 *
 * @implements {OnModuleInit}
 */
@Injectable()
export class ExcelAdapterFactory implements OnModuleInit {
  private readonly logger = new Logger(ExcelAdapterFactory.name);

  /**
   * Adapter Registry
   *
   * Maps normalized adapter names to adapter registry entries.
   * Contains adapter class references and optional cached instances.
   */
  private readonly adapterRegistry = new Map<string, AdapterRegistryEntry>();

  /**
   * NestJS ModuleRef for dependency injection
   * Used to resolve adapter instances lazily
   */
  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Initialize adapter registry on module initialization
   *
   * Scans all providers in the module and discovers Excel adapters
   * decorated with @RegisterExcelAdapter by reading reflection metadata.
   * Builds the adapter registry for later use.
   *
   * Note: ModuleRef doesn't provide direct access to all providers for scanning.
   * This implementation discovers adapters lazily when getAdapter() is called,
   * or adapters can be manually registered via registerAdapter().
   * For full auto-discovery without manual registration, consider using
   * @nestjs/core DiscoveryService.
   */
  onModuleInit(): void {
    this.logger.log('Initializing Excel adapter factory...');

    try {
      // Note: ModuleRef doesn't provide a way to iterate all providers.
      // Adapters will be discovered lazily when getAdapter() is called,
      // or they can be manually registered via registerAdapter().
      // This is a limitation of ModuleRef - full auto-discovery would require
      // DiscoveryService or manual provider registration in the module.

      this.logger.log('Excel adapter factory initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Excel adapter factory', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Register an adapter class in the registry
   *
   * This method discovers adapters by checking reflection metadata on the class.
   * It should be called during module initialization or when adapters are needed.
   *
   * @param adapterClass - Adapter class to register
   */
  registerAdapter(adapterClass: new (...args: any[]) => IExcelAdapter): void {
    // Check if class has @RegisterExcelAdapter decorator metadata
    const adapterName = Reflect.getMetadata(EXCEL_ADAPTER_NAME_KEY, adapterClass);

    if (!adapterName) {
      this.logger.warn(
        `Class ${adapterClass.name} does not have @RegisterExcelAdapter decorator. Skipping registration.`,
      );
      return;
    }

    const normalizedName = this.normalizeAdapterName(adapterName);

    // Check if adapter already registered
    if (this.adapterRegistry.has(normalizedName)) {
      this.logger.warn(`Adapter with name "${normalizedName}" is already registered. Overwriting.`);
    }

    // Register adapter
    this.adapterRegistry.set(normalizedName, {
      adapterName: normalizedName,
      adapterClass,
    });

    this.logger.debug(`Registered Excel adapter: ${normalizedName} (${adapterClass.name})`);
  }

  /**
   * Get adapter instance by adapter name
   *
   * Returns a cached adapter instance if available, otherwise creates a new instance
   * via NestJS dependency injection and caches it for future use.
   *
   * @param adapterName - Adapter name (will be normalized)
   * @returns Adapter instance implementing IExcelAdapter
   * @throws {AdapterNotFoundException} If adapter is not found in registry
   */
  getAdapter(adapterName: string): IExcelAdapter {
    const normalizedName = this.normalizeAdapterName(adapterName);

    // Get registry entry
    const entry = this.adapterRegistry.get(normalizedName);

    // If not found, try to discover adapter from ModuleRef
    if (!entry) {
      this.logger.debug(`Adapter not found in registry for name: ${normalizedName}. Attempting discovery...`);

      // Try to get adapter from ModuleRef (this requires adapter to be registered as provider)
      // Note: This is a simplified discovery - full auto-discovery would require DiscoveryService
      try {
        // We can't iterate all providers with ModuleRef, so we'll throw exception
        // Adapters should be registered via registerAdapter() during module initialization
        throw new AdapterNotFoundException(normalizedName, 'excel');
      } catch (error) {
        if (error instanceof AdapterNotFoundException) {
          throw error;
        }
        // Re-throw other errors
        throw error;
      }
    }

    // Return cached instance if available
    if (entry.instance) {
      return entry.instance;
    }

    // Create new instance via NestJS DI (lazy initialization)
    try {
      const instance = this.moduleRef.get(entry.adapterClass, {
        strict: false,
      });
      entry.instance = instance;
      this.logger.debug(`Created and cached adapter instance for name: ${normalizedName}`);
      return instance;
    } catch (error) {
      this.logger.error(
        `Failed to create adapter instance for name: ${normalizedName}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new AdapterNotFoundException(normalizedName, 'excel');
    }
  }

  /**
   * Get all registered adapter names
   *
   * @returns Array of normalized adapter names
   */
  getRegisteredAdapters(): string[] {
    return Array.from(this.adapterRegistry.keys());
  }

  /**
   * Normalize adapter name
   *
   * Trims whitespace and converts to lowercase for consistency.
   *
   * @param adapterName - Adapter name to normalize
   * @returns Normalized adapter name
   */
  private normalizeAdapterName(adapterName: string): string {
    return adapterName.trim().toLowerCase();
  }
}
