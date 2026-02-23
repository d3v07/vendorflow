import { useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, DataTable, Column, StatusBadge } from '@/components/shared';
import { mockInvoices, mockVendors, mockContracts } from '@/data/mockData';
import { Invoice } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateForInput = (date: Date) => {
  return new Date(date).toISOString().split('T')[0];
};

export default function Invoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    vendorId: '',
    contractId: '',
    amount: '',
    dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    description: '',
  });

  const resetForm = () => {
    setFormData({
      vendorId: '',
      contractId: '',
      amount: '',
      dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      description: '',
    });
    setEditingInvoice(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      vendorId: invoice.vendorId,
      contractId: invoice.contractId || '',
      amount: invoice.amount.toString(),
      dueDate: formatDateForInput(invoice.dueDate),
      description: invoice.description,
    });
    setIsDialogOpen(true);
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `INV-${year}-${num}`;
  };

  const getInvoiceStatus = (dueDate: Date, currentStatus: Invoice['status']): Invoice['status'] => {
    if (currentStatus === 'paid') return 'paid';
    const today = new Date();
    if (dueDate < today) return 'overdue';
    return 'pending';
  };

  const handleSave = () => {
    const vendor = mockVendors.find(v => v.id === formData.vendorId);
    const dueDate = new Date(formData.dueDate);
    
    if (editingInvoice) {
      setInvoices(prev => prev.map(i => 
        i.id === editingInvoice.id 
          ? { 
              ...i, 
              vendorId: formData.vendorId,
              vendorName: vendor?.companyName || i.vendorName,
              contractId: formData.contractId || undefined,
              amount: parseFloat(formData.amount) || 0,
              dueDate,
              description: formData.description,
              status: getInvoiceStatus(dueDate, i.status),
              updatedAt: new Date() 
            }
          : i
      ));
      toast({
        title: 'Invoice updated',
        description: `${editingInvoice.invoiceNumber} has been updated successfully.`,
      });
    } else {
      const newInvoice: Invoice = {
        id: `inv_${Math.random().toString(36).substring(2, 11)}`,
        invoiceNumber: generateInvoiceNumber(),
        vendorId: formData.vendorId,
        vendorName: vendor?.companyName || 'Unknown Vendor',
        contractId: formData.contractId || undefined,
        amount: parseFloat(formData.amount) || 0,
        dueDate,
        status: 'pending',
        description: formData.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setInvoices(prev => [newInvoice, ...prev]);
      toast({
        title: 'Invoice created',
        description: `${newInvoice.invoiceNumber} has been added successfully.`,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    setInvoices(prev => prev.map(i => 
      i.id === invoice.id 
        ? { ...i, status: 'paid' as const, paidDate: new Date(), updatedAt: new Date() }
        : i
    ));
    toast({
      title: 'Invoice marked as paid',
      description: `${invoice.invoiceNumber} has been marked as paid.`,
    });
  };

  const handleDelete = () => {
    if (invoiceToDelete) {
      setInvoices(prev => prev.filter(i => i.id !== invoiceToDelete.id));
      toast({
        title: 'Invoice deleted',
        description: `${invoiceToDelete.invoiceNumber} has been removed.`,
        variant: 'destructive',
      });
      setDeleteConfirmOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const filteredInvoices = statusFilter === 'all' 
    ? invoices 
    : invoices.filter(i => i.status === statusFilter);

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      cell: (invoice) => (
        <span className="font-medium font-mono">{invoice.invoiceNumber}</span>
      ),
    },
    {
      key: 'vendorName',
      header: 'Vendor',
      sortable: true,
      cell: (invoice) => invoice.vendorName,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (invoice) => (
        <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      cell: (invoice) => formatDate(invoice.dueDate),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[50px]',
      cell: (invoice) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setViewingInvoice(invoice);
              setViewDialogOpen(true);
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {invoice.status !== 'paid' && (
              <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => openEditDialog(invoice)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => {
                setInvoiceToDelete(invoice);
                setDeleteConfirmOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const statusCounts = {
    all: invoices.length,
    pending: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    paid: invoices.filter(i => i.status === 'paid').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Invoices"
        description="Track and manage vendor invoices and payments"
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        }
      />

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({statusCounts.overdue})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({statusCounts.paid})</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        data={filteredInvoices}
        columns={columns}
        searchKey="invoiceNumber"
        searchPlaceholder="Search invoices..."
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            <DialogDescription>
              {editingInvoice ? 'Update the invoice details below.' : 'Fill in the details for the new invoice.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select
                value={formData.vendorId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: value, contractId: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {mockVendors.filter(v => v.status === 'active').map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.vendorId && (
              <div className="grid gap-2">
                <Label htmlFor="contract">Contract (Optional)</Label>
                <Select
                  value={formData.contractId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contractId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to a contract" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No contract</SelectItem>
                    {mockContracts
                      .filter(c => c.vendorId === formData.vendorId && c.status === 'active')
                      .map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Invoice details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.vendorId || !formData.amount}>
              {editingInvoice ? 'Save Changes' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-mono font-semibold">{viewingInvoice.invoiceNumber}</h3>
                <StatusBadge status={viewingInvoice.status} />
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">{viewingInvoice.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-lg">{formatCurrency(viewingInvoice.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span>{formatDate(viewingInvoice.dueDate)}</span>
                </div>
                {viewingInvoice.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Date</span>
                    <span>{formatDate(viewingInvoice.paidDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(viewingInvoice.createdAt)}</span>
                </div>
              </div>
              {viewingInvoice.description && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{viewingInvoice.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {viewingInvoice && viewingInvoice.status !== 'paid' && (
              <Button onClick={() => {
                handleMarkAsPaid(viewingInvoice);
                setViewDialogOpen(false);
              }}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoiceNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
