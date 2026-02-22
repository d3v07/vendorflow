import mongoose from 'mongoose';
import { Contract, Vendor } from '../models';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CreateContractInput, UpdateContractInput, GetContractsQuery } from '../validators/contracts.validator';
import { parsePaginationQuery, createPaginationMeta, buildSortObject } from '../utils/pagination';
import { PaginationMeta, ContractStatus } from '../types';

interface ContractListResult {
  contracts: any[];
  meta: PaginationMeta;
}

export class ContractsService {
  /**
   * Compute contract status from dates
   */
  private computeStatus(startDate: Date, endDate: Date, currentStatus?: ContractStatus): ContractStatus {
    if (currentStatus === 'draft') {
      return 'draft';
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (endDate < now) {
      return 'expired';
    } else if (endDate <= thirtyDaysFromNow) {
      return 'expiring_soon';
    }
    return 'active';
  }

  /**
   * Get all contracts for a tenant with pagination and filtering
   */
  async getContracts(tenantId: string, query: GetContractsQuery): Promise<ContractListResult> {
    const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(query);

    // Build filter
    const filter: Record<string, any> = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.vendorId) {
      filter.vendorId = new mongoose.Types.ObjectId(query.vendorId);
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.startDateFrom || query.startDateTo) {
      filter.startDate = {};
      if (query.startDateFrom) filter.startDate.$gte = new Date(query.startDateFrom);
      if (query.startDateTo) filter.startDate.$lte = new Date(query.startDateTo);
    }

    if (query.endDateFrom || query.endDateTo) {
      filter.endDate = {};
      if (query.endDateFrom) filter.endDate.$gte = new Date(query.endDateFrom);
      if (query.endDateTo) filter.endDate.$lte = new Date(query.endDateTo);
    }

    // Execute query with vendor lookup
    const [contracts, total] = await Promise.all([
      Contract.aggregate([
        { $match: filter },
        { $sort: buildSortObject(sortBy, sortOrder) },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      ]),
      Contract.countDocuments(filter),
    ]);

    return {
      contracts: contracts.map((c) => ({
        id: c._id.toString(),
        vendorId: c.vendorId.toString(),
        vendorName: c.vendor?.companyName || 'Unknown',
        title: c.title,
        description: c.description,
        startDate: c.startDate,
        endDate: c.endDate,
        value: c.value,
        autoRenew: c.autoRenew,
        status: c.status,
        documents: c.documents,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single contract by ID
   */
  async getContractById(tenantId: string, contractId: string) {
    const [contract] = await Contract.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(contractId),
          tenantId: new mongoose.Types.ObjectId(tenantId),
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    ]);

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    return {
      id: contract._id.toString(),
      vendorId: contract.vendorId.toString(),
      vendorName: contract.vendor?.companyName || 'Unknown',
      title: contract.title,
      description: contract.description,
      startDate: contract.startDate,
      endDate: contract.endDate,
      value: contract.value,
      autoRenew: contract.autoRenew,
      status: contract.status,
      documents: contract.documents,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  /**
   * Create a new contract
   */
  async createContract(tenantId: string, data: CreateContractInput) {
    // Verify vendor exists
    const vendor = await Vendor.findOne({
      _id: data.vendorId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!vendor) {
      throw new BadRequestError('Invalid vendor ID');
    }

    // Compute status if not draft
    const status = this.computeStatus(
      new Date(data.startDate),
      new Date(data.endDate),
      data.status as ContractStatus | undefined
    );

    const contract = await Contract.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      vendorId: new mongoose.Types.ObjectId(data.vendorId),
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      value: data.value,
      autoRenew: data.autoRenew,
      status,
      documents: data.documents,
    });

    return {
      id: contract._id.toString(),
      vendorId: contract.vendorId.toString(),
      vendorName: vendor.companyName,
      title: contract.title,
      description: contract.description,
      startDate: contract.startDate,
      endDate: contract.endDate,
      value: contract.value,
      autoRenew: contract.autoRenew,
      status: contract.status,
      documents: contract.documents,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  /**
   * Update a contract
   */
  async updateContract(tenantId: string, contractId: string, data: UpdateContractInput) {
    // If vendorId is being updated, verify it exists
    if (data.vendorId) {
      const vendor = await Vendor.findOne({
        _id: data.vendorId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      });

      if (!vendor) {
        throw new BadRequestError('Invalid vendor ID');
      }
    }

    // Get current contract to check dates
    const currentContract = await Contract.findOne({
      _id: contractId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!currentContract) {
      throw new NotFoundError('Contract');
    }

    // Compute new status if dates are changing
    const startDate = data.startDate ? new Date(data.startDate) : currentContract.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : currentContract.endDate;
    const newStatus = (data.status as ContractStatus | undefined) || this.computeStatus(startDate, endDate, data.status as ContractStatus | undefined);

    // Validate dates
    if (endDate <= startDate) {
      throw new BadRequestError('End date must be after start date');
    }

    const contract = await Contract.findOneAndUpdate(
      {
        _id: contractId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
      {
        $set: {
          ...data,
          status: newStatus,
        },
      },
      { new: true, runValidators: true }
    );

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Get updated contract with vendor name
    return this.getContractById(tenantId, contractId);
  }

  /**
   * Delete a contract
   */
  async deleteContract(tenantId: string, contractId: string): Promise<void> {
    const result = await Contract.deleteOne({
      _id: contractId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Contract');
    }
  }

  /**
   * Update contract statuses based on dates (can be run periodically)
   */
  async updateContractStatuses(tenantId: string): Promise<number> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Update expired contracts
    const expiredResult = await Contract.updateMany(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        status: { $ne: 'draft' },
        endDate: { $lt: now },
      },
      { $set: { status: 'expired' } }
    );

    // Update expiring_soon contracts
    const expiringSoonResult = await Contract.updateMany(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        status: { $nin: ['draft', 'expired'] },
        endDate: { $gte: now, $lte: thirtyDaysFromNow },
      },
      { $set: { status: 'expiring_soon' } }
    );

    // Update active contracts
    const activeResult = await Contract.updateMany(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        status: { $nin: ['draft', 'expired', 'expiring_soon'] },
        endDate: { $gt: thirtyDaysFromNow },
      },
      { $set: { status: 'active' } }
    );

    return expiredResult.modifiedCount + expiringSoonResult.modifiedCount + activeResult.modifiedCount;
  }
}

export const contractsService = new ContractsService();
export default contractsService;
