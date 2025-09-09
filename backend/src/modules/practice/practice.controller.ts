import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { PracticeService, ComponentLayout } from './practice.service';
import { PracticeFlowService } from './practice.flow.service';

@ApiTags('practice')
@Controller('practice')
@UseGuards(JwtAuthGuard)
export class PracticeController {
  constructor(private readonly practiceService: PracticeService, private flow: PracticeFlowService) {}

  @Get('categories')
  @ApiOperation({ operationId: 'GET_/practice/categories' })
  @ApiOkResponse({ description: 'Get practice categories' })
  getCategories() {
    return this.practiceService.getCategories();
  }

  // Aggregate hub data
  @Get('hub')
  @ApiOperation({ operationId: 'GET_/practice/hub' })
  @ApiOkResponse({ description: 'Get practice hub aggregate' })
  async getHub(@Req() req: any) {
    return this.flow.getHubAggregate(req.user.userId as string);
  }

  @Get('sessions')
  @ApiOperation({ operationId: 'GET_/practice/sessions' })
  @ApiOkResponse({ description: 'Get practice sessions' })
  getSessions() {
    return this.practiceService.getSessions();
  }

  // Missions list with computed status
  @Get('missions')
  @ApiOperation({ operationId: 'GET_/practice/missions' })
  @ApiOkResponse({ description: 'Get missions with status' })
  async getMissions(@Query('category') category?: string, @Req() req: any) {
    return this.flow.listMissions(req.user.userId as string, category);
  }

  @Get('pages')
  @ApiOperation({ operationId: 'GET_/practice/pages' })
  @ApiOkResponse({ description: 'Get available pages' })
  getPages() {
    return this.practiceService.getPages();
  }

  @Get('layouts')
  @ApiOperation({ operationId: 'GET_/practice/layouts' })
  @ApiOkResponse({ description: 'Get component layouts' })
  getLayouts(@Query('page') page?: string) {
    return this.practiceService.getComponentLayouts(page);
  }

  @Post('layouts')
  @ApiOperation({ operationId: 'POST_/practice/layouts' })
  @ApiOkResponse({ description: 'Update component layouts' })
  updateLayouts(@Body() layouts: ComponentLayout[]) {
    return this.practiceService.updateComponentLayouts(layouts);
  }

  @Post('sync')
  @ApiOperation({ operationId: 'POST_/practice/sync' })
  @ApiOkResponse({ description: 'Sync with React Native app' })
  async syncWithApp() {
    return this.practiceService.syncWithApp();
  }

  @Get('sync/status')
  @ApiOperation({ operationId: 'GET_/practice/sync/status' })
  @ApiOkResponse({ description: 'Get sync status' })
  getSyncStatus() {
    return this.practiceService.getSyncStatus();
  }

  @Post('push-to-app')
  @ApiOperation({ operationId: 'POST_/practice/push-to-app' })
  @ApiOkResponse({ description: 'Push current layouts to React Native app' })
  async pushToApp() {
    const layouts = this.practiceService.getComponentLayouts();
    return this.practiceService.pushChangesToApp(layouts);
  }

  // Sessions lifecycle
  @Post('start')
  @ApiOperation({ operationId: 'POST_/practice/start' })
  async start(@Body() body: { missionId?: string; mode: 'standard'|'quick'|'shadow' }, @Req() req: any) {
    return this.flow.startSession(req.user.userId as string, body);
  }

  @Post('submit/:sessionId')
  @ApiOperation({ operationId: 'POST_/practice/submit/{sessionId}' })
  async submit(@Param('sessionId') sessionId: string, @Body() body: any, @Req() req: any) {
    return this.flow.submitTurn(req.user.userId as string, sessionId, body);
  }

  @Post('complete/:sessionId')
  @ApiOperation({ operationId: 'POST_/practice/complete/{sessionId}' })
  async complete(@Param('sessionId') sessionId: string, @Req() req: any) {
    const result = await this.flow.completeSession(req.user.userId as string, sessionId);
    if (process.env.NODE_ENV !== 'production') {
      // Enrich with dev-only normalized metrics object for verification
      const session = await (this as any).flow['prisma'].practiceSession.findUnique({ where: { id: sessionId } });
      let metricsObj: any = {};
      try { metricsObj = session?.metrics ? JSON.parse((session as any).metrics) : {}; } catch { metricsObj = {}; }
      return { ...result, _debug: { metricsType: typeof (session as any)?.metrics, metricsPreview: metricsObj } } as any;
    }
    return result as any;
  }

  @Post('abort/:sessionId')
  @ApiOperation({ operationId: 'POST_/practice/abort/{sessionId}' })
  async abort(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.flow.abortSession(req.user.userId as string, sessionId);
  }
}
