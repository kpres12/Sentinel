"""
Simple in-memory message bus with topics and optional pydantic validators.
"""
from typing import Any, Awaitable, Callable, Dict, List, Optional
import asyncio

Subscriber = Callable[[str, Dict[str, Any]], Awaitable[None]]
Validator = Callable[[Dict[str, Any]], None]

class InMemoryBus:
    def __init__(self):
        self._subs: Dict[str, List[Subscriber]] = {}
        self._validators: Dict[str, Validator] = {}
        self._lock = asyncio.Lock()

    def set_validator(self, topic: str, validator: Validator):
        self._validators[topic] = validator

    async def publish(self, topic: str, message: Dict[str, Any]):
        # Validate if validator present
        validator = self._validators.get(topic)
        if validator:
            validator(message)
        async with self._lock:
            subs = list(self._subs.get(topic, []))
        # Fan-out without blocking publisher
        for sub in subs:
            asyncio.create_task(sub(topic, message))

    async def subscribe(self, topic: str, fn: Subscriber):
        async with self._lock:
            self._subs.setdefault(topic, []).append(fn)

    async def unsubscribe(self, topic: str, fn: Subscriber):
        async with self._lock:
            if topic in self._subs:
                self._subs[topic] = [s for s in self._subs[topic] if s != fn]
