import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.getSettings(req.tenantId!);
  return sendSuccess(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateSettings(req.tenantId!, req.body);
  return sendSuccess(res, settings);
});

export default {
  getSettings,
  updateSettings,
};
