import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  async login(body: { email: string }) {
    const email = (body?.email || '').toLowerCase().trim();
    if (!email) throw new BadRequestException('email required');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('invalid email');
    const token = await this.jwt.signAsync({ sub: user.id, email });
    return { token, user: { id: user.id, email: user.email } };
  }
}


