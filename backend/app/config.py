from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    OPENAI_API_KEY: str
    SERPER_API_KEY: str
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    MODEL_NAME: str = "openai/gpt-5.4-mini"
    THINKING_LEVEL: str = "off"


settings = Settings()


# Maps normalized thinking levels to provider-specific parameters
THINKING_MAP = {
    "openai": {
        "off": {"reasoning_effort": "none"},
        "low": {"reasoning_effort": "low"},
        "medium": {"reasoning_effort": "medium"},
        "high": {"reasoning_effort": "high"},
        "max": {"reasoning_effort": "xhigh"},
    },
    "anthropic": {
        "off": {},
        "low": {"thinking": {"type": "enabled", "budget_tokens": 2048}},
        "medium": {"thinking": {"type": "enabled", "budget_tokens": 8192}},
        "high": {"thinking": {"type": "enabled", "budget_tokens": 16384}},
        "max": {"thinking": {"type": "adaptive"}},
    },
    "google": {
        "off": {},
        "low": {"thinking_level": "LOW"},
        "medium": {"thinking_level": "MEDIUM"},
        "high": {"thinking_level": "HIGH"},
        "max": {"thinking_level": "HIGH"},
    },
}


def get_provider(model_name: str) -> str:
    if model_name.startswith("openai/"):
        return "openai"
    if model_name.startswith("anthropic/"):
        return "anthropic"
    if model_name.startswith("google/"):
        return "google"
    return "openai"


def get_thinking_params(model_name: str, thinking_level: str) -> dict:
    provider = get_provider(model_name)
    provider_map = THINKING_MAP.get(provider, {})
    return provider_map.get(thinking_level, {})
