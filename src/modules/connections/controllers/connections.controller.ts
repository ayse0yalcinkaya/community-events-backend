import { Controller, Get, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import type { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';

import { QueryConnectionsDto } from '../dto/query-connections.dto';
import { ConnectionResDto } from '../dto/response/connection-res.dto';
import { ConnectionsService } from '../services/connections.service';

@ApiTags('Connections')
@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post(':userId/request')
  @ApiEndpoint('Kullaniciya baglanti istegi gonder', { type: ConnectionResDto, params: [{ name: 'userId' }] })
  requestConnection(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.connectionsService.requestConnection(user.sub, userId);
  }

  @Patch(':id/accept')
  @ApiEndpoint('Baglanti istegini kabul et', { type: ConnectionResDto, params: [{ name: 'id' }] })
  acceptConnection(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.connectionsService.acceptConnection(id, user.sub);
  }

  @Patch(':id/reject')
  @ApiEndpoint('Baglanti istegini reddet', { type: ConnectionResDto, params: [{ name: 'id' }] })
  rejectConnection(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.connectionsService.rejectConnection(id, user.sub);
  }

  @Get()
  @ApiEndpoint('Baglantilari listele', { type: ConnectionResDto })
  listConnections(
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: QueryConnectionsDto,
  ) {
    return this.connectionsService.listConnections(user.sub, query);
  }
}
