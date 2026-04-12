-- Add missing columns to agent_stats table for agent runner
ALTER TABLE IF EXISTS public.agent_stats 
ADD COLUMN IF NOT EXISTS current_action TEXT DEFAULT 'HOLD' CHECK (current_action IN ('BUY','SELL','HOLD'));

ALTER TABLE IF EXISTS public.agent_stats 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','PAUSED','STOPPED','ERROR'));

ALTER TABLE IF EXISTS public.agent_stats 
ADD COLUMN IF NOT EXISTS total_balance NUMERIC DEFAULT 500;

ALTER TABLE IF EXISTS public.agent_stats 
ADD COLUMN IF NOT EXISTS portfolio_value NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS public.agent_stats 
ADD COLUMN IF NOT EXISTS pnl_pct NUMERIC DEFAULT 0;
