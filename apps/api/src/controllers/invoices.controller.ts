import { Request, Response } from 'express';
import { invoicesService } from '../services/invoices.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const result = await invoicesService.getInvoices(req.tenantId!, req.query as any);
  return sendSuccess(res, result.invoices, 200, result.meta);
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoicesService.getInvoiceById(req.tenantId!, req.params.id);
  return sendSuccess(res, invoice);
});

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoicesService.createInvoice(req.tenantId!, req.body);
  return sendCreated(res, invoice);
});

export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoicesService.updateInvoice(req.tenantId!, req.params.id, req.body);
  return sendSuccess(res, invoice);
});

export const deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
  await invoicesService.deleteInvoice(req.tenantId!, req.params.id);
  return sendNoContent(res);
});

export const markAsPaid = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoicesService.markAsPaid(req.tenantId!, req.params.id, req.body);
  return sendSuccess(res, invoice);
});

export default {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markAsPaid,
};
