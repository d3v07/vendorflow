import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Receipt, 
  Users, 
  Settings,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Vendors', url: '/vendors', icon: Building2 },
  { title: 'Contracts', url: '/contracts', icon: FileText },
  { title: 'Invoices', url: '/invoices', icon: Receipt },
];

const adminNavItems = [
  { title: 'Users', url: '/users', icon: Users },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function TopNavigation() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, hasPermission } = useUser();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'manager': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-nav border-b border-nav-border">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 flex items-center justify-center bg-accent text-accent-foreground font-display font-bold text-lg">
                V
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-display text-lg text-nav-foreground tracking-tight">VendorFlow</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-nav-foreground/60">Enterprise</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.url === '/'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-nav-foreground/70 hover:text-nav-foreground transition-colors border-b-2 border-transparent"
                  activeClassName="text-nav-accent border-nav-accent"
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </NavLink>
              ))}
              
              {hasPermission('admin') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-nav-foreground/70 hover:text-nav-foreground transition-colors">
                      <Settings className="h-4 w-4" />
                      Admin
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {adminNavItems.map((item) => (
                      <DropdownMenuItem key={item.title} asChild>
                        <NavLink to={item.url} className="flex items-center gap-2 cursor-pointer">
                          <item.icon className="h-4 w-4" />
                          {item.title}
                        </NavLink>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="h-9 w-9 text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-border/50"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 relative text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-border/50"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="font-display">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <span className="font-medium">Contract Expiring Soon</span>
                  <span className="text-sm text-muted-foreground">
                    Global Tech Solutions contract expires in 7 days
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <span className="font-medium">Invoice Overdue</span>
                  <span className="text-sm text-muted-foreground">
                    INV-2024-1234 is 5 days overdue
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <span className="font-medium">New Vendor Added</span>
                  <span className="text-sm text-muted-foreground">
                    Premier Cloud Corp was added to your vendors
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-accent font-medium">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-nav-border/50 transition-colors">
                  <Avatar className="h-8 w-8 border border-nav-border">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                      {getInitials(currentUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-nav-foreground">{currentUser.name}</span>
                    <Badge 
                      variant={getRoleBadgeVariant(currentUser.role)} 
                      className="text-[10px] h-4 capitalize bg-nav-border/50 text-nav-foreground/80 hover:bg-nav-border/50"
                    >
                      {currentUser.role}
                    </Badge>
                  </div>
                  <ChevronDown className="h-3 w-3 text-nav-foreground/50 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-display">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Preferences</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-border/50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-nav-border bg-nav animate-slide-down">
          <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === '/'}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-border/30 transition-colors"
                activeClassName="text-nav-accent bg-nav-border/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </NavLink>
            ))}
            
            {hasPermission('admin') && (
              <>
                <div className="pt-2 pb-1">
                  <span className="px-4 text-xs uppercase tracking-wider text-nav-foreground/50">Administration</span>
                </div>
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-border/30 transition-colors"
                    activeClassName="text-nav-accent bg-nav-border/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
