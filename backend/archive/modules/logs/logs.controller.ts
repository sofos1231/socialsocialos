import { Controller, Get, Post, Body, Res, Query } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { LogsService } from './logs.service';

@ApiTags('logs')
@Controller('api/logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('ingest')
  @ApiOperation({ operationId: 'POST_/api/logs/ingest' })
  @ApiOkResponse({ description: 'Ingest log entry' })
  ingest(@Body() data: any) {
    return this.logsService.ingest(data);
  }

  @Get('query')
  @ApiOperation({ operationId: 'GET_/api/logs/query' })
  @ApiOkResponse({ description: 'Query logs' })
  query(@Query() query: any) {
    return this.logsService.query(query);
  }

  @Get('stream')
  @ApiOperation({ operationId: 'GET_/api/logs/stream' })
  @ApiOkResponse({ description: 'Stream logs via SSE' })
  async stream(@Res() res: FastifyReply) {
    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': 'http://localhost:5173',
    });

    // Send initial ping
    res.raw.write('event: ping\ndata: {}\n\n');

    // Send connected event
    res.raw.write(`data: ${JSON.stringify({
      type: 'connected',
      ts: new Date().toISOString()
    })}\n\n`);

    // Set up SSE connection
    this.logsService.addClient(res.raw);

    // Handle client disconnect
    res.raw.on('close', () => {
      this.logsService.removeClient(res.raw);
    });
  }
}
