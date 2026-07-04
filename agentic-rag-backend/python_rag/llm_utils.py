"""
LLM Utilities Module
====================
Manages all LLM interactions including query decomposition,
validation, and answer synthesis with detailed section context.

Supports multiple LLM providers with fallback mechanisms.

Author: RAG Research Team
Date: November 2025
"""

import os
import json
import logging
from typing import Dict, List
from openai import OpenAI
# import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


def _sanitize(text: str) -> str:
    """Remove lone surrogate characters that cannot be encoded as UTF-8.
    
    Surrogate code points (U+D800–U+DFFF) appear in strings that were
    decoded with errors='surrogateescape', e.g. from mis-encoded source
    documents stored in MongoDB.  They cause a UnicodeEncodeError when
    httpx tries to JSON-encode the OpenAI request body.
    """
    if not isinstance(text, str):
        return text
    # Round-trip through UTF-8 replacing unencodable characters
    return text.encode('utf-8', errors='replace').decode('utf-8')


class LLMManager:
    """
    Manages LLM interactions for the agentic system.
    """
    
    def __init__(self, provider: str = "openai"):
        """
        Initialize LLM manager with specified provider.
        
        Args:
            provider: LLM provider ("openai", "gemini")
        """
        logger.info(f"Initializing LLM Manager with provider: {provider}")
        
        self.provider = provider
        
        try:
            if provider == "openai":
                api_key = os.getenv("GPT_API_KEY") or os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OpenAI API key (GPT_API_KEY or OPENAI_API_KEY) not found")
                self.client = OpenAI(api_key=api_key)
                self.model = "gpt-4o-mini"
                logger.debug(f"OpenAI client initialized with model: {self.model}")
                
            # elif provider == "gemini":
            #     api_key = os.getenv("GEMINI_API_KEY")
            #     if not api_key:
            #         raise ValueError("GEMINI_API_KEY not found")
            #     genai.configure(api_key=api_key)
            #     self.model = genai.GenerativeModel('gemini-pro')
            #     logger.debug("Gemini client initialized")
                
            else:
                raise ValueError(f"Unsupported provider: {provider}")
            
            logger.info("LLM Manager initialization complete")
            
        except Exception as e:
            logger.error(f"Failed to initialize LLM Manager: {e}", exc_info=True)
            raise
    
    def decompose_query(self, user_query: str, section_definitions: Dict[str, str]) -> Dict[str, str]:
        """
        Decompose user query into section-specific subqueries with detailed context.
        
        Args:
            user_query: Original user question
            section_definitions: Dictionary of section names to descriptions
            
        Returns:
            Dictionary mapping sections to subqueries, or {} if no match/out of domain
        """
        logger.debug(f"Decomposing query: '{user_query}'")
        
        # Build section context string
        section_context = "\n".join([
            f"- {name}: {description}" 
            for name, description in section_definitions.items()
        ])
        
        # Build comprehensive prompt
        prompt = f"""You are a query analyzer for a college administration assistant system.

**Available Knowledge Sections:**
{section_context}

**Your Task:**
Analyze the student query and determine which section(s) are relevant.

**Instructions:**
1. If the query is NOT related to college, campus, education or administration topics, return exactly an empty JSON object: {{}}
2. If the query IS related, identify the most relevant section(s) from the list above
3. For each relevant section, generate an optimized search subquery that will retrieve the best information

**Output Format:**
- Return ONLY valid JSON
- For out-of-domain queries: {{}}
- For relevant queries: {{"section_name": "optimized subquery", ...}}

**Examples:**

Query: "How do I apply for a scholarship?"
Response: {{"scholarship": "scholarship application process requirements eligibility"}}

Query: "What's the weather today?"
Response: {{}}

Query: "my scholarship application rejected what should i do and who to contact?"
Response: {{"scholarship": "MahaDBT scholarship rejected Application correction process, "main": "who to contact for scholarship application issues"}}

Query: "if I get year down due to backlogs will my MahaDBT scholarship continue next year?"
Response: {{"exam_center": "SPPU year down rules due to backlogs academic progression impact on next year admission","scholarship": "MahaDBT scholarship eligibility in case of year down or backlog repeat year"}}

Query: "how to pay fees in installment on student portal/ erp?"
Response: {{"fees_payment": "Paying College Fees in Installments", "studentportalerp": "Student Portal ERP Fee Payment Options"}}

**Student Query:** {user_query}

**Response (JSON only):**"""

        try:
            if self.provider == "openai":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a precise query analyzer. Return ONLY valid JSON or empty dict {{}}."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=500
                )
                result = response.choices[0].message.content.strip()
                
            # elif self.provider == "gemini":
            #     response = self.model.generate_content(prompt)
            #     result = response.text.strip()
            
            logger.debug(f"LLM response: {result}")
            
            # Parse response
            try:
                # Clean up response (remove markdown code blocks if present)
                result = result.replace("``````", "").strip()
                parsed = json.loads(result)
                
                if not parsed or parsed == {}:
                    logger.debug("Query classified as non-specific or out-of-domain (empty dict)")
                    return {}
                
                logger.debug(f"Parsed {len(parsed)} subqueries")
                return parsed
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM JSON response: {e}")
                logger.debug(f"Raw response: {result}")
                # Fallback: return empty dict to trigger fallback retrieval
                return {}
        
        except Exception as e:
            logger.error(f"Query decomposition failed: {e}", exc_info=True)
            # Fallback: return empty dict
            return {}
    
    def synthesize_answer(
        self, 
        query: str, 
        section_results: Dict[str, List[Dict]],
        conversation_history: List[Dict] = None
    ) -> str:
        """
        Synthesize final answer from multi-section results with insufficiency detection.
        
        Args:
            query: Original user query
            section_results: Retrieved and validated results per section
            conversation_history: Optional list of recent messages for context
            
        Returns:
            Synthesized natural language answer
        """
        logger.debug(f"Synthesizing answer for query: '{query}'")
        
        # Build conversation history context
        history_context = ""
        if conversation_history and len(conversation_history) > 0:
            history_context = "\n**Recent Conversation:**\n"
            for msg in conversation_history[-6:]:  # Last 3 exchanges (6 messages)
                role = "Student" if msg.get('role') == 'user' else "Assistant"
                content = _sanitize(msg.get('content', ''))[:200]  # Truncate long messages
                history_context += f"{role}: {content}\n"
            history_context += "\n"
        
        # Format context from results
        context_parts = []
        for section, results in section_results.items():
            context_parts.append(f"\n=== {section.upper()} ===")
            for i, result in enumerate(results[:3], 1):  # Max 3 per section
                content = result.get('content', result.get('text', ''))
                content = _sanitize(content)  # Strip any lone surrogate chars
                source_type = result.get('source_type', 'database')
                context_parts.append(f"{i}. [{source_type}] {content}")
        
        context = "\n".join(context_parts)
        
        # Build synthesis prompt with insufficiency handling
        prompt = f"""You are a helpful college administration assistant.
{history_context}
**Student Question:** {_sanitize(query)}

**Retrieved Information:**
{_sanitize(context)}

**Instructions:**
1. Answer the student's question directly and comprehensively using the retrieved information
2. **Use conversation history** to understand context if the current question refers to previous topics
3. **IMPORTANT:** If the retrieved information does NOT contain sufficient details to answer the question, respond with: "I don't have sufficient information in my knowledge base to answer this question completely. Please contact the administration office directly or visit the official website."
4. Do NOT invent details that are not supported by the retrieved information.
5. If different sections disagree, briefly mention both views in one short sentence.
6. Be concise but complete and to the point as possible.
7. Use a friendly, professional tone
8. If information is from web sources, mention it's current/recent

**Your Answer:**"""

        try:
            if self.provider == "openai":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a helpful college administration assistant. If context is insufficient, clearly state it."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=600
                )
                answer = response.choices[0].message.content.strip()
                
            # elif self.provider == "gemini":
            #     response = self.model.generate_content(prompt)
            #     answer = response.text.strip()
            
            logger.debug(f"Synthesized answer length: {len(answer)} chars")
            return answer
            
        except Exception as e:
            logger.error(f"Answer synthesis failed: {e}", exc_info=True)
            raise
            