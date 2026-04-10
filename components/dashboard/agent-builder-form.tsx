'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { GlassCard } from '@/components/dashboard/glass';
import { cn } from '@/lib/utils';
import type { AgentConfig, DeployedAgent, StrategyType } from '@/lib/agent-builder';
import {
  SUPPORTED_STRATEGIES,
  COMMON_TOKEN_PAIRS,
  TRIGGER_EXAMPLES,
  deployAgent,
} from '@/lib/agent-builder';

// Validation schema
const FormSchema = z.object({
  name: z.string().min(3, 'Agent name must be at least 3 characters'),
  strategy_type: z.enum(['SPOT', 'DCA', 'SNIPER', 'MARGIN', 'MEME', 'ARBITRAGE', 'VISUAL']),
  token_pair: z.string().min(1, 'Token pair is required'),
  trigger: z.string().min(1, 'Trigger condition is required'),
  position_size: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Position size must be greater than 0'),
  stop_loss_pct: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)), 'Stop loss must be a number')
    .refine((val) => parseFloat(val) >= 0 && parseFloat(val) <= 100, 'Stop loss must be between 0 and 100'),
});

type FormData = z.infer<typeof FormSchema>;

interface AgentBuilderFormProps {
  onAgentDeployed?: (agent: DeployedAgent) => void;
}

export const AgentBuilderForm = ({ onAgentDeployed }: AgentBuilderFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deployedAgent, setDeployedAgent] = useState<DeployedAgent | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      strategy_type: 'SPOT',
      token_pair: 'BTC/USD',
      trigger: '',
      position_size: '100',
      stop_loss_pct: '5',
    },
  });

  const selectedStrategy = watch('strategy_type') as StrategyType;

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const config: AgentConfig = {
        name: data.name,
        strategy_type: data.strategy_type,
        token_pair: data.token_pair,
        trigger: data.trigger,
        position_size: parseFloat(data.position_size),
        stop_loss_pct: parseFloat(data.stop_loss_pct),
      };

      const agent = await deployAgent(config);
      setDeployedAgent(agent);
      setSuccessMessage(
        `✅ Agent "${agent.name}" deployed successfully! It will start paper trading within 60 seconds.`
      );
      onAgentDeployed?.(agent);
      reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deploy agent';
      setErrorMessage(`❌ ${message}`);
      console.error('Deploy error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Build Your Trading Agent</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure a strategy and deploy it to start paper trading immediately
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{successMessage}</p>
              {deployedAgent && (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Agent ID: <code className="font-mono">{deployedAgent.id}</code>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-900 dark:text-red-200">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <GlassCard className="p-6">
          {/* Agent Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('name')}
              placeholder="e.g., My Cool Bitcoin Trading Bot"
              className={cn(
                'h-11 rounded-xl bg-white/60 dark:bg-gray-950/30 border-gray-200/70 dark:border-gray-800/60',
                errors.name && 'border-red-500'
              )}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Strategy Type */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Strategy Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('strategy_type')}
                className={cn(
                  'h-11 w-full rounded-xl bg-white/60 px-3 dark:bg-gray-950/30 border border-gray-200/70 dark:border-gray-800/60',
                  'text-gray-900 dark:text-gray-50 text-sm font-medium',
                  errors.strategy_type && 'border-red-500'
                )}
              >
                {Object.entries(SUPPORTED_STRATEGIES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {key} - {value.split(' - ')[1]}
                  </option>
                ))}
              </select>
              {errors.strategy_type && <p className="text-xs text-red-500">{errors.strategy_type.message}</p>}
            </div>

            {/* Token Pair */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Token Pair <span className="text-red-500">*</span>
              </label>
              <select
                {...register('token_pair')}
                className={cn(
                  'h-11 w-full rounded-xl bg-white/60 px-3 dark:bg-gray-950/30 border border-gray-200/70 dark:border-gray-800/60',
                  'text-gray-900 dark:text-gray-50 text-sm font-medium',
                  errors.token_pair && 'border-red-500'
                )}
              >
                {COMMON_TOKEN_PAIRS.map((pair) => (
                  <option key={pair} value={pair}>
                    {pair}
                  </option>
                ))}
              </select>
              {errors.token_pair && <p className="text-xs text-red-500">{errors.token_pair.message}</p>}
            </div>
          </div>

          {/* Trigger Condition */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Trigger Condition <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('trigger')}
              placeholder="e.g., PRICE_DROP_5PCT or INTERVAL_24H"
              className={cn(
                'h-11 rounded-xl bg-white/60 dark:bg-gray-950/30 border-gray-200/70 dark:border-gray-800/60',
                errors.trigger && 'border-red-500'
              )}
            />
            <div className="rounded-lg bg-blue-50/50 p-2 dark:bg-blue-950/20">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Examples:</p>
              <ul className="mt-1 space-y-1 text-xs text-blue-600 dark:text-blue-400">
                {Object.entries(TRIGGER_EXAMPLES).map(([key, value]) => (
                  <li key={key}>{value}</li>
                ))}
              </ul>
            </div>
            {errors.trigger && <p className="text-xs text-red-500">{errors.trigger.message}</p>}
          </div>

          {/* Position Size */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Position Size (USD) <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('position_size')}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="100"
                inputMode="decimal"
                className={cn(
                  'h-11 rounded-xl bg-white/60 dark:bg-gray-950/30 border-gray-200/70 dark:border-gray-800/60',
                  errors.position_size && 'border-red-500'
                )}
              />
              {errors.position_size && <p className="text-xs text-red-500">{errors.position_size.message}</p>}
            </div>

            {/* Stop Loss */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Stop Loss (%) <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('stop_loss_pct')}
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="5"
                inputMode="decimal"
                className={cn(
                  'h-11 rounded-xl bg-white/60 dark:bg-gray-950/30 border-gray-200/70 dark:border-gray-800/60',
                  errors.stop_loss_pct && 'border-red-500'
                )}
              />
              {errors.stop_loss_pct && <p className="text-xs text-red-500">{errors.stop_loss_pct.message}</p>}
            </div>
          </div>
        </GlassCard>

        {/* Info Box */}
        <div className="rounded-xl border border-primary-200/50 bg-primary-50/30 p-4 dark:border-primary-900/30 dark:bg-primary-950/20">
          <p className="text-sm text-primary-700 dark:text-primary-300">
            <strong>🧪 Paper Trading Mode:</strong> Your agent will trade with simulated funds. No real money is at risk.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full h-11 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Deploying Agent...
            </>
          ) : (
            '🚀 Deploy Agent'
          )}
        </Button>
      </form>
    </div>
  );
};
