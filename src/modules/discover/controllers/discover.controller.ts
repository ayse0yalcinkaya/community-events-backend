// Libraries
import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '@/common/decorators';

// DTOs
import { DiscoverHomeResDto } from '../dto/response/discover-home-res.dto';
import { DiscoverUnifiedSearchResDto } from '../dto/response/discover-unified-search-res.dto';
import { QueryDiscoverSearchDto } from '../dto/query-discover-search.dto';

// Interfaces
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

// Guards
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';

// Decorators
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';

// Services
import { DiscoverService } from '../services/discover.service';
@ApiTags('Discover')
@Public()
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  @Get('home')
  @ApiEndpoint('Ana sayfa kesif verilerini getir', {
    type: DiscoverHomeResDto,
    isPublic: true,
  })
  getHome() {
    return this.discoverService.getHome();
  }

  @Get('feed')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiEndpoint('Kisisellestirilmis etkinlik akisi', {
    type: DiscoverHomeResDto,
    isPublic: true,
  })
  getFeed(@CurrentUser() user?: JwtPayload) {
    return this.discoverService.getPersonalizedFeed(user?.sub);
  }

  @Get('search')
  @ApiEndpoint('Etkinlik kesif aramasi yap', {
    isPublic: true,
  })
  search(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryDiscoverSearchDto) {
    return this.discoverService.search(query);
  }

  @Get('search/all')
  @ApiEndpoint('Etkinlik topluluk kategori ve kisi aramasi yap', {
    type: DiscoverUnifiedSearchResDto,
    isPublic: true,
  })
  unifiedSearch(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryDiscoverSearchDto) {
    return this.discoverService.unifiedSearch(query);
  }
}
