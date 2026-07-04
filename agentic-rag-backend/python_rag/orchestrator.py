"""
Agentic Orchestrator
====================
Core orchestration logic for multi-section RAG system with autonomous
query decomposition, parallel retrieval, and intelligent synthesis.

Key Features:
- Autonomous section identification with detailed context
- Query decomposition with domain validation
- Parallel retrieval from multiple sources
- Fallback retrieval for ambiguous queries
- Result validation and synthesis

Author: RAG Research Team
Date: November 2025
"""

import logging
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

from llm_utils import LLMManager
from retriever import Retriever
from validation import ResultValidator

logger = logging.getLogger(__name__)


class AgenticOrchestrator:
    """
    Main orchestrator for agentic RAG workflow.
    
    Coordinates query processing, retrieval, and synthesis with
    autonomous decision-making and parallel execution.
    """
    
    # Valid sections with detailed descriptions
    SECTION_DEFINITIONS = {
        'scholarship': 'MahaDBT scholarship/freeship registration, eligibility, documents, application/renewal, tracking status, and technical issues.',
        'fees_payment': 'Tuition/exam fee payments via student portal ERP/QR/UPI, receipts, loans, refunds, installment, accounts section procedures.',
        'studentportalerp': 'Student ERP features including attendance, fees structure n payment,print receipt.',
        'library': 'Library rules, timings, borrowing, fines, OPAC search, and access to digital resources like Knimbus/J-Gate/DELNET.',
        'exam_center': 'SPPU & PCU exam rules, exam forms, ATKT/year-down, carry forward, passing criteria, SGPA/CGPA, revaluation, results, and marksheets.',
        'admission': 'eligibility, admission requirements(documents) n process (FE/DSE)',
        'documents': 'Bonafide, fee structure, bus/rail/travel concessions, LC/TC, transcripts, and document verification/attestation services.',
        'main': 'Administrative staff, office hours n services, contact information, department heads, responsibilities, general admin'
    }

    
    # Sections that require web search augmentation
    WEB_SEARCH_SECTIONS = ['scholarship', 'exam_center']
    
    def __init__(self):
        """
        Initialize orchestrator with required components.
        
        Raises:
            Exception: If initialization of any component fails
        """
        logger.info("Initializing Agentic Orchestrator")
        
        try:
            self.llm_manager = LLMManager()
            logger.debug("LLM Manager initialized")
            
            self.retriever = Retriever()
            logger.debug("Retriever initialized")
            
            self.validator = ResultValidator()
            logger.debug("Result Validator initialized")
            
            logger.info("Orchestrator initialization complete")
            
        except Exception as e:
            logger.error(f"Failed to initialize orchestrator: {e}", exc_info=True)
            raise
    
    def process_query(self, user_query: str, conversation_history: List[Dict] = None) -> str:
        """
        Main entry point for query processing.
        
        Implements the full agentic workflow:
        1. Query validation and decomposition
        2. Parallel multi-section retrieval OR fallback retrieval
        3. Result validation
        4. Synthesis into final answer
        
        Args:
            user_query: User's natural language question
            conversation_history: Optional list of recent messages for context
            
        Returns:
            Final synthesized answer string
        """
        logger.info(f"Processing query: '{user_query}'")
        if conversation_history:
            logger.debug(f"Conversation history: {len(conversation_history)} messages")
        start_time = time.time()
        
        try:
            # Step 1: Decompose query and identify sections
            logger.debug("Step 1: Query decomposition")
            subqueries = self._decompose_query(user_query)
            
            # Check if empty dict (no relevant sections or out of domain)
            if not subqueries or subqueries == {}:
                logger.warning(f"No specific sections identified, using fallback retrieval")
                # Fallback: retrieve top 3 from entire collection
                section_results = self._fallback_retrieval(user_query)
            else:
                logger.info(f"Identified {len(subqueries)} sections: {list(subqueries.keys())}")
                # Step 2: Parallel retrieval from identified sections
                logger.debug("Step 2: Parallel retrieval")
                section_results = self._parallel_retrieval(subqueries)
            
            if not section_results:
                logger.warning("No results retrieved")
                return "I apologize, but I couldn't find relevant information to answer your query. Please try rephrasing or ask about college administration topics."
            
            # Step 3: Validate results (error detection and basic filtering)
            logger.debug("Step 3: Result validation")
            validated_results = self._validate_results(section_results)
            
            if not validated_results:
                logger.warning("No results passed validation")
                return "I found some information, but it appears to contain errors or may not be reliable. Please rephrase or contact the administration directly."
            
            # Step 4: Synthesize final answer (with conversation history)
            logger.debug("Step 4: Answer synthesis")
            final_answer = self._synthesize_answer(user_query, validated_results, conversation_history)
            
            elapsed_time = time.time() - start_time
            logger.info(f"Query processed successfully in {elapsed_time:.2f}s")
            
            return final_answer
            
        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            return f"I encountered an error while processing your request. Please try again or contact support."
    
    def process_query_with_contexts(self, userquery: str, conversation_history: List[Dict] = None):
        """
        Agentic workflow but returns both final answer and validated contexts
        for evaluation.
        
        Args:
            userquery: User's question
            conversation_history: Optional recent messages for context
            
        Returns:
            finalanswer: str
            contexts: List[str]  # all validated DB / web snippets used
        """
        import time

        logger.info(f"[EVAL] Processing query with contexts: {userquery}")
        if conversation_history:
            logger.debug(f"[EVAL] Conversation history: {len(conversation_history)} messages")
        starttime = time.time()
        try:
            # 1) Decomposition
            subqueries = self._decompose_query(userquery)

            # 2) Retrieval (parallel or fallback)
            if not subqueries or not subqueries:
                logger.info("[EVAL] No sections identified, using fallback retrieval")
                sectionresults = self._fallback_retrieval(userquery)
            else:
                logger.info(f"[EVAL] Identified {len(subqueries)} sections: {list(subqueries.keys())}")
                sectionresults = self._parallel_retrieval(subqueries)

            if not sectionresults:
                logger.warning("[EVAL] No results retrieved")
                return (
                    "I apologize, but I couldn't find relevant information to answer your query. "
                    "Please try rephrasing or ask about college administration topics.",
                    []
                )

            # 3) Validation
            validatedresults = self._validate_results(sectionresults)
            if not validatedresults:
                logger.warning("[EVAL] No results passed validation")
                return (
                    "I found some information, but it appears to contain errors or may not be reliable. "
                    "Please rephrase or contact the administration directly.",
                    []
                )

            # 3b) Collect contexts as plain strings
            contexts: list[str] = []
            for section, results in validatedresults.items():
                for result in results:
                    # try typical keys from retriever / web search
                    text = (
                        result.get("content")
                        or result.get("text")
                        or result.get("snippet")
                        or ""
                    )
                    if text:
                        contexts.append(text)

            # 4) Synthesis (with conversation history)
            finalanswer = self._synthesize_answer(userquery, validatedresults, conversation_history)
            elapsedtime = time.time() - starttime
            logger.info(f"[EVAL] Query processed in {elapsedtime:.2f}s with {len(contexts)} contexts")

            return finalanswer, contexts

        except Exception as e:
            logger.error(f"[EVAL] Error in process_query_with_contexts: {e}", exc_info=True)
            return (
                "I encountered an error while processing your request. "
                "Please try again or contact support.",
                []
            )

    def _decompose_query(self, user_query: str) -> Dict[str, str]:
        """
        Decompose user query into section-specific subqueries.
        
        Uses LLM with detailed section context to:
        - Validate query is within college/campus domain
        - Identify relevant sections
        - Generate optimized subqueries for each section
        
        Args:
            user_query: Original user question
            
        Returns:
            Dictionary mapping section names to subqueries, or {} if no match/out of domain
        """
        logger.debug("Decomposing query with LLM")
        
        try:
            result = self.llm_manager.decompose_query(
                user_query, 
                section_definitions=self.SECTION_DEFINITIONS
            )
            
            if not result or result == {}:
                logger.debug("Query identified as non-specific or out-of-domain")
                return {}
            
            logger.debug(f"Query decomposed into {len(result)} subqueries")
            for section, subquery in result.items():
                logger.debug(f"  {section}: '{subquery}'")
            
            return result
            
        except Exception as e:
            logger.error(f"Query decomposition failed: {e}", exc_info=True)
            # Fallback: return empty dict to trigger fallback retrieval
            logger.warning("Falling back to general retrieval due to decomposition error")
            return {}
    
    def _fallback_retrieval(self, user_query: str) -> Dict[str, List[Dict]]:
        """
        Fallback retrieval when no specific sections are identified.
        
        Retrieves top 3 chunks from entire collection without:
        - Section filtering
        - Web search
        
        Args:
            user_query: Original user question
            
        Returns:
            Dictionary with 'general' key containing top results
        """
        logger.info("Executing fallback retrieval (no section filter, no web search)")
        
        try:
            results = self.retriever.vector_search(
                query=user_query,
                section_name=None,  # No filtering
                top_k=3
            )
            
            if results:
                logger.debug(f"Fallback retrieval returned {len(results)} results")
                return {'general': results}
            else:
                logger.warning("Fallback retrieval returned no results")
                return {}
                
        except Exception as e:
            logger.error(f"Fallback retrieval failed: {e}", exc_info=True)
            return {}
    
    def _parallel_retrieval(self, subqueries: Dict[str, str]) -> Dict[str, List[Dict]]:
        """
        Execute parallel retrieval across multiple sections.
        
        For each section:
        - Performs vector search with metadata filtering
        - Optionally augments with web search (scholarship, exam_center)
        - Combines and returns results
        
        Args:
            subqueries: Dictionary of section -> subquery mappings
            
        Returns:
            Dictionary of section -> list of results
        """
        logger.debug(f"Starting parallel retrieval for {len(subqueries)} sections")
        
        section_results = {}
        
        with ThreadPoolExecutor(max_workers=len(subqueries)) as executor:
            # Submit all retrieval tasks
            future_to_section = {
                executor.submit(
                    self._retrieve_for_section, 
                    section, 
                    subquery
                ): section
                for section, subquery in subqueries.items()
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_section):
                section = future_to_section[future]
                try:
                    results = future.result(timeout=30)  # 30 second timeout per section
                    if results:
                        section_results[section] = results
                        logger.debug(f"Retrieved {len(results)} results from '{section}'")
                    else:
                        logger.debug(f"No results from '{section}'")
                        
                except Exception as e:
                    logger.error(f"Retrieval failed for section '{section}': {e}", exc_info=True)
        
        logger.info(f"Parallel retrieval complete: {len(section_results)} sections returned results")
        return section_results
    
    def _retrieve_for_section(self, section: str, subquery: str) -> List[Dict]:
        """
        Retrieve results for a single section.
        
        Args:
            section: Section name
            subquery: Optimized subquery for this section
            
        Returns:
            List of retrieved documents/chunks
        """
        logger.debug(f"Retrieving for section '{section}' with query: '{subquery}'")
        
        try:
            # Always perform vector search
            db_results = self.retriever.vector_search(
                query=subquery,
                section_name=section,
                top_k=3
            )
            
            logger.debug(f"Vector search returned {len(db_results)} results for '{section}'")
            
            # Conditionally perform web search
            web_results = []
            if section in self.WEB_SEARCH_SECTIONS:
                logger.debug(f"Performing web search for '{section}'")
                web_results = self.retriever.web_search(subquery, section)
                logger.debug(f"Web search returned {len(web_results)} results")
            
            # Combine results
            combined = self._combine_sources(db_results, web_results)
            logger.debug(f"Combined {len(combined)} total results for '{section}'")
            
            return combined
            
        except Exception as e:
            logger.error(f"Error retrieving for section '{section}': {e}", exc_info=True)
            return []
    
    def _combine_sources(self, db_results: List[Dict], web_results: List[Dict]) -> List[Dict]:
        """
        Combine database and web search results.
        
        Args:
            db_results: Results from vector search
            web_results: Results from web search
            
        Returns:
            Combined list with source attribution
        """
        combined = []
        
        # Add DB results with source tag
        for result in db_results:
            result['source_type'] = 'database'
            combined.append(result)
        
        # Add web results with source tag
        for result in web_results:
            result['source_type'] = 'web'
            combined.append(result)
        
        logger.debug(f"Combined {len(db_results)} DB + {len(web_results)} web = {len(combined)} total")
        return combined
    
    def _validate_results(self, section_results: Dict[str, List[Dict]]) -> Dict[str, List[Dict]]:
        """
        Validate all retrieved results.
        
        Filters out:
        - Results containing error indicators
        - Low-quality or irrelevant results (lightweight pre-filter)
        
        Args:
            section_results: Raw results from all sections
            
        Returns:
            Filtered results that passed validation
        """
        logger.debug("Validating retrieved results")
        
        validated = {}
        total_before = sum(len(results) for results in section_results.values())
        
        for section, results in section_results.items():
            validated_section_results = []
            
            for result in results:
                # Error detection
                if self.validator.contains_error(result):
                    logger.debug(f"Filtered out error result from '{section}'")
                    continue
                
                # Basic relevance check
                if self.validator.is_relevant(result):
                    validated_section_results.append(result)
                else:
                    logger.debug(f"Filtered out low-relevance result from '{section}'")
            
            if validated_section_results:
                validated[section] = validated_section_results
        
        total_after = sum(len(results) for results in validated.values())
        logger.info(f"Validation: {total_before} -> {total_after} results ({total_before - total_after} filtered)")
        
        return validated
    
    def _synthesize_answer(self, original_query: str, validated_results: Dict[str, List[Dict]], conversation_history: List[Dict] = None) -> str:
        """
        Synthesize final answer from validated results.
        
        Uses LLM to:
        - Combine information from multiple sections
        - Resolve conflicts
        - Generate natural, coherent response
        - Handle insufficient information cases
        
        Args:
            original_query: User's original question
            validated_results: Validated results from all sections
            conversation_history: Optional recent conversation for context
            
        Returns:
            Final synthesized answer
        """
        logger.debug("Synthesizing final answer")
        
        try:
            answer = self.llm_manager.synthesize_answer(
                query=original_query,
                section_results=validated_results,
                conversation_history=conversation_history
            )
            
            logger.debug(f"Synthesized answer length: {len(answer)} chars")
            return answer
            
        except Exception as e:
            logger.error(f"Answer synthesis failed: {e}", exc_info=True)
            # Fallback: return concatenated results
            return self._fallback_synthesis(validated_results)
    
    def _fallback_synthesis(self, validated_results: Dict[str, List[Dict]]) -> str:
        """
        Fallback synthesis when LLM synthesis fails.
        
        Simply concatenates results with section headers.
        
        Args:
            validated_results: Validated results
            
        Returns:
            Basic concatenated answer
        """
        logger.warning("Using fallback synthesis")
        
        answer_parts = ["Based on the available information:\n"]
        
        for section, results in validated_results.items():
            answer_parts.append(f"\n**{section.replace('_', ' ').title()}:**")
            for result in results[:2]:  # Limit to 2 per section
                content = result.get('content', result.get('text', ''))
                answer_parts.append(f"- {content[:200]}...")
        
        return "\n".join(answer_parts)
