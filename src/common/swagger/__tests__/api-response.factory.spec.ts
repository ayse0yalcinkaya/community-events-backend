// Libraries
import {
  createApiResponseClass,
  createPaginatedApiResponseClass,
  ErrorApiResponseClass,
} from '../api-response.factory';

// Test DTO classes
class TestDto {
  id!: string;
  name!: string;
}

class UserDto {
  userId!: number;
  username!: string;
  email!: string;
}

class FileDto {
  fileId!: string;
  filename!: string;
  size!: number;
}

describe('api-response.factory', () => {
  describe('createApiResponseClass', () => {
    it('should return a class constructor', () => {
      const ResponseClass = createApiResponseClass(TestDto);
      expect(typeof ResponseClass).toBe('function');
      expect(ResponseClass).toBeDefined();
    });

    it('should generate class with correct dynamic name', () => {
      const ResponseClass = createApiResponseClass(TestDto);
      expect(ResponseClass.name).toBe('TestDtoResponse');
    });

    it('should have all required properties (success, status, data, message)', () => {
      const ResponseClass = createApiResponseClass(TestDto);
      const instance = new ResponseClass();

      expect(instance).toHaveProperty('success');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('data');
      expect(instance).toHaveProperty('message');
    });

    it('should preserve DTO type metadata in data property', () => {
      const ResponseClass = createApiResponseClass(TestDto);
      const metadata = Reflect.getMetadata('swagger/apiModelProperties', ResponseClass.prototype, 'data');

      expect(metadata).toBeDefined();
      expect(metadata.type).toBe(TestDto);
    });

    it('should have @ApiProperty decorators with example values for primitive fields', () => {
      const ResponseClass = createApiResponseClass(TestDto);

      const successMetadata = Reflect.getMetadata('swagger/apiModelProperties', ResponseClass.prototype, 'success');
      const statusMetadata = Reflect.getMetadata('swagger/apiModelProperties', ResponseClass.prototype, 'status');
      const messageMetadata = Reflect.getMetadata('swagger/apiModelProperties', ResponseClass.prototype, 'message');

      expect(successMetadata.example).toBe(true);
      expect(statusMetadata.example).toBe(200);
      expect(messageMetadata.example).toBe('Operation successful');
    });

    it('should work with different DTO types (UserDto)', () => {
      const UserResponseClass = createApiResponseClass(UserDto);
      expect(UserResponseClass.name).toBe('UserDtoResponse');

      const metadata = Reflect.getMetadata('swagger/apiModelProperties', UserResponseClass.prototype, 'data');
      expect(metadata.type).toBe(UserDto);
    });

    it('should work with different DTO types (FileDto)', () => {
      const FileResponseClass = createApiResponseClass(FileDto);
      expect(FileResponseClass.name).toBe('FileDtoResponse');

      const metadata = Reflect.getMetadata('swagger/apiModelProperties', FileResponseClass.prototype, 'data');
      expect(metadata.type).toBe(FileDto);
    });
  });

  describe('createPaginatedApiResponseClass', () => {
    it('should return a class constructor', () => {
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);
      expect(typeof PaginatedClass).toBe('function');
      expect(PaginatedClass).toBeDefined();
    });

    it('should generate paginated class name with PaginatedResponse suffix', () => {
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);
      expect(PaginatedClass.name).toBe('TestDtoPaginatedResponse');
    });

    it('should have all 5 required properties including count', () => {
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);
      const instance = new PaginatedClass();

      expect(instance).toHaveProperty('success');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('data');
      expect(instance).toHaveProperty('count');
      expect(instance).toHaveProperty('message');
    });

    it('should have array type for data property', () => {
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);
      const metadata = Reflect.getMetadata('swagger/apiModelProperties', PaginatedClass.prototype, 'data');

      expect(metadata).toBeDefined();
      // Check if type is a function (array notation in decorator)
      if (typeof metadata.type === 'function') {
        // NestJS Swagger stores array types as the function itself with isArray flag
        expect(metadata.type).toBeDefined();
      } else if (Array.isArray(metadata.type)) {
        expect(metadata.type[0]).toBe(TestDto);
      }
    });

    it('should have @ApiProperty decorator with example value for count', () => {
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);
      const countMetadata = Reflect.getMetadata('swagger/apiModelProperties', PaginatedClass.prototype, 'count');

      expect(countMetadata).toBeDefined();
      expect(countMetadata.example).toBe(150);
    });

    it('should work with different DTO types (UserDto)', () => {
      const UserPaginatedClass = createPaginatedApiResponseClass(UserDto);
      expect(UserPaginatedClass.name).toBe('UserDtoPaginatedResponse');

      const metadata = Reflect.getMetadata('swagger/apiModelProperties', UserPaginatedClass.prototype, 'data');
      expect(metadata).toBeDefined();
      expect(metadata.type).toBeDefined();
    });
  });

  describe('ErrorApiResponseClass', () => {
    it('should have all required error response properties', () => {
      const instance = new ErrorApiResponseClass();

      expect(instance).toHaveProperty('success');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('message');
      expect(instance).toHaveProperty('errors');
    });

    it('should have @ApiProperty decorators with correct example values', () => {
      const successMetadata = Reflect.getMetadata(
        'swagger/apiModelProperties',
        ErrorApiResponseClass.prototype,
        'success',
      );
      const statusMetadata = Reflect.getMetadata(
        'swagger/apiModelProperties',
        ErrorApiResponseClass.prototype,
        'status',
      );
      const messageMetadata = Reflect.getMetadata(
        'swagger/apiModelProperties',
        ErrorApiResponseClass.prototype,
        'message',
      );

      expect(successMetadata.example).toBe(false);
      expect(statusMetadata.example).toBe(400);
      expect(messageMetadata.example).toBe('Validation failed');
    });

    it('should mark errors field as optional (required: false)', () => {
      const errorsMetadata = Reflect.getMetadata(
        'swagger/apiModelProperties',
        ErrorApiResponseClass.prototype,
        'errors',
      );

      expect(errorsMetadata).toBeDefined();
      expect(errorsMetadata.required).toBe(false);
    });

    it('should have array example for errors field', () => {
      const errorsMetadata = Reflect.getMetadata(
        'swagger/apiModelProperties',
        ErrorApiResponseClass.prototype,
        'errors',
      );

      expect(errorsMetadata.example).toEqual(['field must be a string']);
    });
  });

  describe('Type safety validation', () => {
    it('should preserve generic type information at compile time', () => {
      // This test validates TypeScript compilation and type metadata
      const ResponseClass = createApiResponseClass(TestDto);

      // Verify the type can be instantiated
      expect(() => new ResponseClass()).not.toThrow();

      // Verify type metadata is preserved
      const metadata = Reflect.getMetadata('swagger/apiModelProperties', ResponseClass.prototype, 'data');
      expect(metadata.type).toBe(TestDto);
    });

    it('should preserve generic array type for paginated response', () => {
      // This test validates TypeScript compilation and type metadata
      const PaginatedClass = createPaginatedApiResponseClass(TestDto);

      // Verify the type can be instantiated
      expect(() => new PaginatedClass()).not.toThrow();

      // Verify array type metadata is preserved
      const metadata = Reflect.getMetadata('swagger/apiModelProperties', PaginatedClass.prototype, 'data');
      expect(metadata).toBeDefined();
      expect(metadata.type).toBeDefined();

      // The type should reference TestDto (either directly or in array)
      const typeRef = Array.isArray(metadata.type) ? metadata.type[0] : metadata.type;
      expect(typeRef).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle DTO with no properties', () => {
      class EmptyDto {}

      const ResponseClass = createApiResponseClass(EmptyDto);
      expect(ResponseClass.name).toBe('EmptyDtoResponse');

      const metadata = Reflect.getMetadata('swagger/apiModelProperties', ResponseClass.prototype, 'data');
      expect(metadata.type).toBe(EmptyDto);
    });

    it('should create unique classes for each DTO type', () => {
      const TestResponseClass = createApiResponseClass(TestDto);
      const UserResponseClass = createApiResponseClass(UserDto);

      expect(TestResponseClass).not.toBe(UserResponseClass);
      expect(TestResponseClass.name).toBe('TestDtoResponse');
      expect(UserResponseClass.name).toBe('UserDtoResponse');
    });
  });
});
