import { z } from 'zod';
import { paginationSchema, objectIdSchema } from './common.validator';
import { INVOICE_STATUSES } from '../types';

const invoiceStatusEnum = z.enum(INVOICE_STATUSES as [string, ...string[]]);

// SECURITY: Using .strict() to reject unexpected fields (prevents field injection)
export const createInvoiceSchema = z.object({
  body: z.object({
    vendorId: objectIdSchema,
    contractId: objectIdSchema.optional(),
    amount: z.number().min(0),
    dueDate: z.coerce.date(),
    status: invoiceStatusEnum.optional().default('draft'),
    description: z.string().max(1000).optional(),
    idempotencyKey: z.string().max(100).optional(),
  }).strict(),
});

export const updateInvoiceSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }).strict(),
  body: z.object({
    vendorId: objectIdSchema.optional(),
    contractId: objectIdSchema.optional().nullable(),
    amount: z.number().min(0).optional(),
    dueDate: z.coerce.date().optional(),
    status: invoiceStatusEnum.optional(),
    description: z.string().max(1000).optional().nullable(),
  }).strict(),
});

export const getInvoicesQuerySchema = z.object({
  query: paginationSchema.extend({
    status: invoiceStatusEnum.optional(),
    vendorId: objectIdSchema.optional(),
    contractId: objectIdSchema.optional(),
    search: z.string().max(200).optional(),
    dueDateFrom: z.coerce.date().optional(),
    dueDateTo: z.coerce.date().optional(),
    paidDateFrom: z.coerce.date().optional(),
    paidDateTo: z.coerce.date().optional(),
    minAmount: z.coerce.number().min(0).optional(),
    maxAmount: z.coerce.number().min(0).optional(),
  }),
});

export const getInvoiceByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const markAsPaidSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }).strict(),
  body: z.object({
    paidDate: z.coerce.date().optional(),
  }).strict(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>['body'];
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>['body'];
export type GetInvoicesQuery = z.infer<typeof getInvoicesQuerySchema>['query'];
export type MarkAsPaidInput = z.infer<typeof markAsPaidSchema>['body'];
