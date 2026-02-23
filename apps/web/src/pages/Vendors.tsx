import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, DataTable, Column, StatusBadge } from '@/components/shared';
import { mockVendors } from '@/data/mockData';
import { Vendor } from '@/types';
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
import { Badge } from '@/components/ui/badge';

const vendorCategories = [
  'Technology', 'Marketing', 'Legal', 'Finance', 'HR Services', 'Facilities', 'Consulting', 'Logistics'
] as const;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function Vendors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>(mockVendors);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    category: 'Technology' as typeof vendorCategories[number],
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
  });

  const resetForm = () => {
    setFormData({
      companyName: '',
      category: 'Technology',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      status: 'active',
    });
    setEditingVendor(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      companyName: vendor.companyName,
      category: vendor.category,
      contactName: vendor.contactName,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
      address: vendor.address,
      status: vendor.status,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingVendor) {
      setVendors(prev => prev.map(v => 
        v.id === editingVendor.id 
          ? { ...v, ...formData, updatedAt: new Date() }
          : v
      ));
      toast({
        title: 'Vendor updated',
        description: `${formData.companyName} has been updated successfully.`,
      });
    } else {
      const newVendor: Vendor = {
        id: `vnd_${Math.random().toString(36).substring(2, 11)}`,
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalSpend: 0,
        contractCount: 0,
      };
      setVendors(prev => [newVendor, ...prev]);
      toast({
        title: 'Vendor created',
        description: `${formData.companyName} has been added successfully.`,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (vendorToDelete) {
      setVendors(prev => prev.filter(v => v.id !== vendorToDelete.id));
      toast({
        title: 'Vendor deleted',
        description: `${vendorToDelete.companyName} has been removed.`,
        variant: 'destructive',
      });
      setDeleteConfirmOpen(false);
      setVendorToDelete(null);
    }
  };

  const columns: Column<Vendor>[] = [
    {
      key: 'companyName',
      header: 'Company',
      sortable: true,
      cell: (vendor) => (
        <div className="flex flex-col">
          <span className="font-medium">{vendor.companyName}</span>
          <span className="text-sm text-muted-foreground">{vendor.contactEmail}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      cell: (vendor) => (
        <Badge variant="secondary" className="font-normal">
          {vendor.category}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (vendor) => <StatusBadge status={vendor.status} />,
    },
    {
      key: 'totalSpend',
      header: 'Total Spend',
      sortable: true,
      cell: (vendor) => (
        <span className="font-medium">{formatCurrency(vendor.totalSpend)}</span>
      ),
    },
    {
      key: 'contractCount',
      header: 'Contracts',
      sortable: true,
      cell: (vendor) => (
        <span className="text-muted-foreground">{vendor.contractCount}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[50px]',
      cell: (vendor) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/vendors/${vendor.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(vendor)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => {
                setVendorToDelete(vendor);
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
        title="Vendors"
        description="Manage your vendor relationships and contacts"
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        }
      />

      <DataTable
        data={vendors}
        columns={columns}
        searchKey="companyName"
        searchPlaceholder="Search vendors..."
        onRowClick={(vendor) => navigate(`/vendors/${vendor.id}`)}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>
              {editingVendor ? 'Update the vendor information below.' : 'Fill in the details for the new vendor.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as typeof vendorCategories[number] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'active' | 'inactive' | 'pending' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                placeholder="Enter contact name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="email@company.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.companyName}>
              {editingVendor ? 'Save Changes' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {vendorToDelete?.companyName}? This action cannot be undone.
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
