import pytest
import numpy as np
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings
from ml_engine.rl.microgrid_env import MicrogridGymEnv
from ml_engine.rl.ppo_agent import ppo_agent
from ml_engine.explainability.shap_explainer import shap_engine

def test_rl_gym_environment():
    """Verify standard Gymnasium API adherence for MicrogridGymEnv."""
    env = MicrogridGymEnv()
    obs, info = env.reset()
    assert obs.shape == (8,)
    assert 0.0 <= info["soc"] <= 100.0

    action = np.array([0.5], dtype=np.float32) # 50% discharge
    next_obs, reward, terminated, truncated, step_info = env.step(action)
    assert next_obs.shape == (8,)
    assert isinstance(reward, float)
    assert "battery_power_kw" in step_info
    assert step_info["battery_soc_pct"] <= 100.0

def test_rl_ppo_agent_inference():
    """Verify PyTorch continuous Actor-Critic PPO inference."""
    state = np.array([65.0, 80.0, 45.0, 70.0, 7.50, 0.0, 1.0, 0.82], dtype=np.float32)
    action = ppo_agent.predict_action(state)
    assert -1.0 <= action <= 1.0

def test_xai_shap_global_and_local():
    """Verify TreeSHAP global feature rankings and local waterfall breakdown."""
    global_solar = shap_engine.get_global_feature_importance("solar")
    assert len(global_solar) > 0
    assert global_solar[0]["feature"] == "direct_normal_irradiance_wm2"
    assert global_solar[0]["importance_score"] > 0.40

    local_noon = shap_engine.get_local_waterfall("solar", hour_index=12)
    assert local_noon["hour_index"] == 12
    assert "drivers" in local_noon
    assert len(local_noon["drivers"]) > 0

@pytest.mark.asyncio
async def test_rl_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Benchmark
        res_bench = await client.get(f"{settings.API_V1_STR}/rl/benchmark")
        assert res_bench.status_code == 200
        assert res_bench.json()["success"] is True
        assert "strategies" in res_bench.json()["data"]

        # Dispatch
        res_disp = await client.post(f"{settings.API_V1_STR}/rl/dispatch")
        assert res_disp.status_code == 200
        assert res_disp.json()["success"] is True
        assert len(res_disp.json()["data"]) == 24

@pytest.mark.asyncio
async def test_xai_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Global
        res_glob = await client.get(f"{settings.API_V1_STR}/xai/global-importance?domain=solar")
        assert res_glob.status_code == 200
        assert res_glob.json()["success"] is True
        assert len(res_glob.json()["data"]) > 0

        # Local
        res_loc = await client.get(f"{settings.API_V1_STR}/xai/local-waterfall?domain=solar&hour_index=12")
        assert res_loc.status_code == 200
        assert res_loc.json()["success"] is True
        assert res_loc.json()["data"]["hour_index"] == 12

@pytest.mark.asyncio
async def test_assistant_chat_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "message": "Why is the battery charging right now?",
            "conversation_history": []
        }
        res = await client.post(f"{settings.API_V1_STR}/assistant/chat", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "response" in data["data"]
        assert len(data["data"]["suggested_followups"]) > 0
        assert "grounded_context_used" in data["data"]
