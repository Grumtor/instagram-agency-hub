import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { MemberRole, AuditAction } from '../types/enums';
import { createAuditLog } from './auditLog.service';
import { logger } from '../utils/logger';

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
  const name = 'Admin';

  let password: string;
  if (process.env.ADMIN_SEED_PASSWORD) {
    password = process.env.ADMIN_SEED_PASSWORD;
  } else if (config.isProd) {
    password = crypto.randomUUID();
  } else {
    password = 'Admin123!';
  }

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
  console.log(`  Email: ${email}`);
  if (process.env.ADMIN_SEED_PASSWORD) {
    console.log('  Password: (set via ADMIN_SEED_PASSWORD env var)');
  } else if (config.isProd) {
    console.log(`  Password: ${password}`);
    console.log('  >>> This is a one-time random password. Set ADMIN_SEED_PASSWORD for control. <<<');
  } else {
    console.log('  Password: (dev default -- see source)');
  }
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

  const tokens = await generateTokens({ id: user.id, email: user.email, name: user.name });

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

  const tokens = await generateTokens({ id: user.id, email: user.email, name: user.name });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    tokens,
  };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

export async function generateTokens(user: AuthUser, familyId?: string): Promise<TokenPair> {
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

  const tokenHash = hashToken(refreshToken);
  const resolvedFamilyId = familyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parseExpiryToMs(config.jwt.refreshExpiry));

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId: resolvedFamilyId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(token: string): Promise<AuthResult> {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { id: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokenHash = hashToken(token);
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record) {
      throw new UnauthorizedError('Refresh token not recognized');
    }

    if (record.isRevoked) {
      // Replay detected: revoke entire token family
      await prisma.refreshToken.updateMany({
        where: { familyId: record.familyId },
        data: { isRevoked: true },
      });
      logger.warn({ userId: user.id, familyId: record.familyId }, 'Refresh token replay detected, revoking family');
      throw new UnauthorizedError('Refresh token has been revoked (possible token theft detected)');
    }

    // Mark current token as revoked (single-use)
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true },
    });

    // Generate new token pair in the same family
    const tokens = await generateTokens(
      { id: user.id, email: user.email, name: user.name },
      record.familyId,
    );

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

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

export async function logout(userId: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (record) {
      // Revoke the entire token family
      await prisma.refreshToken.updateMany({
        where: { familyId: record.familyId },
        data: { isRevoked: true },
      });
    }
  } else {
    await revokeAllUserTokens(userId);
  }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Revoke all refresh tokens (force re-login on all devices)
  await revokeAllUserTokens(userId);

  // Create audit log entry
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    take: 1,
  });
  if (memberships.length > 0) {
    await createAuditLog(
      memberships[0].workspaceId,
      userId,
      AuditAction.PASSWORD_CHANGED,
      'User',
      userId,
    );
  }

  return { message: 'Password changed successfully' };
}
