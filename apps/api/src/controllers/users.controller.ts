import { Request, Response } from 'express';
import { usersService } from '../services/users.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await usersService.getUsers(req.tenantId!, req.query as any);
  return sendSuccess(res, result.users, 200, result.meta);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUserById(req.tenantId!, req.params.id);
  return sendSuccess(res, user);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.createUser(req.tenantId!, req.body);
  return sendCreated(res, user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateUser(req.tenantId!, req.params.id, req.body);
  return sendSuccess(res, user);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await usersService.deleteUser(req.tenantId!, req.params.id, req.userId!);
  return sendNoContent(res);
});

export const toggleUserActive = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.toggleUserActive(req.tenantId!, req.params.id, req.userId!);
  return sendSuccess(res, user);
});

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
};
