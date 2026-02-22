import { Request, Response } from 'express';
import { vendorsService } from '../services/vendors.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getVendors = asyncHandler(async (req: Request, res: Response) => {
  const result = await vendorsService.getVendors(req.tenantId!, req.query as any);
  return sendSuccess(res, result.vendors, 200, result.meta);
});

export const getVendorById = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorsService.getVendorById(req.tenantId!, req.params.id);
  return sendSuccess(res, vendor);
});

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorsService.createVendor(req.tenantId!, req.body);
  return sendCreated(res, vendor);
});

export const updateVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorsService.updateVendor(req.tenantId!, req.params.id, req.body);
  return sendSuccess(res, vendor);
});

export const deleteVendor = asyncHandler(async (req: Request, res: Response) => {
  await vendorsService.deleteVendor(req.tenantId!, req.params.id);
  return sendNoContent(res);
});

export const getVendorContracts = asyncHandler(async (req: Request, res: Response) => {
  const result = await vendorsService.getVendorContracts(req.tenantId!, req.params.id, req.query);
  return sendSuccess(res, result.contracts, 200, result.meta);
});

export const getVendorInvoices = asyncHandler(async (req: Request, res: Response) => {
  const result = await vendorsService.getVendorInvoices(req.tenantId!, req.params.id, req.query);
  return sendSuccess(res, result.invoices, 200, result.meta);
});

export default {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorContracts,
  getVendorInvoices,
};
