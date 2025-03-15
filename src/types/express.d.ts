import { ModulePermissions } from '../services/staffService';

declare global {
  namespace Express {
    interface Request {
      staffPermissions?: ModulePermissions;
    }
  }
}

export {}; 