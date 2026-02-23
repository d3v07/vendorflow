import { useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, DataTable, Column, StatusBadge } from '@/components/shared';
import { mockContracts, mockVendors } from '@/data/mockData';
import { Contract } from '@/types';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

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

export default function Contracts() {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  const [formData, setFormData] = useState({
    vendorId: '',
    title: '',
    description: '',
    startDate: formatDateForInput(new Date()),
    endDate: formatDateForInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    value: '',
    autoRenew: false,
  });

  const resetForm = () => {
    setFormData({
      vendorId: '',
      title: '',
      description: '',
      startDate: formatDateForInput(new Date()),
      endDate: formatDateForInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
      value: '',
      autoRenew: false,
    });
    setEditingContract(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      vendorId: contract.vendorId,
      title: contract.title,
      description: contract.description,
      startDate: formatDateForInput(contract.startDate),
      endDate: formatDateForInput(contract.endDate),
      value: contract.value.toString(),
      autoRenew: contract.autoRenew,
    });
    setIsDialogOpen(true);
  };

  const getContractStatus = (endDate: Date): Contract['status'] => {
    const today = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd < 0) return 'expired';
    if (daysUntilEnd <= 30) return 'expiring_soon';
    return 'active';
  };

  const handleSave = () => {
    const vendor = mockVendors.find(v => v.id === formData.vendorId);
    const endDate = new Date(formData.endDate);
    
    if (editingContract) {
      setContracts(prev => prev.map(c => 
        c.id === editingContract.id 
          ? { 
              ...c, 
              ...formData,
              vendorName: vendor?.companyName || c.vendorName,
              startDate: new Date(formData.startDate),
              endDate,
              value: parseFloat(formData.value) || 0,
              status: getContractStatus(endDate),
              updatedAt: new Date() 
            }
          : c
      ));
      toast({
        title: 'Contract updated',
        description: `${formData.title} has been updated successfully.`,
      });
    } else {
      const newContract: Contract = {
        id: `cnt_${Math.random().toString(36).substring(2, 11)}`,
        vendorId: formData.vendorId,
        vendorName: vendor?.companyName || 'Unknown Vendor',
        title: formData.title,
        description: formData.description,
        startDate: new Date(formData.startDate),
        endDate,
        value: parseFloat(formData.value) || 0,
        autoRenew: formData.autoRenew,
        status: getContractStatus(endDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setContracts(prev => [newContract, ...prev]);
      toast({
        title: 'Contract created',
        description: `${formData.title} has been added successfully.`,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (contractToDelete) {
      setContracts(prev => prev.filter(c => c.id !== contractToDelete.id));
      toast({
        title: 'Contract deleted',
        description: `${contractToDelete.title} has been removed.`,
        variant: 'destructive',
      });
      setDeleteConfirmOpen(false);
      setContractToDelete(null);
    }
  };

  const columns: Column<Contract>[] = [
    {
      key: 'title',
      header: 'Contract',
      sortable: true,
      cell: (contract) => (
        <div className="flex flex-col">
          <span className="font-medium">{contract.title}</span>
          <span className="text-sm text-muted-foreground">{contract.vendorName}</span>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      cell: (contract) => (
        <span className="font-semibold">{formatCurrency(contract.value)}</span>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      cell: (contract) => formatDate(contract.startDate),
    },
    {
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      cell: (contract) => (
        <div className="flex items-center gap-2">
          {formatDate(contract.endDate)}
          {contract.autoRenew && (
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (contract) => <StatusBadge status={contract.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[50px]',
      cell: (contract) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setViewingContract(contract);
              setViewDialogOpen(true);
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(contract)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => {
                setContractToDelete(contract);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Contracts"
        description="Manage vendor contracts and renewal schedules"
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contract
          </Button>
        }
      />

      <DataTable
        data={contracts}
        columns={columns}
        searchKey="title"
        searchPlaceholder="Search contracts..."
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingContract ? 'Edit Contract' : 'Add New Contract'}</DialogTitle>
            <DialogDescription>
              {editingContract ? 'Update the contract details below.' : 'Fill in the details for the new contract.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select
                value={formData.vendorId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: value }))}
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
            <div className="grid gap-2">
              <Label htmlFor="title">Contract Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Annual Service Agreement"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Contract details and terms..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value">Contract Value ($)</Label>
              <Input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="50000"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="autoRenew" className="font-medium">Auto-Renew</Label>
                <p className="text-sm text-muted-foreground">Automatically renew this contract</p>
              </div>
              <Switch
                id="autoRenew"
                checked={formData.autoRenew}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoRenew: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.title || !formData.vendorId}>
              {editingContract ? 'Save Changes' : 'Add Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
          </DialogHeader>
          {viewingContract && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{viewingContract.title}</h3>
                <StatusBadge status={viewingContract.status} />
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">{viewingContract.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-medium">{formatCurrency(viewingContract.value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span>{formatDate(viewingContract.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span>{formatDate(viewingContract.endDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-Renew</span>
                  <Badge variant={viewingContract.autoRenew ? 'default' : 'secondary'}>
                    {viewingContract.autoRenew ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              {viewingContract.description && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{viewingContract.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
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
            <DialogTitle>Delete Contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{contractToDelete?.title}"? This action cannot be undone.
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
