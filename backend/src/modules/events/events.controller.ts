import { Body, Controller, Get, Post, Query, UseGuards, Headers, Res, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EventsService } from './events.service';
import { FastifyReply } from 'fastify';

@ApiTags('events')
@Controller('v1')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('events/bulk')
  @ApiOperation({ operationId: 'POST_/v1/events/bulk' })
  @ApiOkResponse({ description: 'Ingest events' })
  async bulk(@Body() body: { items: { name: string; props?: any; ts?: string }[] }) {
    return this.events.bulk(body.items || []);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('stats/weekly-xp')
  @ApiOperation({ operationId: 'GET_/v1/stats/weekly-xp' })
  async weekly(@Query('from') from?: string, @Query('to') to?: string, @Headers('if-none-match') inm?: string, @Res() res?: FastifyReply) {
    const data = await this.events.weeklyXp(from, to);
    if (inm && data.etag && inm === data.etag) {
      res?.status(HttpStatus.NOT_MODIFIED).send();
      return;
    }
    if (data.etag) {
      res?.header('ETag', data.etag);
    }
    res?.send({ labels: data.labels, xp: data.xp });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('stats/dashboard')
  @ApiOperation({ operationId: 'GET_/v1/stats/dashboard' })
  async dashboard() {
    return this.events.dashboard();
  }
}


