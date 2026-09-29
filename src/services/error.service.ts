import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export class AppError extends Error {
  code: string;
  
  constructor(public statusCode: number, public message: string, code = 'ERROR') {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
