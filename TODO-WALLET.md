# Wallet Connect Dashboard Fix TODO

## Plan Steps:
- [x] 1. Update lib/stores/useTradingStore.ts - add web3Connected, web3Address, web3BalanceEth, fetchWalletBalance (fixed linter/types)
- [x] 2. Update components/dashboard/shell.tsx - add useWeb3 hook + effect to fetch balance
- [x] 3. Update components/dashboard/wallet-overview-card.tsx - conditional real balance/profile display
- [x] 5. Complete

Approved plan: Store web3 state, shell fetches balance, card shows ETH + profile when connected.
