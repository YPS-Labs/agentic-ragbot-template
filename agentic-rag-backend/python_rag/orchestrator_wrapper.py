"""
Python Orchestrator Wrapper
============================
CLI interface for Node.js to execute the agentic RAG pipeline.

This wrapper:
1. Accepts query and userId as command-line arguments
2. Executes the orchestrator pipeline
3. Returns JSON response to stdout for Node.js consumption
4. Logs errors to file for debugging

Usage:
    python orchestrator_wrapper.py --query "What are admission requirements?" --userId "user123"
"""

import sys
import json
import logging
import argparse
from pathlib import Path

# Add parent directory to path to import orchestrator
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import AgenticOrchestrator

# Setup logging to file (not stdout, to avoid interfering with JSON output)
log_file = Path(__file__).parent.parent / 'logs' / 'python_bridge.log'
log_file.parent.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stderr) #line will display the log in the console of azure 
    ]
)

logger = logging.getLogger(__name__)

# Singleton orchestrator instance for performance
_orchestrator_instance = None


def get_orchestrator():
    """
    Get or create orchestrator singleton instance.
    Reusing the instance avoids re-initializing LLM/embedding models.
    """
    global _orchestrator_instance
    
    if _orchestrator_instance is None:
        logger.info("Initializing AgenticOrchestrator...")
        _orchestrator_instance = AgenticOrchestrator()
        logger.info("AgenticOrchestrator initialized successfully")
    
    return _orchestrator_instance


def process_query(query, user_id=None, conversation_history=None):
    """
    Process user query through the agentic RAG pipeline.
    
    Args:
        query: User query string
        user_id: Optional user identifier
        conversation_history: Optional list of recent messages for context
        
    Returns:
        dict: Response containing answer, contexts, and metadata
    """
    try:
        logger.info(f"Processing query (userId: {user_id}, length: {len(query)}, history: {len(conversation_history) if conversation_history else 0})")
        
        # Get orchestrator instance
        orchestrator = get_orchestrator()
        
        # Execute pipeline with contexts and conversation history
        answer, contexts = orchestrator.process_query_with_contexts(query, conversation_history)
        
        logger.info(f"Query processed successfully (contexts: {len(contexts)})")
        
        return {
            "success": True,
            "answer": answer,
            "contexts": contexts,
            "userId": user_id,
            "query": query,
            "metadata": {
                "contextsCount": len(contexts),
                "queryLength": len(query),
                "historyLength": len(conversation_history) if conversation_history else 0,
            }
        }
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}", exc_info=True)
        raise


def main():
    """
    Main entry point for CLI execution.
    """
    parser = argparse.ArgumentParser(
        description='Execute Agentic RAG pipeline for a user query'
    )
    parser.add_argument(
        '--query',
        type=str,
        required=False,
        help='User query to process (required unless in interactive mode)'
    )
    parser.add_argument(
        '--userId',
        type=str,
        default='anonymous',
        help='User identifier (optional)'
    )
    
    parser.add_argument(
        '--interactive',
        action='store_true',
        help='Run in interactive mode (read queries from stdin)'
    )
    
    args = parser.parse_args()

    # Interactive mode
    if args.interactive:
        logger.info("Starting interactive mode")
        
        # Initialize orchestrator once at startup
        try:
            get_orchestrator()
            print(json.dumps({"success": True, "message": "Ready"}))
            sys.stdout.flush()
        except Exception as e:
            logger.error(f"Failed to initialize in interactive mode: {e}", exc_info=True)
            print(json.dumps({
                "success": False, 
                "error": {"message": str(e), "code": "INIT_ERROR"}
            }))
            sys.stdout.flush()
            sys.exit(1)

        # Loop reading lines from stdin
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                data = json.loads(line)
                query = data.get('query')
                user_id = data.get('userId', 'anonymous')
                conversation_history = data.get('conversationHistory', [])
                
                if not query:
                    raise ValueError("Query missing")
                    
                result = process_query(query, user_id, conversation_history)
                print(json.dumps(result))
                sys.stdout.flush()
                
            except json.JSONDecodeError:
                error = {
                    "success": False, 
                    "error": {"message": "Invalid JSON input", "code": "JSON_ERROR"}
                }
                print(json.dumps(error))
                sys.stdout.flush()
                
            except Exception as e:
                error = {
                    "success": False, 
                    "error": {"message": str(e), "code": "PROCESS_ERROR"}
                }
                print(json.dumps(error))
                sys.stdout.flush()
                
        logger.info("Interactive mode ended")
        sys.exit(0)
                        
    # One-shot mode (legacy)
    # Validate query
    if not args.query or not args.query.strip():
        # ... existing logic ...
        error_response = {
            "success": False,
            "error": {
                "message": "Query cannot be empty",
                "code": "VALIDATION_ERROR"
            }
        }
        print(json.dumps(error_response))
        sys.exit(1)
    
    try:
        # Process query
        result = process_query(args.query.strip(), args.userId)
        
        # Output JSON to stdout
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        # Return error as JSON
        error_response = {
            "success": False,
            "error": {
                "message": str(e),
                "code": "PYTHON_EXECUTION_ERROR",
                "type": type(e).__name__
            }
        }
        print(json.dumps(error_response))
        sys.exit(1)


if __name__ == "__main__":
    main()
