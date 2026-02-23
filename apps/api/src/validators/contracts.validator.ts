import { z } from 'zod';
import { paginationSchema, objectIdSchema } from './common.validator';
import { CONTRACT_STATUSES } from '../types';

const contractStatusEnum = z.enum(CONTRACT_STATUSES as [string, ...string[]]);

// SECURITY: Using .strict() to reject unexpected fields (prevents field injection)
export const createContractSchema = z.object({
  body: z.object({
    vendorId: objectIdSchema,
    title: z.string().min(2).max(200).trim(),
    description: z.string().max(2000).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    value: z.number().min(0),
    autoRenew: z.boolean().optional().default(false),
    status: contractStatusEnum.optional().default('draft'),
    documents: z.array(z.string().url()).optional(),
  }).strict().refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),
});

export const updateContractSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }).strict(),
  body: z.object({
    vendorId: objectIdSchema.optional(),
    title: z.string().min(2).max(200).trim().optional(),
    description: z.string().max(2000).optional().nullable(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    value: z.number().min(0).optional(),
    autoRenew: z.boolean().optional(),
    status: contractStatusEnum.optional(),
    documents: z.array(z.string().url()).optional(),
  }).strict(),
});

export const getContractsQuerySchema = z.object({
  query: paginationSchema.extend({
    status: contractStatusEnum.optional(),
    vendorId: objectIdSchema.optional(),
    search: z.string().max(200).optional(),
    startDateFrom: z.coerce.date().optional(),
    startDateTo: z.coerce.date().optional(),
    endDateFrom: z.coerce.date().optional(),
    endDateTo: z.coerce.date().optional(),
  }),
});

export const getContractByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export type CreateContractInput = z.infer<typeof createContractSchema>['body'];
export type UpdateContractInput = z.infer<typeof updateContractSchema>['body'];
export type GetContractsQuery = z.infer<typeof getContractsQuerySchema>['query'];
