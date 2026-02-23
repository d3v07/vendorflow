import { z } from 'zod';
import { paginationSchema, objectIdSchema } from './common.validator';
import { VENDOR_CATEGORIES, VENDOR_STATUSES } from '../types';

const vendorCategoryEnum = z.enum(VENDOR_CATEGORIES as [string, ...string[]]);
const vendorStatusEnum = z.enum(VENDOR_STATUSES as [string, ...string[]]);

// SECURITY: Using .strict() to reject unexpected fields (prevents field injection)
export const createVendorSchema = z.object({
  body: z.object({
    companyName: z.string().min(2).max(200).trim(),
    category: vendorCategoryEnum,
    contactName: z.string().min(2).max(100).trim(),
    contactEmail: z.string().email().max(255).toLowerCase().trim(),
    contactPhone: z.string().min(5).max(30).trim(),
    address: z.string().min(5).max(500).trim(),
    status: vendorStatusEnum.optional().default('pending'),
    notes: z.string().max(2000).optional(),
  }).strict(),
});

export const updateVendorSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }).strict(),
  body: z.object({
    companyName: z.string().min(2).max(200).trim().optional(),
    category: vendorCategoryEnum.optional(),
    contactName: z.string().min(2).max(100).trim().optional(),
    contactEmail: z.string().email().max(255).toLowerCase().trim().optional(),
    contactPhone: z.string().min(5).max(30).trim().optional(),
    address: z.string().min(5).max(500).trim().optional(),
    status: vendorStatusEnum.optional(),
    notes: z.string().max(2000).optional().nullable(),
  }).strict(),
});

export const getVendorsQuerySchema = z.object({
  query: paginationSchema.extend({
    status: vendorStatusEnum.optional(),
    category: vendorCategoryEnum.optional(),
    search: z.string().max(200).optional(),
  }),
});

export const getVendorByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>['body'];
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>['body'];
export type GetVendorsQuery = z.infer<typeof getVendorsQuerySchema>['query'];
