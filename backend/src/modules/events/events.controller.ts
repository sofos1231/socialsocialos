import { Body, Controller, Get, Post, Query, UseGuards, Headers, Res, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwt.guard';
import { EventsService } from './events.service';
import { Response } from 'express';

@ApiTags('events')
@Controller('v1')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Post('events/bulk')
  @ApiOperation({ operationId: 'POST_/v1/events/bulk' })
  @ApiOkResponse({ description: 'Ingest events' })
  async bulk(@Body() body: { items: { name: string; props?: any; ts?: string }[] }) {
    return this.events.bulk(body.items || []);
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get('stats/weekly-xp')
  @ApiOperation({ operationId: 'GET_/v1/stats/weekly-xp' })
  async weekly(@Query('from') from?: string, @Query('to') to?: string, @Headers('if-none-match') inm?: string, @Res() res?: Response) {
    const data = await this.events.weeklyXp(from, to);
    if (inm && data.etag && inm === data.etag) {
      res?.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }
    if (data.etag) {
      res?.setHeader('ETag', data.etag);
    }
    res?.json({ labels: data.labels, xp: data.xp });
  }

  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Get('stats/dashboard')
  @ApiOperation({ operationId: 'GET_/v1/stats/dashboard' })
  async dashboard() {
    return this.events.dashboard();
  }
}


