import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db';
import { env } from '../config/env';

// Schemas for validation
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  jobRole: z.string().optional(),
  experienceLevel: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  /**
   * Register a new candidate.
   */
  static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = signupSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        res.status(400).json({ error: 'Email is already registered' });
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(validatedData.password, salt);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          jobRole: validatedData.jobRole || '',
          experienceLevel: validatedData.experienceLevel || '',
        },
      });

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          jobRole: user.jobRole,
          experienceLevel: user.experienceLevel,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
        return;
      }
      next(error);
    }
  }

  /**
   * Login candidate.
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Verify password
      const isMatch = await bcrypt.compare(validatedData.password, user.password);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          jobRole: user.jobRole,
          experienceLevel: user.experienceLevel,
        },
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
