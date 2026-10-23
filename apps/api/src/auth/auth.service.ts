import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from '../app.config';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto, UserResponseDto } from './auth.dto';

const BCRYPT_ROUNDS = 10;
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Compared against when the email is unknown, so both failures take similar time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: UserResponseDto; token: string }> {
    if (await this.users.findByEmail(dto.email)) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.users.create(dto.email, passwordHash);
      return { user: this.toResponse(user), token: await this.sign(user.id) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  async login(dto: LoginDto): Promise<{ user: UserResponseDto; token: string }> {
    const user = await this.users.findByEmail(dto.email);
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');
    return { user: this.toResponse(user), token: await this.sign(user.id) };
  }

  async me(userId: string): Promise<UserResponseDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Not authenticated');
    return this.toResponse(user);
  }

  private sign(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId }, { secret: config.jwtSecret, expiresIn: Math.floor(SESSION_MAX_AGE_MS / 1000) });
  }

  private toResponse(user: { id: string; email: string; createdAt: Date }): UserResponseDto {
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}