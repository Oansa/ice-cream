import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client using environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agent stats with join to agents table
    const { data, error } = await supabase
      .from('agent_stats')
      .select(`
        *,
        agents (
          id,
          name,
          strategy_type,
          token_pair,
          status
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }

    // Transform data to match SimulatedAgent type
    interface AgentRow {
      agent_id: string;
      total_pnl: number;
      pnl_pct: number;
      total_balance: number;
      portfolio_value: number;
      trade_count: number;
      current_action?: string;
      agents?: {
        name?: string;
        strategy_type?: string;
        token_pair?: string;
        status?: string;
      };
    }

    const agents = data?.map((row: AgentRow) => {
      const tokenPair = row.agents?.token_pair || 'BTC/USD';
      const trackedToken = tokenPair.split('/')[0];
      
      return {
        id: row.agent_id,
        name: row.agents?.name || 'Unknown Agent',
        tradingPair: tokenPair,
        status: (row.agents?.status as string) || 'RUNNING',
        currentAction: (row.current_action as 'BUY' | 'SELL' | 'HOLD') || 'HOLD',
        pnlUsd: row.total_pnl || 0,
        pnlPct: row.pnl_pct || 0,
        totalBalanceUsd: row.total_balance || 500,
        portfolioValueUsd: row.portfolio_value || 0,
        cashUsd: (row.total_balance || 500) - (row.portfolio_value || 0),
        trackedToken,
        tradesCount: row.trade_count || 0,
      };
    }) || [];

    // Aggregate totals
    const totalBalanceUsd = agents.reduce((sum, a) => sum + (a.totalBalanceUsd || 0), 0);
    const totalPnlUsd = agents.reduce((sum, a) => sum + (a.pnlUsd || 0), 0);
    const totalPnlPct = totalBalanceUsd > 0 ? (totalPnlUsd / 500) * 100 : 0;

    return NextResponse.json({
      agents,
      summary: {
        totalBalanceUsd,
        pnlUsd: totalPnlUsd,
        pnlPct: totalPnlPct,
      },
    });
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

