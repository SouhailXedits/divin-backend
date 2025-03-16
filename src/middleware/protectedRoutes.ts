import { Router, Request, Response, NextFunction } from 'express';
import { checkViewPermission, checkEditPermission, checkDeletePermission } from './checkPermissions';

/**
 * Creates a protected router for a specific resource
 * 
 * @param resource The resource name (e.g., 'users', 'accounts')
 * @returns A router with permission-protected routes
 */
export const createProtectedRouter = (resource: string) => {
  const router = Router();
  
  // Middleware that checks if the staff has view permission for this resource
  const viewMiddleware = [checkViewPermission(resource)];
  
  // Middleware that checks if the staff has edit permission for this resource
  const editMiddleware = [checkEditPermission(resource)];
  
  // Middleware that checks if the staff has delete permission for this resource
  const deleteMiddleware = [checkDeletePermission(resource)];
  
  /**
   * Add a protected GET route that requires view permission
   */
  const getRoute = (
    path: string, 
    handlers: Array<(req: Request, res: Response, next: NextFunction) => void>
  ) => {
    router.get(path, [...viewMiddleware, ...handlers]);
    return router;
  };
  
  /**
   * Add a protected POST route that requires edit permission
   */
  const postRoute = (
    path: string, 
    handlers: Array<(req: Request, res: Response, next: NextFunction) => void>
  ) => {
    router.post(path, [...editMiddleware, ...handlers]);
    return router;
  };
  
  /**
   * Add a protected PUT route that requires edit permission
   */
  const putRoute = (
    path: string, 
    handlers: Array<(req: Request, res: Response, next: NextFunction) => void>
  ) => {
    router.put(path, [...editMiddleware, ...handlers]);
    return router;
  };
  
  /**
   * Add a protected PATCH route that requires edit permission
   */
  const patchRoute = (
    path: string, 
    handlers: Array<(req: Request, res: Response, next: NextFunction) => void>
  ) => {
    router.patch(path, [...editMiddleware, ...handlers]);
    return router;
  };
  
  /**
   * Add a protected DELETE route that requires delete permission
   */
  const deleteRoute = (
    path: string, 
    handlers: Array<(req: Request, res: Response, next: NextFunction) => void>
  ) => {
    router.delete(path, [...deleteMiddleware, ...handlers]);
    return router;
  };
  
  return {
    router,
    get: getRoute,
    post: postRoute,
    put: putRoute,
    patch: patchRoute,
    delete: deleteRoute,
  };
}; 