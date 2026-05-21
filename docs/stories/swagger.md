Haklısın! İşte pratik ve temiz bir yaklaşım:
:dart: Tavsiyem: 3 Katmanlı Sistem
1. Katman: Plugin (Otomatik - DTO'larda)
// location.dto.ts
export class LocationDto {
  @IsString()
  id: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsNumber()
  latitude: number;
  
  @IsOptional()
  description?: string;
}
// ✅ Temiz! Plugin halleder
2. Katman: Tek Decorator (Controller'da)
// decorators/api-endpoint.decorator.ts
import { applyDecorators } from '@nestjs/common';

export function ApiEndpoint(summary: string, options: {
  type?: any;
  isPaginated?: boolean;
  isPublic?: boolean;
} = {}) {
  const decorators = [
    ApiOperation({ summary }),
    ApiBadRequestResponse({ type: ErrorApiResponseClass }),
  ];

  // Auth gerekliyse
  if (!options.isPublic) {
    decorators.push(
      ApiBearerAuth(),
      ApiUnauthorizedResponse({ type: ErrorApiResponseClass })
    );
  }

  // Response type varsa
  if (options.type) {
    const responseType = options.isPaginated 
      ? createPaginatedApiResponseClass(options.type)
      : options.type;
    
    decorators.push(
      ApiOkResponse({ type: responseType })
    );
  }

  return applyDecorators(...decorators);
}
Kullanımı:
@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  
  @ApiEndpoint('Tüm lokasyonları getir', { 
    type: LocationDto, 
    isPaginated: true 
  })
  @Get()
  async findAll() {}

  @ApiEndpoint('Lokasyon detayı', { type: LocationDto })
  @Get(':id')
  async findOne() {}

  @ApiEndpoint('Yeni lokasyon oluştur', { type: LocationDto })
  @Post()
  async create() {}
}
3. Katman: CRUD Shortcuts (Daha da kısa)
// decorators/api-crud.decorator.ts
export const ApiGetAll = (type: any) => 
  ApiEndpoint('Tümünü listele', { type, isPaginated: true });

export const ApiGetOne = (type: any) => 
  applyDecorators(
    ApiEndpoint('Detayı getir', { type }),
    ApiNotFoundResponse({ type: ErrorApiResponseClass })
  );

export const ApiCreate = (type: any) => 
  applyDecorators(
    ApiEndpoint('Yeni kayıt oluştur', { type }),
    ApiCreatedResponse({ type })
  );

export const ApiUpdate = (type: any) => 
  applyDecorators(
    ApiEndpoint('Kaydı güncelle', { type }),
    ApiNotFoundResponse({ type: ErrorApiResponseClass })
  );

export const ApiDelete = () => 
  applyDecorators(
    ApiEndpoint('Kaydı sil', {}),
    ApiNoContentResponse({ description: 'Başarıyla silindi' }),
    ApiNotFoundResponse({ type: ErrorApiResponseClass })
  );
Ultra Kısa Kullanım:
@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  
  @ApiGetAll(LocationDto)
  @Get()
  async findAll() {}

  @ApiGetOne(LocationDto)
  @Get(':id')
  async findOne() {}

  @ApiCreate(LocationDto)
  @Post()
  async create(@Body() dto: CreateLocationDto) {}

  @ApiUpdate(LocationDto)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {}

  @ApiDelete()
  @Delete(':id')
  async remove(@Param('id') id: string) {}
}

