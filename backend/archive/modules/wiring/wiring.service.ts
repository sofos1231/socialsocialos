import { Injectable } from '@nestjs/common';

@Injectable()
export class WiringService {
  private wiringMatrix: any[] = [];

  getWiring() {
    return this.wiringMatrix;
  }

  updateWiring(data: any) {
    if (Array.isArray(data)) {
      this.wiringMatrix = data;
    } else if (data.wiring) {
      this.wiringMatrix = data.wiring;
    }
    return { success: true, message: 'Wiring updated' };
  }
}
