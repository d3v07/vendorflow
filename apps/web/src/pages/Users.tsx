import { useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Mail, Shield, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, DataTable, Column } from '@/components/shared';
import { mockUsers } from '@/data/mockData';
import { User, UserRole } from '@/types';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';

const formatDate = (date: Date | undefined) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getRoleBadgeVariant = (role: UserRole): 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'admin': return 'default';
    case 'manager': return 'secondary';
    default: return 'outline';
  }
};

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'admin': return Shield;
    case 'manager': return UserCheck;
    default: return null;
  }
};

export default function Users() {
  const { toast } = useToast();
  const { hasPermission } = useUser();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'viewer' as UserRole,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'viewer',
    });
    setEditingUser(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingUser) {
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...formData }
          : u
      ));
      toast({
        title: 'User updated',
        description: `${formData.name} has been updated successfully.`,
      });
    } else {
      const newUser: User = {
        id: `usr_${Math.random().toString(36).substring(2, 11)}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        createdAt: new Date(),
        isActive: true,
      };
      setUsers(prev => [newUser, ...prev]);
      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${formData.email}.`,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleToggleActive = (user: User) => {
    setUsers(prev => prev.map(u => 
      u.id === user.id 
        ? { ...u, isActive: !u.isActive }
        : u
    ));
    toast({
      title: user.isActive ? 'User deactivated' : 'User activated',
      description: `${user.name} has been ${user.isActive ? 'deactivated' : 'activated'}.`,
    });
  };

  const handleDelete = () => {
    if (userToDelete) {
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      toast({
        title: 'User deleted',
        description: `${userToDelete.name} has been removed.`,
        variant: 'destructive',
      });
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className={user.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className={`font-medium ${!user.isActive ? 'text-muted-foreground' : ''}`}>
              {user.name}
            </span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      cell: (user) => {
        const RoleIcon = getRoleIcon(user.role);
        return (
          <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1 capitalize">
            {RoleIcon && <RoleIcon className="h-3 w-3" />}
            {user.role}
          </Badge>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      cell: (user) => (
        <Badge variant={user.isActive ? 'default' : 'secondary'} className="gap-1">
          {user.isActive ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Active
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
              Inactive
            </>
          )}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      cell: (user) => (
        <span className="text-muted-foreground">{formatDate(user.lastLogin)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      cell: (user) => formatDate(user.createdAt),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[50px]',
      cell: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(user)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleActive(user)}>
              {user.isActive ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              Resend Invite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => {
                setUserToDelete(user);
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

  if (!hasPermission('admin')) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You need admin privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Users"
        description="Manage team members and their access levels"
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        }
      />

      <DataTable
        data={users}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search users..."
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Invite New User'}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Update the user information below.' 
                : 'Send an invitation to a new team member.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@company.com"
                disabled={!!editingUser}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin - Full access
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Manager - Can edit
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      Viewer - Read only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.email}>
              {editingUser ? 'Save Changes' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
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
