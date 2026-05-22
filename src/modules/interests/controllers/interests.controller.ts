import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators/public.decorator';

import { InterestsService } from '../services/interests.service';

@ApiTags('Interests')
@Public()
@Controller('interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Get()
  getAll(@Query('categoryId') categoryId?: string) {
    return this.interestsService.getAll(categoryId);
  }
}
