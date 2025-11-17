import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma.service';

@ApiTags('prisma')
@Controller('api/prisma')
export class PrismaController {
  constructor(private readonly prismaService: PrismaService) {}

  @Post('apply')
  @ApiOperation({ operationId: 'POST_/api/prisma/apply' })
  @ApiOkResponse({ description: 'Apply Prisma schema' })
  apply() {
    return this.prismaService.apply();
  }

  @Post('migrate')
  @ApiOperation({ operationId: 'POST_/api/prisma/migrate' })
  @ApiOkResponse({ description: 'Run Prisma migrations' })
  migrate() {
    return this.prismaService.migrate();
  }
}
