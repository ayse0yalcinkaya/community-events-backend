import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * `@AtLeastOne(['email','phone_number'])`
 */
export function AtLeastOne(properties: string[], validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: properties,
      options: {
        message: `En az bir alan gerekli: ${properties.join(', ')}`,
        ...validationOptions,
      },
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as Record<string, any>;
          return properties.some((p: string) => !!obj[p]);
        },
      },
    });
  };
}
