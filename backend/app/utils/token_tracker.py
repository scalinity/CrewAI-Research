from __future__ import annotations

import threading

# Per 1M tokens: (input_price, output_price)
PRICE_TABLE: dict[str, tuple[float, float]] = {
    # OpenAI GPT-5.4 family
    "gpt-5.4":      (2.50, 15.00),
    "gpt-5.4-mini": (0.75, 4.50),
    "gpt-5.4-nano": (0.30, 1.50),
    # Anthropic Claude 4 family
    "claude-opus-4-6":   (5.00, 25.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    # Google Gemini 3 family
    "gemini-3.1-pro-preview":        (2.00, 12.00),
    "gemini-3-flash-preview":        (0.50, 3.00),
    "gemini-3.1-flash-lite-preview": (0.25, 1.50),
}


def _blended_rate(model_short: str) -> float:
    """Blended rate assuming ~70% input / 30% output for typical crew runs."""
    prices = PRICE_TABLE.get(model_short)
    if not prices:
        return 1.0
    return prices[0] * 0.7 + prices[1] * 0.3


class TokenTracker:
    def __init__(self, model_name: str) -> None:
        self.model = model_name
        self.per_agent: dict[str, int] = {}
        self.cumulative_total: int = 0
        self._lock = threading.Lock()
        # Pre-compute the blended rate once (model doesn't change per-run)
        model_short = model_name.split("/")[-1] if "/" in model_name else model_name
        self._rate: float = _blended_rate(model_short)
        self._cost_dirty: bool = True
        self._cached_cost: float = 0.0

    @property
    def total_cost(self) -> float:
        if self._cost_dirty:
            self._cached_cost = (self.cumulative_total / 1_000_000) * self._rate
            self._cost_dirty = False
        return self._cached_cost

    def add_estimate(self, agent: str, tokens: int) -> None:
        with self._lock:
            self.per_agent[agent] = self.per_agent.get(agent, 0) + tokens
            self.cumulative_total += tokens
            self._cost_dirty = True

    def snap_to_real(self, token_data: dict | None) -> None:
        if not token_data or not isinstance(token_data, dict):
            return
        with self._lock:
            total = 0
            for v in token_data.values():
                if isinstance(v, (int, float)):
                    total += int(v)
                elif isinstance(v, dict):
                    for inner in v.values():
                        if isinstance(inner, (int, float)):
                            total += int(inner)
            if total > 0:
                self.cumulative_total = max(self.cumulative_total, total)
                self._cost_dirty = True
