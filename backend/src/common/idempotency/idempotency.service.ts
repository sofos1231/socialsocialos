import { Injectable } from '@nestjs/common';

@Injectable()
export class IdempotencyService {
  // Minimal contract; fill with your storage/locking later
  async isDuplicate(key: string): Promise<boolean> {
    return false;
  }
  async remember(key: string, result: unknown): Promise<void> {
    // persist mapping key -> result
  }
  async fetch(key: string): Promise<unknown | null> {
    return null;
  }
}
