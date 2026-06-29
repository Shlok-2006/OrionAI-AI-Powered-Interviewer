import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  jobRole: z.string().min(2, 'Job role must be at least 2 characters').optional(),
  experienceLevel: z.string().min(2, 'Experience level must be at least 2 characters').optional(),
  dob: z.string().optional().nullable(),
  userType: z.string().optional().nullable(),
  university: z.string().optional().nullable(),
  yearsOfExperience: z.string().optional().nullable(),
});

export class ProfileController {
  /**
   * Get current candidate profile.
   */
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          jobRole: true,
          experienceLevel: true,
          dob: true,
          userType: true,
          university: true,
          yearsOfExperience: true,
          resumePath: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current candidate profile.
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = updateProfileSchema.parse(req.body);

      // Handle uploaded resume file from multer
      const updateData: any = { ...validatedData };
      if (req.file) {
        updateData.resumePath = `/uploads/${req.file.filename}`;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          jobRole: true,
          experienceLevel: true,
          dob: true,
          userType: true,
          university: true,
          yearsOfExperience: true,
          resumePath: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
        return;
      }
      next(error);
    }
  }
}
