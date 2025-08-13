    import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getProfile() {
    return {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      level: 5,
      xp: 1250
    };
  }

  updateProfile(data: any) {
    return {
      success: true,
      message: 'Profile updated',
      profile: data
    };
  }
}
