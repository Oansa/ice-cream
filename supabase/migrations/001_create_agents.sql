-- Agents table
CREATE TABLE public.agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strategy_type TEXT NOT NULL CHECK (strategy_type IN ('SPOT','DCA','SNIPER','MARGIN','MEME','ARBITRAGE')),
  token_pair TEXT NOT NULL,
  trigger TEXT NOT NULL,
  position_size NUMERIC NOT NULL,
  stop_loss_pct NUMERIC NOT NULL DEFAULT 10,
  take_profit_pct NUMERIC DEFAULT 20,
  is_active BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'deploying' CHECK (status IN ('deploying','live','paused','stopped','error')),
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table
CREATE TABLE public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('BUY','SELL')),
  amount NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  pnl NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  kraken_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Agent stats table
CREATE TABLE public.agent_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE,
  total_pnl NUMERIC DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  last_trade_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_is_active ON public.agents(is_active);
CREATE INDEX idx_trades_agent_id ON public.trades(agent_id);
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_created_at ON public.trades(created_at);

-- Row level security
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_stats ENABLE ROW LEVEL SECURITY;

-- Policies — users can only see their own data
CREATE POLICY "Users see own agents" ON public.agents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own trades" ON public.trades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own stats" ON public.agent_stats
  FOR ALL USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_stats_updated_at
  BEFORE UPDATE ON public.agent_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
