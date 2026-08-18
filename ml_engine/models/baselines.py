import numpy as np

class PersistenceBaseline:
    """
    Standard time-series persistence baseline: y_hat(t+h) = y(t).
    """
    def __init__(self):
        self.last_value = 0.0

    def fit(self, y: np.ndarray):
        if len(y) > 0:
            self.last_value = float(y[-1])

    def predict(self, y_history: np.ndarray, horizon: int = 24) -> np.ndarray:
        current = float(y_history[-1]) if len(y_history) > 0 else self.last_value
        return np.full(horizon, current)

class SeasonalNaiveBaseline:
    """
    24-hour lagged seasonal naive baseline: y_hat(t+h) = y(t+h-24).
    """
    def __init__(self, season_length: int = 24):
        self.season_length = season_length

    def fit(self, y: np.ndarray):
        pass

    def predict(self, y_history: np.ndarray, horizon: int = 24) -> np.ndarray:
        if len(y_history) < self.season_length:
            return np.full(horizon, np.mean(y_history) if len(y_history) > 0 else 0.0)
        
        last_24 = y_history[-self.season_length:]
        reps = (horizon // self.season_length) + 1
        extended = np.tile(last_24, reps)
        return extended[:horizon]
