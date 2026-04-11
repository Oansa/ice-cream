# Block Schemas & Connection Guide

Complete reference for all 30+ supported block types in the Ice Cream trading strategy builder. Use this guide to understand what inputs/outputs each block has and build versatile multi-connection workflows like n8n.

---

## 📋 Table of Contents

- [Market Configuration Blocks](#market)
- [Data Source Blocks](#data)
- [Condition Blocks](#conditions)
- [Logic Blocks](#logic)
- [Signal Blocks](#signals)
- [Execution Blocks](#execution)
- [Risk Management Blocks](#risk)
- [Position Management Blocks](#position)
- [Trade Control Blocks](#trade-control)
- [Automation Blocks](#automation)
- [Connection Patterns](#patterns)

---

## <a id="market"></a>📍 Market Configuration Blocks

Blocks that define trading pair, timeframe, and market context. These typically have no inputs but provide foundational outputs.

### `trading-pair`
**Category:** Market Configuration
**Description:** Defines the trading pair and market context

**Outputs:**
- `pair` → Market context object {pair, base, quote, kraken_pair}

**Example:**
```json
{
  "id": "pair",
  "defId": "trading-pair",
  "config": { "pair": "ETH/USDT" }
}
```

**Use:** Connect to any block that needs market pair information.

---

### `timeframe`
**Category:** Market Configuration
**Description:** Sets the candle timeframe for analysis

**Outputs:**
- `timeframe` → Timeframe config object {timeframe: str, interval: int}

**Supported Timeframes:** 1m, 5m, 15m, 1h, 4h, 1d, 1w

**Example:**
```json
{
  "id": "tf",
  "defId": "timeframe",
  "config": { "timeframe": "15m" }
}
```

---

### `market-type`
**Category:** Market Configuration
**Description:** Specifies market type (spot/margin/futures)

**Outputs:**
- `type` → Market type string: "spot", "margin", or "futures"

---

## <a id="data"></a>💾 Data Source Blocks

Blocks that retrieve market data and calculate indicators.

### `price`
**Category:** Data
**Description:** Gets current market price and timestamp

**Outputs:**
- `value` → Current price as float number
- `timestamp` → Unix timestamp as number

**Versatility Examples:**
```json
// Connect same price output to multiple blocks
{
  "edges": [
    { "source": "price", "target": "ema-9", "sourceHandle": "value", "targetHandle": "price" },
    { "source": "price", "target": "ema-21", "sourceHandle": "value", "targetHandle": "price" },
    { "source": "price", "target": "rsi-14", "sourceHandle": "value", "targetHandle": "price" },
    { "source": "price", "target": "display", "sourceHandle": "value", "targetHandle": "input" }
  ]
}
```

**Benefit:** One price block feeds 3 indicators and a display simultaneously.

---

### `volume`
**Category:** Data
**Description:** Returns 24-hour trading volume

**Outputs:**
- `value` → Volume as float number

---

### `indicator`
**Category:** Data
**Description:** Calculates technical indicators (RSI, EMA, MACD, Bollinger Bands)

**Inputs:**
- `price` → Price data to analyze

**Outputs:**
- `value` → Current indicator value as number
- `history` → Array of historical values for crosses/patterns

**Config:**
- `indicator_name` → "RSI", "EMA", "MACD", or "Bollinger"
- `period` → Number (e.g., 9, 14, 21)

**Example - Multiple Indicators:**
```json
{
  "id": "ema-9",
  "defId": "indicator",
  "config": { "indicator_name": "EMA", "period": 9 }
}
```

---

## <a id="conditions"></a>❓ Condition Blocks

Blocks that evaluate conditions and return boolean results.

### `greater-than`
**Category:** Condition
**Description:** Compares: a > b

**Inputs:**
- `a`  → First value (number)
- `b` → Second value (number)

**Outputs:**
- `result` → Boolean (true if a > b)

**Example:** Compare RSI > 30
```json
{
  "edges": [
    { "source": "rsi", "target": "gt30", "sourceHandle": "value", "targetHandle": "a" },
    { "source": "threshold", "target": "gt30", "sourceHandle": "value", "targetHandle": "b" }
  ]
}
```

---

### `less-than`
**Category:** Condition
**Description:** Compares: a < b

**Inputs:**
- `a` → First value
- `b` → Second value

**Outputs:**
- `result` → Boolean (true if a < b)

---

### `crosses-above` ⭐
**Category:** Condition
**Description:** Detects when series A crosses above series B (stateful - requires history)

**Inputs:**
- `a` → First series (typically indicator output with history)
- `b` → Second series (typically another indicator)

**Outputs:**
- `result` → Boolean (true only at cross moment, then false)

**Key Feature:** Stateful - remembers previous values to detect crosses

**Example - EMA Crossover:**
```json
{
  "edges": [
    { "source": "ema-9", "target": "cross", "sourceHandle": "history", "targetHandle": "a" },
    { "source": "ema-21", "target": "cross", "sourceHandle": "history", "targetHandle": "b" }
  ]
}
```

---

### `crosses-below`
**Category:** Condition
**Description:** Detects when series A crosses below series B

**Inputs:**
- `a` → First series
- `b` → Second series

**Outputs:**
- `result` → Boolean

---

## <a id="logic"></a>🔀 Logic Blocks

Blocks that combine multiple boolean inputs. **These are the most versatile!**

### `and` ⭐⭐
**Category:** Logic
**Description:** Logical AND - ALL inputs must be true. **Accepts 1-5 inputs!**

**Inputs:**
- `input1` → Boolean
- `input2` → Boolean
- `input3` → Boolean (optional)
- `input4` → Boolean (optional)
- `input5` → Boolean (optional)

**Outputs:**
- `result` → Boolean (true only if all connected inputs are true)

**Multi-Connection Example (5 conditions):**
```json
{
  "edges": [
    { "source": "cond1", "target": "and", "sourceHandle": "result", "targetHandle": "input1" },
    { "source": "cond2", "target": "and", "sourceHandle": "result", "targetHandle": "input2" },
    { "source": "cond3", "target": "and", "sourceHandle": "result", "targetHandle": "input3" },
    { "source": "cond4", "target": "and", "sourceHandle": "result", "targetHandle": "input4" },
    { "source": "cond5", "target": "and", "sourceHandle": "result", "targetHandle": "input5" }
  ]
}
```

**Benefit:** Combine 2-5 independent conditions into single BUY signal.

---

### `or`
**Category:** Logic
**Description:** Logical OR - ANY input true. **Accepts 1-5 inputs!**

**Inputs:**
- `input1`, `input2`, `input3`, `input4`, `input5`

**Outputs:**
- `result` → Boolean (true if any input is true)

**Versatility Example:**
```json
// Multiple price signals
{
  "edges": [
    { "source": "breakout", "target": "or", "sourceHandle": "result", "targetHandle": "input1" },
    { "source": "support-bounce", "target": "or", "sourceHandle": "result", "targetHandle": "input2" },
    { "source": "ma-cross", "target": "or", "sourceHandle": "result", "targetHandle": "input3" }
  ]
}
// Buys if ANY of the three conditions trigger
```

---

### `not`
**Category:** Logic
**Description:** Logical NOT - inverts boolean

**Inputs:**
- `value` → Boolean

**Outputs:**
- `result` → Boolean (inverted)

---

## <a id="signals"></a>📢 Signal Blocks

Blocks that emit trading signals when gated by conditions.

### `buy-signal`
**Category:** Signal
**Description:** Emits buy signal when gate input is true

**Inputs:**
- `gate` → Boolean condition

**Outputs:**
- `signal` → Trading signal event

**Example:**
```json
{
  "edges": [
    { "source": "and", "target": "buy-signal", "sourceHandle": "result", "targetHandle": "gate" }
  ]
}
```

---

### `sell-signal`
**Category:** Signal
**Description:** Emits sell signal when gate is true

**Inputs:**
- `gate` → Boolean condition

**Outputs:**
- `signal` → Trading signal event

---

## <a id="execution"></a>💰 Execution Blocks

Blocks that place actual orders.

### `market-buy`
**Category:** Execution
**Description:** Places a market buy order

**Inputs:**
- `signal` → Buy signal trigger
- `size` → Optional position size override

**Outputs:**
- `entry` → Entry price when executed

---

### `market-sell`
**Category:** Execution
**Description:** Places a market sell order

**Inputs:**
- `signal` → Sell signal trigger

**Outputs:**
- `exit` → Exit price

---

### `limit-buy`
**Category:** Execution
**Description:** Places a limit buy order

**Inputs:**
- `signal` → Buy signal
- `price` → Limit price
- `size` → Position size

**Outputs:**
- `entry` → Entry price if filled

---

### `limit-sell`
**Category:** Execution
**Description:** Places a limit sell order

**Inputs:**
- `signal` → Sell signal
- `price` → Limit price

**Outputs:**
- `exit` → Exit price if filled

---

## <a id="risk"></a>⛔ Risk Management Blocks

Blocks that manage risk and protect positions.

### `take-profit`
**Category:** Risk
**Description:** Triggers sell if profit reaches target (e.g., +6%)

**Inputs:**
- `entry_price` → Entry price from market-buy

**Outputs:**
- `signal` → Sell signal when profit target hit

**Config:**
- `profit_percent` → Target profit % (e.g., 6)

---

### `stop-loss`
**Category:** Risk
**Description:** Triggers sell if loss exceeds limit (e.g., -3%)

**Inputs:**
- `entry_price` → Entry price from market-buy

**Outputs:**
- `signal` → Sell signal if stop-loss hit

**Config:**
- `loss_percent` → Max loss % (e.g., 3)

---

### `trailing-stop`
**Category:** Risk
**Description:** Dynamic stop-loss that follows price upward

**Inputs:**
- `entry_price` → Entry price
- `current_price` → Current market price

**Outputs:**
- `signal` → Sell signal if trailing stop hit

---

## <a id="position"></a>📊 Position Management Blocks

Blocks that control position sizing and limits.

### `position-size`
**Category:** Position
**Description:** Specifies position size in USD or portfolio %

**Outputs:**
- `size` → Position size value

**Config:**
- `size_percent` or `size_usd` → Size specification

---

### `max-positions`
**Category:** Position
**Description:** Sets maximum concurrent open positions

**Outputs:**
- `limit` → Max position count (e.g., 2)

---

## <a id="trade-control"></a>🎛️ Trade Control Blocks

Blocks that manage trading frequency and duration.

### `cooldown`
**Category:** Trade Control
**Description:** Prevents trading more often than interval

**Inputs:**
- `signal` → Input signal

**Outputs:**
- `signal` → Pass-through only if cooldown passed

**Config:**
- `cooldown_minutes` → Wait time between trades (e.g., 15)

---

### `max-duration`
**Category:** Trade Control
**Description:** Auto-closes position after time limit

**Inputs:**
- `entry` → Entry from market-buy

**Outputs:**
- `signal` → Triggers sell when max duration reached

**Config:**
- `max_minutes` → Maximum trade duration (e.g., 240 for 4 hours)

---

### `re-entry`
**Category:** Trade Control
**Description:** Controls whether multiple entries allowed

**Inputs:**
- `signal` → Input signal

**Outputs:**
- `signal` → Allow/block re-entry

---

## <a id="automation"></a>⏰ Automation Blocks

Blocks that control execution timing.

### `run-loop`
**Category:** Automation
**Description:** Continuous execution - fires every cycle

**Outputs:**
- `trigger` → Execution trigger

---

### `interval`
**Category:** Automation
**Description:** Execute at specified time interval

**Outputs:**
- `trigger` → Execution trigger

**Config:**
- `seconds` or `interval` → Time between executions

---

### `trigger`
**Category:** Automation
**Description:** Event-based trigger

**Outputs:**
- `trigger` → Execution trigger

---

## <a id="patterns"></a>🎨 Connection Patterns

Example multi-connection workflows using versatile blocks:

### Pattern 1: Price Feeds Multiple Indicators

```json
Price (1 output) → {
  EMA-9,
  EMA-21,
  RSI-14,
  MACD
}
```

**Benefit:** One price block efficiently feeds 4 different indicators.

---

### Pattern 2: Multi-Condition Entry Signal

```
Condition 1 (EMA Cross)
Condition 2 (RSI < 70)    → AND Gate (all true) → Buy Signal
Condition 3 (Volume Spike)
```

**Benefit:** All 3 conditions must be true to buy - reduces false signals.

---

### Pattern 3: Multiple Exit Triggers (ANY exit trigger)

```
Take Profit (+6%)
Stop Loss (-3%)      → OR Gate (any true) → Sell Signal
Max Duration (4h)
```

**Benefit:** Exit if ANY rule triggers - protects profit on spikes, protects against gap down.

---

### Pattern 4: Output Reuse - Indicator to Multiple Conditions

```
EMA-9 Output → {
  Crosses-Above (vs EMA-21),
  Greater-Than (vs Price × 1.02),
  Display Widget
}
```

**Benefit:** One indicator feeds 2 conditions + UI display.

---

## ✅ Validation Rules

All connections are validated:

1. **Source block must exist** with specified output handle
2. **Target block must exist** with specified input handle
3. **Cannot have circular dependencies** (DAG enforcement)
4. **All required inputs must be connected** (implicit via execution)

Invalid connections are caught with clear error messages before deployment.

---

## 🚀 Getting Started

### Create a Complex Strategy

1. **Add blocks** from each category
2. **Connect price** to multiple indicators
3. **Connect indicators** to condition blocks
4. **Connect conditions** to AND/OR logic
5. **Connect logic** to buy-signal
6. **Connect buy-signal** to market-buy
7. **Connect buy outcomes** to risk blocks (take-profit, stop-loss)
8. **Connect risk outputs** (via OR) to sell-signal
9. **Connect sell-signal** to market-sell

Example: 7 blocks with 15+ connections all working together!

---

## 📞 Support

For invalid handle errors, check:
1. Block type definitions in this guide
2. Available `inputs` and `outputs` for each block
3. Handle names match exactly
4. Both source and target blocks exist in nodes array

---

*Last updated: April 2026*
*Version: 1.0*
