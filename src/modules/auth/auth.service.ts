import prisma from '../../config/database';
import { JWTService, TokenPair } from '../../config/jwt';
import { PasswordService } from '../../utils/password';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors';
import { AccountStatus, RoleName } from '@prisma/client';

export interface RegisterDTO {
  studentRegistrationNumber: string;
  fullName: string;
  email: string;
  password: string;
  departmentId: string;
}

export interface LoginDTO {
  studentRegistrationNumber: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new student user
   */
  async register(data: RegisterDTO): Promise<{ user: any; tokens: TokenPair }> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { studentRegistrationNumber: data.studentRegistrationNumber },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictError('User with this email or registration number already exists');
    }

    // Validate department exists
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    // Hash password
    const hashedPassword = await PasswordService.hash(data.password);

    // Create user and assign STUDENT role
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          studentRegistrationNumber: data.studentRegistrationNumber,
          fullName: data.fullName,
          email: data.email,
          passwordHash: hashedPassword,
          departmentId: data.departmentId,
          accountStatus: AccountStatus.ACTIVE,
        },
        include: {
          department: true,
        },
      });

      // Get STUDENT role
      let studentRole = await tx.role.findUnique({
        where: { name: RoleName.STUDENT },
      });

      // Create role if it doesn't exist
      if (!studentRole) {
        studentRole = await tx.role.create({
          data: {
            name: RoleName.STUDENT,
            description: 'Student voter role',
          },
        });
      }

      // Assign role
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: studentRole.id,
        },
      });

      return newUser;
    });

    // Generate tokens
    const tokens = JWTService.generateTokenPair({
      userId: user.id,
      email: user.email,
      roles: [RoleName.STUDENT],
    });

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Login a user
   */
  async login(data: LoginDTO): Promise<{ user: any; tokens: TokenPair }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { studentRegistrationNumber: data.studentRegistrationNumber },
      include: {
        department: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check account status
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedError('Account is inactive or suspended');
    }

    // Verify password
    const isValidPassword = await PasswordService.verify(user.passwordHash, data.password);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Extract roles
    const roles = user.roles.map((ur) => ur.role.name);

    // Generate tokens
    const tokens = JWTService.generateTokenPair({
      userId: user.id,
      email: user.email,
      roles,
    });

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
        roles,
      },
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = JWTService.verifyRefreshToken(refreshToken);

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Extract roles
      const roles = user.roles.map((ur) => ur.role.name);

      // Generate new token pair
      return JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        roles,
      });
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    const roles = user.roles.map((ur) => ur.role.name);

    return {
      ...userWithoutPassword,
      roles,
    };
  }
}
