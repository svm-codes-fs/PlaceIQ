"""
Embedding column type: pgvector's VECTOR on PostgreSQL (indexed with HNSW for
nearest-neighbour search), a JSON list of floats on SQLite.
"""
from pgvector.sqlalchemy import Vector

from app.extensions import db

EMBEDDING_DIM = 384

EmbeddingType = Vector(EMBEDDING_DIM).with_variant(db.JSON(), 'sqlite')
