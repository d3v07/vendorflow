import mongoose from 'mongoose';
import { Tenant } from '../models';
import { NotFoundError } from '../utils/errors';

interface TenantSettings {
  currency: string;
  timezone: string;
  dateFormat: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
}

interface UpdateSettingsInput {
  name?: string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  invoicePrefix?: string;
}

export class SettingsService {
  /**
   * Get tenant settings
   */
  async getSettings(tenantId: string) {
    const tenant = await Tenant.findById(tenantId).lean();

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    return {
      id: tenant._id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      settings: tenant.settings,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Update tenant settings
   */
  async updateSettings(tenantId: string, data: UpdateSettingsInput) {
    const updateData: Record<string, any> = {};

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.currency) {
      updateData['settings.currency'] = data.currency;
    }

    if (data.timezone) {
      updateData['settings.timezone'] = data.timezone;
    }

    if (data.dateFormat) {
      updateData['settings.dateFormat'] = data.dateFormat;
    }

    if (data.invoicePrefix) {
      updateData['settings.invoicePrefix'] = data.invoicePrefix;
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    return {
      id: tenant._id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      settings: tenant.settings,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}

export const settingsService = new SettingsService();
export default settingsService;
