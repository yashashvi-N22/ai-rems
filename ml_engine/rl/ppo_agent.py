import os
import math
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from typing import Tuple, List, Dict, Optional
from ml_engine.rl.microgrid_env import MicrogridGymEnv

class ActorCriticPPO(nn.Module):
    """
    PyTorch Continuous Action Space Actor-Critic Network for Microgrid Dispatch.
    """
    def __init__(self, state_dim: int = 8, action_dim: int = 1):
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(state_dim, 64),
            nn.Tanh(),
            nn.Linear(64, 64),
            nn.Tanh()
        )
        # Actor Head: Mean Action
        self.actor_mean = nn.Sequential(
            nn.Linear(64, action_dim),
            nn.Tanh()
        )
        self.actor_log_std = nn.Parameter(torch.zeros(1, action_dim))

        # Critic Head: State Value V(s)
        self.critic = nn.Sequential(
            nn.Linear(64, 1)
        )

    def forward(self, state: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        features = self.shared(state)
        mean = self.actor_mean(features)
        std = torch.exp(self.actor_log_std)
        value = self.critic(features)
        return mean, std, value

    def act(self, state: np.ndarray, deterministic: bool = True) -> float:
        self.eval()
        with torch.no_grad():
            s_tensor = torch.tensor(state, dtype=torch.float32).unsqueeze(0)
            mean, std, _ = self.forward(s_tensor)
            if deterministic:
                action = mean.item()
            else:
                dist = torch.distributions.Normal(mean, std)
                action = dist.sample().item()
        return float(np.clip(action, -1.0, 1.0))

class PPOInferenceAgent:
    def __init__(self, weights_path: Optional[str] = None):
        self.model = ActorCriticPPO(state_dim=8, action_dim=1)
        if weights_path and os.path.exists(weights_path):
            try:
                self.model.load_state_dict(torch.load(weights_path, map_location="cpu", weights_only=True))
                self.model.eval()
            except Exception:
                self._initialize_smart_weights()
        else:
            self._initialize_smart_weights()

    def _initialize_smart_weights(self):
        """Train or initialize policy with tariff-arbitrage prior."""
        env = MicrogridGymEnv()
        optimizer = optim.Adam(self.model.parameters(), lr=3e-4)
        
        # Fast 100-episode behavioral alignment
        self.model.train()
        for ep in range(150):
            obs, _ = env.reset()
            states, actions, rewards = [], [], []
            done = False
            while not done:
                s_t = torch.tensor(obs, dtype=torch.float32)
                mean, std, val = self.model(s_t.unsqueeze(0))
                dist = torch.distributions.Normal(mean, std)
                act = dist.sample()
                act_clipped = float(torch.clamp(act, -1.0, 1.0).item())

                next_obs, reward, terminated, truncated, _ = env.step(np.array([act_clipped], dtype=np.float32))
                done = terminated or truncated
                
                states.append(s_t)
                actions.append(act)
                rewards.append(reward)
                obs = next_obs

            # Policy gradient update step
            returns = []
            g = 0.0
            for r in reversed(rewards):
                g = r + 0.98 * g
                returns.insert(0, g)
            
            returns_t = torch.tensor(returns, dtype=torch.float32)
            states_t = torch.stack(states)
            actions_t = torch.stack(actions)

            means, stds, values = self.model(states_t)
            dist = torch.distributions.Normal(means, stds)
            log_probs = dist.log_prob(actions_t).sum(dim=-1)
            adv = returns_t - values.squeeze(-1)

            actor_loss = -(log_probs * adv.detach()).mean()
            critic_loss = nn.MSELoss()(values.squeeze(-1), returns_t)
            loss = actor_loss + 0.5 * critic_loss

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        self.model.eval()

    def predict_action(self, state: np.ndarray) -> float:
        return self.model.act(state, deterministic=True)

ppo_agent = PPOInferenceAgent()
