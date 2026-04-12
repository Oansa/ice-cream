/**
 * Supabase client initialization for Next.js app
 * Provides both client and server-side Supabase clients
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client-side Supabase client (for browser operations)
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Server-side Supabase client (for API routes with elevated privileges)
export const supabaseServer = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Type exports for database operations
export type Database = {
  agents: {
    id: string;
    name: string;
    strategy_type: string;
    token_pair: string;
    trigger: string;
    position_size: number;
    stop_loss_pct: number;
    is_active: boolean;
    status?: string;
    created_at?: string;
    last_updated?: string;
    user_id?: string;
    strategy_graph?: string;
  };
  trades: {
    id: string;
    agent_id: string;
    pair: string;
    direction: string;
    amount: number;
    entry_price?: number;
    exit_price?: number;
    pnl?: number;
    status: string;
    kraken_order_id: string;
    created_at: string;
  };
  agent_stats: {
    agent_id: string;
    total_pnl: number;
    trade_count: number;
    win_count: number;
    loss_count: number;
    last_trade_at?: string;
    status: string;
  };
};
