import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  async enqueue(_msg: { to: string; title: string; body: string }) {
    // TODO: push to queue/provider
    return;
  }
}


