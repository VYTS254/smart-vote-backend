import prisma from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { DepartmentStatus } from '@prisma/client';

export interface CreateDepartmentDTO {
  name: string;
  code: string;
}

export interface UpdateDepartmentDTO {
  name?: string;
  code?: string;
  status?: DepartmentStatus;
}

export class DepartmentsService {
  /**
   * Get all departments
   */
  async getAllDepartments(includeInactive = false) {
    const where = includeInactive ? {} : { status: DepartmentStatus.ACTIVE };

    const departments = await prisma.department.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            positions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments;
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            positions: true,
            delegateQualifications: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    return department;
  }

  /**
   * Get department by code
   */
  async getDepartmentByCode(code: string) {
    const department = await prisma.department.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    return department;
  }

  /**
   * Create a new department (Admin only)
   */
  async createDepartment(data: CreateDepartmentDTO) {
    // Check if department with same name or code exists
    const existing = await prisma.department.findFirst({
      where: {
        OR: [{ name: data.name }, { code: data.code }],
      },
    });

    if (existing) {
      throw new ConflictError('Department with this name or code already exists');
    }

    const department = await prisma.department.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        status: DepartmentStatus.ACTIVE,
      },
    });

    return department;
  }

  /**
   * Update department (Admin only)
   */
  async updateDepartment(id: string, data: UpdateDepartmentDTO) {
    // Check if department exists
    const existing = await prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    // Check for conflicts if name or code is being updated
    if (data.name || data.code) {
      const conflict = await prisma.department.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.name ? [{ name: data.name }] : []),
                ...(data.code ? [{ code: data.code }] : []),
              ],
            },
          ],
        },
      });

      if (conflict) {
        throw new ConflictError('Department with this name or code already exists');
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code.toUpperCase() }),
        ...(data.status && { status: data.status }),
      },
    });

    return department;
  }

  /**
   * Delete department (Admin only)
   * Note: This should check if department has users or elections
   */
  async deleteDepartment(id: string) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            positions: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    if (department._count.users > 0 || department._count.positions > 0) {
      throw new ConflictError(
        'Cannot delete department with existing users or positions. Set status to INACTIVE instead.'
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return { message: 'Department deleted successfully' };
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(id: string) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            accountStatus: true,
          },
        },
        delegateQualifications: {
          where: {
            qualificationStatus: 'QUALIFIED',
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    const activeUsers = department.users.filter(u => u.accountStatus === 'ACTIVE').length;
    const totalDelegates = department.delegateQualifications.length;

    return {
      id: department.id,
      name: department.name,
      code: department.code,
      status: department.status,
      stats: {
        totalUsers: department.users.length,
        activeUsers,
        qualifiedDelegates: totalDelegates,
      },
    };
  }
}
