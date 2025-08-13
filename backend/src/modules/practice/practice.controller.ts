import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { PracticeService, ComponentLayout } from './practice.service';

@ApiTags('practice')
@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('categories')
  @ApiOperation({ operationId: 'GET_/practice/categories' })
  @ApiOkResponse({ description: 'Get practice categories' })
  getCategories() {
    return this.practiceService.getCategories();
  }

  @Get('sessions')
  @ApiOperation({ operationId: 'GET_/practice/sessions' })
  @ApiOkResponse({ description: 'Get practice sessions' })
  getSessions() {
    return this.practiceService.getSessions();
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
}
