import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { MemberRole, AuditAction } from '../types/enums';
import { createAuditLog } from './auditLog.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResult {
  user: AuthUser;
  tokens: TokenPair;
}

export async function seedAdminIfEmpty(): Promise<void> {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log('[seed] Users already exist, skipping admin creation');
    return;
  }

  const email = 'admin@agency.com';
  const password = 'Admin123!';
  const name = 'Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  await prisma.workspace.create({
    data: {
      name: 'My Agency',
      members: {
        create: {
          userId: user.id,
          role: MemberRole.OWNER,
        },
      },
    },
  });

  console.log('============================================');
  console.log('[seed] Admin account created:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('  >>> CHANGE THIS PASSWORD AFTER FIRST LOGIN <<<');
  console.log('============================================');
}

export async function register(email: string, password: string, name: string): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ValidationError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `${name}'s Workspace`,
      members: {
        create: {
          userId: user.id,
          role: MemberRole.OWNER,
        },
      },
    },
  });

  await createAuditLog(
    workspace.id,
    user.id,
    AuditAction.USER_REGISTERED,
    'User',
    user.id,
  );

  const tokens = generateTokens({ id: user.id, email: user.email, name: user.name });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    tokens,
  };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    take: 1,
  });

  if (memberships.length > 0) {
    await createAuditLog(
      memberships[0].workspaceId,
      user.id,
      AuditAction.USER_LOGGED_IN,
      'User',
      user.id,
    );
  }

  const tokens = generateTokens({ id: user.id, email: user.email, name: user.name });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    tokens,
  };
}

export function generateTokens(user: AuthUser): TokenPair {
  const accessOpts: jwt.SignOptions = { expiresIn: config.jwt.accessExpiry as unknown as jwt.SignOptions['expiresIn'] };
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwt.accessSecret,
    accessOpts,
  );

  const refreshOpts: jwt.SignOptions = { expiresIn: config.jwt.refreshExpiry as unknown as jwt.SignOptions['expiresIn'] };
  const refreshToken = jwt.sign(
    { id: user.id },
    config.jwt.refreshSecret,
    refreshOpts,
  );

  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(token: string): Promise<AuthResult> {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { id: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokens = generateTokens({ id: user.id, email: user.email, name: user.name });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
