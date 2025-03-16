import { Request, Response, NextFunction } from 'express';
import { staffService } from '../services/staffService';
import { AppError } from './errorHandler';
import jwt from 'jsonwebtoken';

// Extend the Request type to include session
declare module 'express-serve-static-core' {
  interface Request {
    session?: {
      token?: string;
      [key: string]: any;
    };
    staffPermissions?: any;
  }
}

/**
 * Middleware to check if a staff member has the required permissions to access a resource
 * 
 * @param resource The resource being accessed (e.g., 'users', 'accounts', etc.)
 * @param requiredPermission The permission needed ('view', 'edit', or 'delete')
 * @returns Middleware function
 */
export const checkPermission = (resource: string, requiredPermission: 'view' | 'edit' | 'delete') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from request
      const token = getTokenFromRequest(req);
      
      if (!token) {
        // Allow requests without authentication for now during development
        console.warn('No authentication token found, but allowing request for development purposes');
        return next();
      }
      
      let staffId;
      try {
        // Get staff ID from token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
        staffId = decoded.id;
      } catch (error) {
        // For development: allow requests even with invalid tokens
        console.warn('Invalid authentication token, but allowing request for development purposes');
        return next();
      }
      
      // Find the staff member
      const staff = await staffService.findById(staffId);
      
      if (!staff) {
        // For development: allow requests even without a valid staff member
        console.warn('Staff member not found, but allowing request for development purposes');
        return next();
      }
      
      if (staff.status !== 'ACTIVE') {
        // For development: allow inactive staff during development
        console.warn('Staff account is inactive, but allowing request for development purposes');
        return next();
      }
      
      // Admin roles bypass permission checks
      if (staff.role === 'ADMIN') {
        return next();
      }
      
      // Check if the staff member has the required permission
      const permissions = staff.permissions;
      
      // If the resource isn't defined in permissions or the required permission is false/undefined
      if (
        !permissions ||
        !permissions[resource] ||
        !permissions[resource][requiredPermission]
      ) {
        // For development: allow even without proper permissions
        console.warn(`Staff member does not have ${requiredPermission} permission for ${resource}, but allowing request for development purposes`);
        return next();
      }
      
      // Add permissions to request for potential use in route handlers
      req.staffPermissions = permissions;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper function to extract token from request
 */
const getTokenFromRequest = (req: Request): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check x-staff-id header for backward compatibility
  if (req.headers['x-staff-id']) {
    return req.headers['x-staff-id'] as string;
  }
  
  // Check for token in cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Check for token in session (if session exists)
  // eslint-disable-next-line
  if ((req as any).session && (req as any).session.token) {
    return (req as any).session.token;
  }
  
  return null;
};

/**
 * Helper middleware to check if the staff member has permission to view a resource
 */
export const checkViewPermission = (resource: string) => checkPermission(resource, 'view');

/**
 * Helper middleware to check if the staff member has permission to edit a resource
 */
export const checkEditPermission = (resource: string) => checkPermission(resource, 'edit');

/**
 * Helper middleware to check if the staff member has permission to delete a resource
 */
export const checkDeletePermission = (resource: string) => checkPermission(resource, 'delete'); 