"""Simulated spot balance for paper trading (no real exchange orders)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict


@dataclass
class PortfolioPosition:
    symbol: str
    quantity: float = 0.0
    avg_entry: float = 0.0
    cost_basis: float = 0.0


@dataclass
class VirtualBalance:
    initial_cash_usd: float
    cash_usd: float = field(init=False)
    portfolio: Dict[str, PortfolioPosition] = field(default_factory=dict)
    total_trades: int = 0

    def __post_init__(self) -> None:
        self.cash_usd = float(self.initial_cash_usd)

    def buy(self, pair: str, usd_amount: float, price: float) -> bool:
        if usd_amount <= 0 or price <= 0:
            return False
        if self.cash_usd + 1e-9 < usd_amount:
            return False
        base = pair.split("/")[0]
        qty = usd_amount / price
        self.cash_usd -= usd_amount
        pos = self.portfolio.get(base)
        if pos is None or pos.quantity <= 0:
            self.portfolio[base] = PortfolioPosition(base, qty, price, usd_amount)
        else:
            new_qty = pos.quantity + qty
            new_cost = pos.cost_basis + usd_amount
            new_avg = new_cost / new_qty if new_qty > 0 else price
            self.portfolio[base] = PortfolioPosition(base, new_qty, new_avg, new_cost)
        self.total_trades += 1
        return True

    def sell(self, pair: str, qty: float, price: float) -> bool:
        if qty <= 0 or price <= 0:
            return False
        base = pair.split("/")[0]
        pos = self.portfolio.get(base)
        if pos is None or pos.quantity + 1e-12 < qty:
            return False
        proceeds = qty * price
        self.cash_usd += proceeds
        new_qty = pos.quantity - qty
        if new_qty <= 1e-12:
            del self.portfolio[base]
        else:
            ratio = new_qty / pos.quantity
            self.portfolio[base] = PortfolioPosition(
                base,
                new_qty,
                pos.avg_entry,
                pos.cost_basis * ratio,
            )
        self.total_trades += 1
        return True

    def hold(self) -> None:
        return

    def _calc_portfolio_value(self, current_prices: Dict[str, float]) -> float:
        total = 0.0
        for sym, pos in self.portfolio.items():
            px = current_prices.get(sym)
            if px is None or px <= 0:
                px = pos.avg_entry
            total += pos.quantity * float(px)
        return total

    def get_total_balance(self, current_prices: Dict[str, float]) -> float:
        return self.cash_usd + self._calc_portfolio_value(current_prices)

    def get_pnl(self, current_prices: Dict[str, float]) -> float:
        market_value = self._calc_portfolio_value(current_prices)
        book = sum(p.cost_basis for p in self.portfolio.values())
        return market_value - book

    def get_pnl_pct(self, current_prices: Dict[str, float]) -> float:
        invested = sum(p.cost_basis for p in self.portfolio.values())
        denom = invested + max(self.initial_cash_usd, 1e-9)
        pnl = self.get_pnl(current_prices)
        if denom <= 0:
            return 0.0
        return (pnl / denom) * 100.0
