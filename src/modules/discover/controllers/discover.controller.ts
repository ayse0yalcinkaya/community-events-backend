import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from '@/common/decorators';
import { Public } from '@/common/decorators/public.decorator';

import { DiscoverHomeResDto } from '../dto/response/discover-home-res.dto';
import { QueryDiscoverSearchDto } from '../dto/query-discover-search.dto';
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

  @Get('search')
  @ApiEndpoint('Etkinlik kesif aramasi yap', {
    isPublic: true,
  })
  search(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryDiscoverSearchDto) {
    return this.discoverService.search(query);
  }
}
