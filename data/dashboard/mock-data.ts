export type DashboardNavItem = {
  label: string;
  href: string;
  key:
    | 'dashboard'
    | 'agent-builder'
    | 'assets'
    | 'staking'
    | 'orders'
    | 'data-api';
};

export type WatchlistItem = {
  symbol: string;
  name: string;
  price: number;
  change24hPct: number;
};

export type StatCard = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  points: number[];
};

export type TokenRow = {
  name: string;
  symbol: string;
  price: number;
  change1hPct: number;
  change24hPct: number;
  change7dPct: number;
  volume: number;
  sparkline: number[];
};

export const dashboardNavItems: DashboardNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'agent-builder', label: 'Agent Builder', href: '/agent-builder' },
  { key: 'assets', label: 'Assets', href: '/dashboard#assets' },
  { key: 'staking', label: 'Staking', href: '/dashboard#staking' },
  { key: 'orders', label: 'Orders', href: '/dashboard#orders' },
  { key: 'data-api', label: 'Data API', href: '/dashboard#data-api' },
];

export const watchlist: WatchlistItem[] = [
  { symbol: 'RIO', name: 'Ripple', price: 1.248, change24hPct: 2.34 },
  { symbol: 'THC', name: 'Thorchain', price: 3.912, change24hPct: -1.08 },
  { symbol: 'TRN', name: 'Tron', price: 0.145, change24hPct: 0.62 },
  { symbol: 'LUM', name: 'Lumen', price: 0.212, change24hPct: -0.44 },
  { symbol: 'ARC', name: 'Arc', price: 12.84, change24hPct: 4.81 },
  { symbol: 'NOVA', name: 'Nova', price: 0.892, change24hPct: 1.12 },
];

export const statCards: StatCard[] = [
  {
    symbol: 'RIO',
    name: 'Ripple',
    price: 1.248,
    changePct: 2.34,
    points: [8, 9, 10, 9, 11, 12, 11, 13, 14, 13, 15, 16],
  },
  {
    symbol: 'THC',
    name: 'Thorchain',
    price: 3.912,
    changePct: -1.08,
    points: [16, 15, 15, 14, 13, 13, 12, 12, 11, 12, 11, 10],
  },
  {
    symbol: 'TRN',
    name: 'Tron',
    price: 0.145,
    changePct: 0.62,
    points: [7, 7, 8, 8, 8, 9, 8, 9, 10, 9, 9, 10],
  },
  {
    symbol: 'PROMO',
    name: 'Automation',
    price: 0,
    changePct: 0,
    points: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  },
];

export const topTokensByMarketCap: TokenRow[] = [
  {
    name: 'Ripple Pool',
    symbol: 'RIO',
    price: 1.248,
    change1hPct: 0.12,
    change24hPct: 2.34,
    change7dPct: 6.18,
    volume: 18420000,
    sparkline: [12, 13, 13, 14, 15, 15, 16, 17, 16, 18, 19, 20],
  },
  {
    name: 'Thorchain Pool',
    symbol: 'THC',
    price: 3.912,
    change1hPct: -0.28,
    change24hPct: -1.08,
    change7dPct: 1.92,
    volume: 9620000,
    sparkline: [20, 19, 18, 18, 17, 17, 16, 16, 15, 15, 14, 14],
  },
  {
    name: 'Tron Pool',
    symbol: 'TRN',
    price: 0.145,
    change1hPct: 0.04,
    change24hPct: 0.62,
    change7dPct: -0.88,
    volume: 4210000,
    sparkline: [8, 8, 9, 9, 10, 9, 9, 10, 10, 9, 9, 9],
  },
  {
    name: 'Arc Pool',
    symbol: 'ARC',
    price: 12.84,
    change1hPct: 0.62,
    change24hPct: 4.81,
    change7dPct: 12.2,
    volume: 22850000,
    sparkline: [10, 11, 11, 12, 13, 14, 15, 15, 16, 17, 18, 19],
  },
  {
    name: 'Nova Pool',
    symbol: 'NOVA',
    price: 0.892,
    change1hPct: -0.1,
    change24hPct: 1.12,
    change7dPct: 3.84,
    volume: 6840000,
    sparkline: [9, 9, 10, 9, 10, 11, 10, 11, 12, 12, 13, 13],
  },
];

