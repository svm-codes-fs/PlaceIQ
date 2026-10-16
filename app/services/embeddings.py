"""
Text embeddings for semantic job matching (384 dimensions, stored in pgvector).

Backends (EMBEDDING_BACKEND):
- "fastembed": BAAI/bge-small-en-v1.5 running locally on CPU via ONNX; no API
  calls or costs. The model (~130 MB) downloads on first use.
- "hash": a deterministic feature-hashing embedder (words, bigrams and
  canonical skills). Weaker semantically, but instant and offline; used by the
  test suite and as a fallback.
- "auto" (default): fastembed when it loads, otherwise hash.

Every stored vector records the model that produced it, so switching backends
re-embeds lazily instead of comparing vectors from different models.
"""
import hashlib
import logging
import math
import re
import threading

from flask import current_app

from app.models.vector import EMBEDDING_DIM
from app.services.skills import find_skills

log = logging.getLogger(__name__)

FASTEMBED_MODEL = 'BAAI/bge-small-en-v1.5'
HASH_MODEL = f'hash-{EMBEDDING_DIM}-v1'

_lock = threading.Lock()
_fastembed = None
_fastembed_failed = False


def _load_fastembed():
    global _fastembed, _fastembed_failed
    if _fastembed or _fastembed_failed:
        return _fastembed
    with _lock:
        if _fastembed or _fastembed_failed:
            return _fastembed
        try:
            from fastembed import TextEmbedding
            _fastembed = TextEmbedding(FASTEMBED_MODEL, cache_dir=current_app.config.get('FASTEMBED_CACHE_DIR'))
        except Exception:
            log.exception('fastembed unavailable; falling back to hash embeddings')
            _fastembed_failed = True
    return _fastembed


def model_name():
    """Name of the embedding model currently in use."""
    backend = current_app.config.get('EMBEDDING_BACKEND', 'auto')
    if backend == 'hash':
        return HASH_MODEL
    if _load_fastembed():
        return FASTEMBED_MODEL
    if backend == 'fastembed':
        raise RuntimeError('EMBEDDING_BACKEND=fastembed but fastembed could not be loaded')
    return HASH_MODEL


def embed(texts):
    """Embed a list of texts; returns (model_name, list of unit-length vectors)."""
    name = model_name()
    if name == FASTEMBED_MODEL:
        vectors = [[float(x) for x in v] for v in _fastembed.embed(list(texts))]
    else:
        vectors = [hash_embed(t) for t in texts]
    return name, vectors


def _tokens(text):
    words = re.findall(r'[a-z0-9+#.]+', text.lower())
    words = [w.strip('.') for w in words if len(w.strip('.')) > 1 or w in ('c', 'r')]
    features = list(words)
    features += [f'{a} {b}' for a, b in zip(words, words[1:])]
    # Canonical skills count extra, so "ReactJS" and "React" land close together
    features += [f'skill:{s.lower()}' for s in find_skills(text) for _ in range(3)]
    return features


def hash_embed(text):
    vector = [0.0] * EMBEDDING_DIM
    for feature in _tokens(text or ''):
        digest = hashlib.blake2b(feature.encode(), digest_size=8).digest()
        index = int.from_bytes(digest[:4], 'little') % EMBEDDING_DIM
        sign = 1.0 if digest[4] & 1 else -1.0
        vector[index] += sign
    norm = math.sqrt(sum(x * x for x in vector)) or 1.0
    return [x / norm for x in vector]


def cosine(a, b):
    if a is None or b is None:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)
