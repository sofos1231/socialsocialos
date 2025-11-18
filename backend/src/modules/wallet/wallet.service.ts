import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletForUser(userId: string) {
    return this.prisma.userWallet.findUnique({
      where: { userId },
    });
  }
}
