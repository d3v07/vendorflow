import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileText, Receipt, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { mockVendors, mockContracts, mockInvoices } from '@/data/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Contract, Invoice } from '@/types';

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

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const vendor = mockVendors.find(v => v.id === id);
  const vendorContracts = mockContracts.filter(c => c.vendorId === id);
  const vendorInvoices = mockInvoices.filter(i => i.vendorId === id);

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold mb-2">Vendor not found</h2>
        <p className="text-muted-foreground mb-4">The vendor you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/vendors')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Vendors
        </Button>
      </div>
    );
  }

  const contractColumns: Column<Contract>[] = [
    {
      key: 'title',
      header: 'Contract',
      sortable: true,
      cell: (contract) => <span className="font-medium">{contract.title}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      cell: (contract) => formatCurrency(contract.value),
    },
    {
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      cell: (contract) => formatDate(contract.endDate),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (contract) => <StatusBadge status={contract.status} />,
    },
  ];

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      cell: (invoice) => <span className="font-medium">{invoice.invoiceNumber}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (invoice) => formatCurrency(invoice.amount),
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
      cell: (invoice) => <StatusBadge status={invoice.status} />,
    },
  ];

  const totalContractValue = vendorContracts.reduce((sum, c) => sum + c.value, 0);
  const totalInvoiced = vendorInvoices.reduce((sum, i) => sum + i.amount, 0);
  const paidInvoices = vendorInvoices.filter(i => i.status === 'paid');
  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vendors')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{vendor.companyName}</h1>
            <StatusBadge status={vendor.status} />
          </div>
          <p className="text-muted-foreground">
            <Badge variant="secondary" className="mr-2">{vendor.category}</Badge>
            Added {formatDate(vendor.createdAt)}
          </p>
        </div>
        <Button>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Vendor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contracts</p>
                <p className="text-xl font-bold">{vendorContracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Building2 className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contract Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalContractValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Receipt className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invoiced</p>
                <p className="text-xl font-bold">{formatCurrency(totalInvoiced)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Receipt className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Name</p>
                <p className="font-medium">{vendor.contactName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{vendor.contactEmail}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{vendor.contactPhone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{vendor.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Contracts and Invoices */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="contracts" className="w-full">
            <CardHeader className="pb-0">
              <TabsList>
                <TabsTrigger value="contracts">
                  Contracts ({vendorContracts.length})
                </TabsTrigger>
                <TabsTrigger value="invoices">
                  Invoices ({vendorInvoices.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="contracts" className="mt-0">
                <DataTable
                  data={vendorContracts}
                  columns={contractColumns}
                  pageSize={5}
                />
              </TabsContent>
              <TabsContent value="invoices" className="mt-0">
                <DataTable
                  data={vendorInvoices}
                  columns={invoiceColumns}
                  pageSize={5}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
