import { PaginationMeta, PaginationQuery } from '../types';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  skip: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const parsePaginationQuery = (query: PaginationQuery): PaginationOptions => {
  const page = Math.max(1, parseInt(String(query.page || DEFAULT_PAGE), 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(query.limit || DEFAULT_LIMIT), 10)));
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const skip = (page - 1) * limit;

  return { page, limit, sortBy, sortOrder, skip };
};

export const createPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const buildSortObject = (
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Record<string, 1 | -1> => {
  return { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
};
