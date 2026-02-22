import { Router } from 'express';
import * as vendorsController from '../controllers/vendors.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireManager, requireAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { invalidateVendorCache } from '../middleware/cache.middleware';
import { checkFeatureLimit } from '../middleware/featureGate.middleware';
import {
  createVendorSchema,
  updateVendorSchema,
  getVendorsQuerySchema,
  getVendorByIdSchema,
} from '../validators/vendors.validator';

const router = Router();

// All vendor routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: List all vendors
 *     description: Get paginated list of vendors with optional filtering and sorting
 *     tags: [Vendors]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in company name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of vendors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vendor'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', validate(getVendorsQuerySchema), vendorsController.getVendors);

/**
 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     description: Retrieve a single vendor by its ID
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *       404:
 *         description: Vendor not found
 */
router.get('/:id', validate(getVendorByIdSchema), vendorsController.getVendorById);

/**
 * @swagger
 * /api/vendors/{id}/contracts:
 *   get:
 *     summary: Get vendor's contracts
 *     description: Retrieve all contracts for a specific vendor
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: List of vendor's contracts
 */
router.get('/:id/contracts', validate(getVendorByIdSchema), vendorsController.getVendorContracts);

/**
 * @swagger
 * /api/vendors/{id}/invoices:
 *   get:
 *     summary: Get vendor's invoices
 *     description: Retrieve all invoices for a specific vendor
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: List of vendor's invoices
 */
router.get('/:id/invoices', validate(getVendorByIdSchema), vendorsController.getVendorInvoices);

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     summary: Create a new vendor
 *     description: Create a new vendor (requires manager role or higher)
 *     tags: [Vendors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyName, category, contactName, contactEmail]
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: Acme Corp
 *               category:
 *                 type: string
 *                 enum: [Technology, Marketing, Legal, Finance, HR Services, Facilities, Consulting, Logistics]
 *               contactName:
 *                 type: string
 *                 example: John Doe
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: john@acme.com
 *               contactPhone:
 *                 type: string
 *                 example: +1-555-123-4567
 *               address:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending]
 *                 default: pending
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *       403:
 *         description: Vendor limit exceeded or insufficient permissions
 */
router.post('/', requireManager, checkFeatureLimit('vendors'), validate(createVendorSchema), invalidateVendorCache, vendorsController.createVendor);

/**
 * @swagger
 * /api/vendors/{id}:
 *   patch:
 *     summary: Update a vendor
 *     description: Update an existing vendor (requires manager role or higher)
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               category:
 *                 type: string
 *               contactName:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               address:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor updated
 *       404:
 *         description: Vendor not found
 */
router.patch('/:id', requireManager, validate(updateVendorSchema), invalidateVendorCache, vendorsController.updateVendor);

/**
 * @swagger
 * /api/vendors/{id}:
 *   delete:
 *     summary: Delete a vendor
 *     description: Delete a vendor (requires admin role)
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor deleted
 *       404:
 *         description: Vendor not found
 */
router.delete('/:id', requireAdmin, validate(getVendorByIdSchema), invalidateVendorCache, vendorsController.deleteVendor);

export default router;
