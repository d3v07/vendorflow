import { ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { 
  getDashboardStats, 
  getSpendByCategory, 
  getMonthlySpend, 
  getUpcomingRenewals, 
  getUnpaidInvoices 
} from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const stats = getDashboardStats();
  const spendByCategory = getSpendByCategory();
  const monthlySpend = getMonthlySpend();
  const upcomingRenewals = getUpcomingRenewals();
  const unpaidInvoices = getUnpaidInvoices();

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Calculate max for sparkline
  const maxSpend = Math.max(...monthlySpend.map(m => m.amount));

  // Helper to determine trend direction
  const getTrendDisplay = (trend: number) => {
    const isPositive = trend >= 0;
    return {
      isPositive,
      icon: isPositive ? ArrowUpRight : ArrowDownRight,
      value: Math.abs(trend),
    };
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Stats - Full Width Editorial Style */}
      <div className="border-b-2 border-foreground">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {/* Stat 1 - Vendors */}
          {(() => {
            const trend = getTrendDisplay(stats.vendorsTrend);
            return (
              <div className="border-r border-foreground/20 p-8 lg:p-12">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Vendors</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl lg:text-6xl font-display font-bold">{stats.totalVendors}</span>
                  <span className={cn(
                    "flex items-center text-sm font-medium",
                    trend.isPositive ? 'text-success' : 'text-destructive'
                  )}>
                    <trend.icon className="h-4 w-4" />
                    {trend.value}%
                  </span>
                </div>
              </div>
            );
          })()}
          
          {/* Stat 2 - Contracts */}
          {(() => {
            const trend = getTrendDisplay(stats.contractsTrend);
            return (
              <div className="border-r-0 lg:border-r border-foreground/20 p-8 lg:p-12">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Contracts</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl lg:text-6xl font-display font-bold">{stats.activeContracts}</span>
                  <span className={cn(
                    "flex items-center text-sm font-medium",
                    trend.isPositive ? 'text-success' : 'text-destructive'
                  )}>
                    <trend.icon className="h-4 w-4" />
                    {trend.value}%
                  </span>
                </div>
              </div>
            );
          })()}
          
          {/* Stat 3 - Unpaid */}
          {(() => {
            const trend = getTrendDisplay(stats.invoicesTrend);
            // For unpaid, negative is good
            const isGood = stats.invoicesTrend < 0;
            return (
              <div className="border-r border-t lg:border-t-0 border-foreground/20 p-8 lg:p-12">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Unpaid</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl lg:text-6xl font-display font-bold">{stats.unpaidInvoices}</span>
                  <span className={cn(
                    "flex items-center text-sm font-medium",
                    isGood ? 'text-success' : 'text-destructive'
                  )}>
                    <trend.icon className="h-4 w-4" />
                    {trend.value}%
                  </span>
                </div>
              </div>
            );
          })()}
          
          {/* Stat 4 - Monthly Spend */}
          {(() => {
            const trend = getTrendDisplay(stats.spendTrend);
            return (
              <div className="border-t lg:border-t-0 p-8 lg:p-12">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Monthly Spend</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl lg:text-5xl font-display font-bold">{formatCompact(stats.monthlySpend)}</span>
                  <span className={cn(
                    "flex items-center text-sm font-medium",
                    !trend.isPositive ? 'text-success' : 'text-destructive'
                  )}>
                    <trend.icon className="h-4 w-4" />
                    {trend.value}%
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Main Content - Two Column Dense Layout */}
      <div className="grid lg:grid-cols-3 divide-x divide-foreground/10">
        
        {/* Left Column - Spend Data Table */}
        <div className="lg:col-span-2">
          {/* Inline Sparkline Bar */}
          <div className="p-6 border-b border-foreground/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">6-Month Trend</h2>
              <span className="text-sm text-muted-foreground">{monthlySpend[monthlySpend.length - 1]?.month}</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {monthlySpend.map((month, i) => (
                <div 
                  key={month.month}
                  className="flex-1 bg-foreground hover:bg-primary transition-colors cursor-crosshair group relative"
                  style={{ height: `${(month.amount / maxSpend) * 100}%` }}
                  title={`${month.month}: ${formatCurrency(month.amount)}`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                    {formatCompact(month.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Spend Table - No Cards */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Spend by Category</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left py-3 text-xs uppercase tracking-[0.15em] font-medium">Category</th>
                  <th className="text-right py-3 text-xs uppercase tracking-[0.15em] font-medium">Amount</th>
                  <th className="text-right py-3 text-xs uppercase tracking-[0.15em] font-medium w-32">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {spendByCategory.map((category) => {
                  const total = spendByCategory.reduce((sum, c) => sum + c.amount, 0);
                  const percentage = (category.amount / total) * 100;
                  return (
                    <tr key={category.category} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-4">
                        <span className="font-medium">{category.category}</span>
                      </td>
                      <td className="py-4 text-right font-display font-semibold tabular-nums">
                        {formatCurrency(category.amount)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-foreground/10 overflow-hidden">
                            <div 
                              className="h-full bg-foreground transition-all" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Alerts List */}
        <div className="lg:col-span-1">
          {/* Renewals */}
          <div className="border-b border-foreground/10">
            <button 
              onClick={() => navigate('/contracts')}
              className="w-full flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors group"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Renewals Due</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <div className="divide-y divide-foreground/5">
              {upcomingRenewals.slice(0, 5).map((contract) => {
                const daysLeft = getDaysUntil(contract.endDate);
                const isUrgent = daysLeft <= 14;
                return (
                  <div 
                    key={contract.id} 
                    className={cn(
                      "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-foreground/[0.02] transition-colors",
                      isUrgent && "bg-destructive/5"
                    )}
                    onClick={() => navigate('/contracts')}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{contract.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{contract.vendorName}</div>
                    </div>
                    <div className={cn(
                      "text-sm font-display font-bold tabular-nums ml-3",
                      isUrgent ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {daysLeft}d
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unpaid Invoices */}
          <div>
            <button 
              onClick={() => navigate('/invoices')}
              className="w-full flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors group"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unpaid Invoices</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <div className="divide-y divide-foreground/5">
              {unpaidInvoices.slice(0, 5).map((invoice) => {
                const isOverdue = invoice.status === 'overdue';
                return (
                  <div 
                    key={invoice.id} 
                    className={cn(
                      "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-foreground/[0.02] transition-colors",
                      isOverdue && "bg-destructive/5"
                    )}
                    onClick={() => navigate('/invoices')}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{invoice.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground truncate">{invoice.vendorName}</div>
                    </div>
                    <div className={cn(
                      "text-sm font-display font-bold tabular-nums ml-3",
                      isOverdue ? "text-destructive" : ""
                    )}>
                      {formatCompact(invoice.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div className="border-t-2 border-foreground p-4 mt-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Avg Contract</div>
                <div className="text-lg font-display font-bold">$24.5K</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">YTD Spend</div>
                <div className="text-lg font-display font-bold">$847K</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
