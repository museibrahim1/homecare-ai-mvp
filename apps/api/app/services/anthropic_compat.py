"""Anthropic SDK v1 compatibility helpers.

SDK 1.0 removed ``temperature``, ``top_p``, and ``top_k`` from
``messages.create()`` signatures. Pass sampling params through
``extra_body`` when needed, or omit them for current models.
"""

from __future__ import annotations

from typing import Any


def create_message(client: Any, **kwargs: Any) -> Any:
    """Call ``client.messages.create`` with SDK 1.x-safe sampling params."""
    temperature = kwargs.pop("temperature", None)
    top_p = kwargs.pop("top_p", None)
    top_k = kwargs.pop("top_k", None)

    extra_body = dict(kwargs.pop("extra_body", None) or {})
    if temperature is not None:
        extra_body.setdefault("temperature", temperature)
    if top_p is not None:
        extra_body.setdefault("top_p", top_p)
    if top_k is not None:
        extra_body.setdefault("top_k", top_k)
    if extra_body:
        kwargs["extra_body"] = extra_body

    return client.messages.create(**kwargs)
