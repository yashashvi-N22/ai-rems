import os
import torch
import torch.nn as nn
import numpy as np
from typing import Tuple, List, Dict

class MultiHeadSelfAttention(nn.Module):
    def __init__(self, embed_dim: int, num_heads: int = 4):
        super().__init__()
        self.attn = nn.MultiheadAttention(embed_dim, num_heads, batch_first=True)
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, x):
        attn_out, _ = self.attn(x, x, x)
        return self.norm(x + attn_out)

class Seq2SeqLSTMAttention(nn.Module):
    """
    Bidirectional LSTM with Multi-Head Attention for multi-step sequence-to-sequence forecasting.
    """
    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 2, horizon: int = 24):
        super().__init__()
        self.horizon = horizon
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.1 if num_layers > 1 else 0.0
        )
        self.attention = MultiHeadSelfAttention(embed_dim=hidden_dim * 2, num_heads=4)
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(64, horizon)
        )

    def forward(self, x):
        # x shape: [batch_size, seq_len, input_dim]
        lstm_out, _ = self.lstm(x) # [batch_size, seq_len, hidden_dim * 2]
        attn_out = self.attention(lstm_out) # [batch_size, seq_len, hidden_dim * 2]
        # Pool across sequence length
        pooled = torch.mean(attn_out, dim=1) # [batch_size, hidden_dim * 2]
        out = self.fc(pooled) # [batch_size, horizon]
        return out

class LSTMForecasterWrapper:
    """Wrapper managing scaling, dataset sequencing, training, and PyTorch inference."""
    def __init__(self, target_name: str, input_dim: int, horizon: int = 24, seq_len: int = 48):
        self.target_name = target_name
        self.input_dim = input_dim
        self.horizon = horizon
        self.seq_len = seq_len
        self.model = Seq2SeqLSTMAttention(input_dim=input_dim, hidden_dim=64, num_layers=2, horizon=horizon)
        self.mean_y = 0.0
        self.std_y = 1.0
        self.mean_x = np.zeros(input_dim)
        self.std_x = np.ones(input_dim)

    def _create_sequences(self, X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        X_seq, y_seq = [], []
        for i in range(len(X) - self.seq_len - self.horizon + 1):
            X_seq.append(X[i : i + self.seq_len])
            y_seq.append(y[i + self.seq_len : i + self.seq_len + self.horizon])
        return np.array(X_seq), np.array(y_seq)

    def fit(self, X_train: np.ndarray, y_train: np.ndarray, epochs: int = 25, batch_size: int = 64, lr: float = 0.003):
        # Normalization parameters
        self.mean_x = np.mean(X_train, axis=0)
        self.std_x = np.std(X_train, axis=0) + 1e-6
        self.mean_y = float(np.mean(y_train))
        self.std_y = float(np.std(y_train)) + 1e-6

        X_norm = (X_train - self.mean_x) / self.std_x
        y_norm = (y_train - self.mean_y) / self.std_y

        X_seq, y_seq = self._create_sequences(X_norm, y_norm)
        if len(X_seq) == 0:
            return

        dataset = torch.utils.data.TensorDataset(
            torch.tensor(X_seq, dtype=torch.float32),
            torch.tensor(y_seq, dtype=torch.float32)
        )
        loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)

        optimizer = torch.optim.AdamW(self.model.parameters(), lr=lr, weight_decay=1e-4)
        criterion = nn.HuberLoss()

        self.model.train()
        for epoch in range(epochs):
            for batch_x, batch_y in loader:
                optimizer.zero_grad()
                pred = self.model(batch_x)
                loss = criterion(pred, batch_y)
                loss.backward()
                optimizer.step()

    def predict(self, X_window: np.ndarray) -> np.ndarray:
        """
        Takes the most recent seq_len historical window and outputs 24h predictions.
        """
        self.model.eval()
        with torch.no_grad():
            if len(X_window) < self.seq_len:
                # Pad if shorter
                pad_len = self.seq_len - len(X_window)
                pad = np.tile(X_window[0], (pad_len, 1))
                X_window = np.vstack([pad, X_window])
            elif len(X_window) > self.seq_len:
                X_window = X_window[-self.seq_len:]

            X_norm = (X_window - self.mean_x) / self.std_x
            tensor_x = torch.tensor(X_norm, dtype=torch.float32).unsqueeze(0) # [1, seq_len, dim]
            pred_norm = self.model(tensor_x).squeeze(0).numpy()
            pred_actual = (pred_norm * self.std_y) + self.mean_y
            return np.maximum(0.0, pred_actual)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save({
            "target_name": self.target_name,
            "input_dim": self.input_dim,
            "horizon": self.horizon,
            "seq_len": self.seq_len,
            "state_dict": self.model.state_dict(),
            "mean_x": self.mean_x,
            "std_x": self.std_x,
            "mean_y": self.mean_y,
            "std_y": self.std_y
        }, filepath)

    @classmethod
    def load(cls, filepath: str) -> 'LSTMForecasterWrapper':
        checkpoint = torch.load(filepath, map_location="cpu", weights_only=False)
        wrapper = cls(
            target_name=checkpoint["target_name"],
            input_dim=checkpoint["input_dim"],
            horizon=checkpoint["horizon"],
            seq_len=checkpoint["seq_len"]
        )
        wrapper.model.load_state_dict(checkpoint["state_dict"])
        wrapper.mean_x = checkpoint["mean_x"]
        wrapper.std_x = checkpoint["std_x"]
        wrapper.mean_y = checkpoint["mean_y"]
        wrapper.std_y = checkpoint["std_y"]
        return wrapper
