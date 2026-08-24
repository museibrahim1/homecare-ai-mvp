"""Tests for Anthropic SDK compatibility helpers."""

from unittest.mock import MagicMock

from app.services.anthropic_compat import create_message


def test_create_message_moves_temperature_to_extra_body():
    client = MagicMock()
    client.messages.create.return_value = "ok"

    result = create_message(
        client,
        model="claude-sonnet-4-6",
        max_tokens=100,
        messages=[{"role": "user", "content": "hi"}],
        temperature=0.2,
    )

    assert result == "ok"
    client.messages.create.assert_called_once()
    kwargs = client.messages.create.call_args.kwargs
    assert "temperature" not in kwargs
    assert kwargs["extra_body"] == {"temperature": 0.2}


def test_create_message_without_sampling_params():
    client = MagicMock()
    client.messages.create.return_value = "ok"

    create_message(
        client,
        model="claude-sonnet-4-6",
        max_tokens=100,
        messages=[{"role": "user", "content": "hi"}],
    )

    kwargs = client.messages.create.call_args.kwargs
    assert "extra_body" not in kwargs
    assert "temperature" not in kwargs
