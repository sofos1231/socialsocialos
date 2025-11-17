import { Injectable } from '@nestjs/common';

@Injectable()
export class ContractsService {
  private openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'SocialGym API',
      version: '1.0.0',
      description: 'API for SocialGym application'
    },
    paths: {}
  };

  getOpenApi() {
    return this.openApiSpec;
  }

  sync(data: any) {
    if (data.openapi) {
      this.openApiSpec = data.openapi;
    }
    return { success: true, message: 'Contracts synced' };
  }
}
