import { Injectable } from '@nestjs/common';

@Injectable()
export class ShopService {
  getItems() {
    return {
      items: [
        { id: '1', name: 'XP Booster', price: 100, type: 'powerup' },
        { id: '2', name: 'Streak Protector', price: 50, type: 'powerup' },
        { id: '3', name: 'Achievement Badge', price: 200, type: 'badge' }
      ]
    };
  }

  purchase(data: any) {
    return {
      success: true,
      message: 'Item purchased successfully',
      item: data
    };
  }
}
