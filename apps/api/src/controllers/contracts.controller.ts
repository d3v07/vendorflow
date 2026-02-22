import { Request, Response } from 'express';
import { contractsService } from '../services/contracts.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getContracts = asyncHandler(async (req: Request, res: Response) => {
  const result = await contractsService.getContracts(req.tenantId!, req.query as any);
  return sendSuccess(res, result.contracts, 200, result.meta);
});

export const getContractById = asyncHandler(async (req: Request, res: Response) => {
  const contract = await contractsService.getContractById(req.tenantId!, req.params.id);
  return sendSuccess(res, contract);
});

export const createContract = asyncHandler(async (req: Request, res: Response) => {
  const contract = await contractsService.createContract(req.tenantId!, req.body);
  return sendCreated(res, contract);
});

export const updateContract = asyncHandler(async (req: Request, res: Response) => {
  const contract = await contractsService.updateContract(req.tenantId!, req.params.id, req.body);
  return sendSuccess(res, contract);
});

export const deleteContract = asyncHandler(async (req: Request, res: Response) => {
  await contractsService.deleteContract(req.tenantId!, req.params.id);
  return sendNoContent(res);
});

export default {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
};
