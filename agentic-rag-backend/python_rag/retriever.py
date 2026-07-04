"""
Retriever Module
================
Handles all retrieval operations including vector search from MongoDB
and web search augmentation for time-sensitive sections.

Features:
- Vector similarity search with metadata filtering (Local SentenceTransformer Embeddings)
- Tavily web search integration
- Result formatting and normalization

Author: RAG Research Team
Date: November 2025
"""

import os
import logging
from typing import List, Dict, Optional
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)



class Retriever:
    """
    Handles vector search and web search retrieval operations.
    """
    
    # Database configuration
    DB_NAME = "FYP"
    COLLECTION_NAME = "Main"
    # Using local SentenceTransformer (all-MiniLM-L6-v2) index
    INDEX_NAME = "mainindex"
    EMBEDDING_FIELD = "embedding"
    
    
    def __init__(self, db_client=None, embedding_model=None):
        """
        Initialize retriever with database and local embedding model.
        
        Args:
            db_client: Optional MongoDB client (for dependency injection)
            embedding_model: Optional SentenceTransformer model (for dependency injection)
        """
        logger.info("Initializing Retriever (Local SentenceTransformer Embeddings)")
        
        try:
            # Initialize MongoDB connection
            if db_client is None:
                mongo_uri = os.getenv("MONGODB_URI")
                if not mongo_uri:
                    raise ValueError("MONGODB_URI not found in environment variables")
                self.client = MongoClient(mongo_uri)
                logger.debug(f"Connected to MongoDB")
            else:
                self.client = db_client
                logger.debug("Using injected MongoDB client")
            
            self.collection = self.client[self.DB_NAME][self.COLLECTION_NAME]
            logger.debug(f"Using collection: {self.DB_NAME}.{self.COLLECTION_NAME}")
            
            # Initialize local SentenceTransformer embedding model
            if embedding_model is None:
                logger.info("Loading local SentenceTransformer model: all-MiniLM-L6-v2")
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.debug("Local embedding model loaded (dim=384)")
            else:
                self.embedding_model = embedding_model
                logger.debug("Using injected embedding model")
            
            logger.info("Retriever initialization complete")
            
        except Exception as e:
            logger.error(f"Failed to initialize Retriever: {e}", exc_info=True)
            raise


    def vector_search(
        self, 
        query: str, 
        section_name: Optional[str] = None, 
        top_k: int = 3
    ) -> List[Dict]:
        """
        Perform vector similarity search with optional section filtering.
        
        Args:
            query: Search query text
            section_name: Optional section name for metadata filtering (None = no filter)
            top_k: Number of results to return
            
        Returns:
            List of retrieved documents with content and metadata
        """
        logger.debug(f"Vector search: query='{query}', section={section_name}, top_k={top_k}")
        
        try:
            # Generate query embedding using local SentenceTransformer
            query_embedding = self.embedding_model.encode(query)
            if hasattr(query_embedding, 'tolist'):
                query_embedding = query_embedding.tolist()
            logger.debug(f"Generated embedding vector (dim={len(query_embedding)})")
            
            # Build aggregation pipeline
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": self.INDEX_NAME,
                        "path": self.EMBEDDING_FIELD,
                        "queryVector": query_embedding,
                        "numCandidates": 100,
                        "limit": top_k
                    }
                },
                {
                    "$project": {
                        "section_name": 1,
                        "content": 1,
                        "metadata": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            
            # Add section filter if specified
            if section_name:
                pipeline[0]["$vectorSearch"]["filter"] = {
                    "section_name": {"$eq": section_name}
                }
                logger.debug(f"Applied section filter: {section_name}")
            else:
                logger.debug("No section filter applied (searching entire collection)")
            
            # Execute search
            results = list(self.collection.aggregate(pipeline))
            logger.debug(f"Vector search returned {len(results)} results")
            
            # Format results
            formatted_results = []
            for result in results:
                formatted_results.append({
                    'content': result.get('content', ''),
                    'section': result.get('section_name', section_name or 'general'),
                    'score': result.get('score', 0.0),
                    'metadata': result.get('metadata', {})
                })
            
            logger.info(f"Vector search complete: {len(formatted_results)} results")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}", exc_info=True)
            return []
    
    def web_search(self, query: str, section: str, num_results: int = 3) -> List[Dict]:
        """
        Perform web search using Tavily API for time-sensitive information.
        
        Currently supports scholarship and exam_center sections.
        
        Args:
            query: Search query
            section: Section context for search refinement
            num_results: Number of web results to retrieve
            
        Returns:
            List of web search results with snippets
        """
        logger.debug(f"Web search: query='{query}', section={section}, num={num_results}")
        
        try:
            # Get Tavily API key
            tavily_api_key = os.getenv("TAVILY_API_KEY")
            if not tavily_api_key:
                logger.warning("TAVILY_API_KEY not found in environment, skipping web search")
                return []
            
            # Import Tavily client
            try:
                from tavily import TavilyClient
            except ImportError:
                logger.error("Tavily package not installed. Install with: pip install tavily-python")
                return []
            
            # Refine query with section context
            refined_query = f"{query} college campus {section.replace('_', ' ')}"
            logger.debug(f"Refined query: '{refined_query}'")
            
            # Perform Tavily search
            results = self._tavily_search(refined_query, tavily_api_key, num_results)
            
            logger.info(f"Web search complete: {len(results)} results")
            logger.info(f"Web search results: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Web search failed: {e}", exc_info=True)
            return []
    
    def _tavily_search(self, query: str, api_key: str, num_results: int) -> List[Dict]:
        """
        Perform search using Tavily API.
        
        Args:
            query: Search query
            api_key: Tavily API key
            num_results: Number of results
            
        Returns:
            List of formatted search results
        """
        logger.debug("Calling Tavily API")
        
        try:
            from tavily import TavilyClient
            
            # Initialize Tavily client
            client = TavilyClient(api_key=api_key)
            
            # Perform search
            response = client.search(
                query=query,
                max_results=num_results,
                search_depth="basic",  # Options: "basic" or "advanced"
                include_answer=False,
                include_raw_content=False
            )
            
            # Format results
            results = []
            for item in response.get('results', [])[:num_results]:
                results.append({
                    'content': item.get('content', ''),
                    'title': item.get('title', ''),
                    'url': item.get('url', ''),
                    'source': 'web',
                    'score': item.get('score', 0.0)
                })
            
            logger.debug(f"Tavily API returned {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Tavily API call failed: {e}", exc_info=True)
            return []
    
    def __del__(self):
        """Cleanup: Close MongoDB connection."""
        try:
            if hasattr(self, 'client'):
                self.client.close()
                logger.debug("MongoDB connection closed")
        except:
            pass
