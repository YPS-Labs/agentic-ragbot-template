"""
Result Validation Module
========================
Validates retrieved results for errors and basic relevance
to campus/college administration domain.

Features:
- Error detection (primary filter)
- Lightweight relevance checking (secondary filter)
- Quality filtering

Author: RAG Research Team
Date: November 2025
"""

import logging
import re
from typing import Dict

logger = logging.getLogger(__name__)


class ResultValidator:
    """
    Validates retrieved results for errors and relevance.
    """
    
    # Error indicators (primary filter)
    ERROR_INDICATORS = [
        "error occurred",
        "could not find",
        "no information available",
        "failed to retrieve",
        "connection error",
        "timeout",
        "not found",
        "unavailable",
        "service unavailable",
        "internal error"
    ]
    
    # Keywords indicating campus/college relevance (lightweight secondary filter)
    # Keywords indicating campus/college relevance (lightweight secondary filter)
    CAMPUS_KEYWORDS = [
    # generic academic / institution
    "college", "university", "campus", "institute", "department",
    "faculty", "staff", "office", "administration", "principal",
    "registrar", "student section", "accounts section", "exam section",

    # student lifecycle
    "student", "admission", "enrollment", "registration", "eligibility",
    "semester", "year down", "carry forward", "atkt", "pattern 2019",
    "pattern 2024", "nep", "fe", "se", "te", "be",

    # exams
    "exam", "examination", "exam form", "hall ticket", "revaluation",
    "photocopy", "result", "marksheet", "sgpa", "cgpa",

    # money / fees / scholarship
    "fee", "fees", "payment", "refund", "loan", "scholarship",
    "freeship", "mahadbt", "social welfare", "income certificate",

    # documents & certificates
    "document", "certificate", "bonafide", "leaving certificate",
    "transfer certificate", "transcript", "attestation", "verification",

    # infra & services
    "library", "reading hall", "hostel", "timetable", "attendance",
    "internal marks", "grade card", "erp", "portal",
    ]
    # Section-specific keywords for finer relevance
    SECTION_KEYWORDS = {
    "main": [
        "office hours", "working hours", "even saturday",
        "student section", "accounts section", "exam section",
        "principal", "registrar", "executive director",
        "complaint", "suggestion box", "service timeline",
        "college code", "dte code", "aicte", "aishe",
    ],
    "admission": [
        "cap", "cet", "jee", "allotment letter", "seat acceptance",
        "admission form", "provisional admission", "final admission",
        "document verification", "abc id", "erp number",
        "anti ragging", "migration certificate", "domicile",
        "caste certificate", "caste validity", "ews", "non creamy layer",
    ],
    "documents": [
        "bonafide certificate", "fee structure certificate",
        "railway concession", "bus pass", "travel concession",
        "leaving certificate", "lc", "transfer certificate", "tc",
        "transcript", "attestation", "document verification",
        "general register",
    ],
    "exam_center": [
        "sppu", "exam form", "exam portal", "unipune",
        "backlog", "kt", "atkt", "carry forward", "year down",
        "in-sem", "end-sem", "ese", "cce",
        "sgpa", "cgpa", "revaluation", "photocopy",
        "exam result", "marksheet", "exam timetable",
    ],
    "fees_payment": [
        "fee receipt", "erp receipt", "exam fee",
        "qr code", "upi", "transaction id",
        "fee entry register", "accounts section",
        "educational loan", "disbursement", "refund",
        "installment", "part payment", "scholarship adjustment",
    ],
    "scholarship": [
        "mahadbt", "freeship", "scholarship",
        "post-matric", "sc", "obc", "vjnt", "sbc", "ebc", "minority",
        "income limit", "domicile of maharashtra",
        "cap admission", "application id",
        "send back", "scrutiny", "approved", "disbursed",
        "otp", "nodal officer", "helpline",
    ],
    "library": [
        "central library", "reading hall", "library timings",
        "book issue", "renewal", "fine", "late fee",
        "web opac", "opac", "knimbus", "j-gate", "delnet",
        "digital library", "question papers", "syllabus",
    ],
    "studentportal_erp": [
        "nmvpmerp", "student portal", "application id", "prn",
        "login", "forgot password", "change password",
        "attendance", "timetable", "internal marks",
        "exam form", "revaluation form", "fee details",
        "grade card", "result", "notices", "circulars", "grievance",
    ],
    }

    
    def __init__(self, relevance_threshold: float = 0.1):
        """
        Initialize validator with configuration.
        
        Args:
            relevance_threshold: Minimum relevance score (0-1) for secondary filter
        """
        logger.info(f"Initializing Result Validator (threshold={relevance_threshold})")
        self.relevance_threshold = relevance_threshold
    
    def contains_error(self, result: Dict) -> bool:
        """
        Check if a result contains error indicators (primary filter).
        
        Args:
            result: Result dictionary with 'content' field
            
        Returns:
            True if error detected, False otherwise
        """
        content = result.get('content', result.get('text', '')).lower()
        
        if not content:
            logger.debug("Empty content, marking as error")
            return True
        
        # Check for error indicators
        for error_phrase in self.ERROR_INDICATORS:
            if error_phrase in content:
                logger.debug(f"Error detected: '{error_phrase}'")
                return True
        
        return False
    
    def score_relevance(self, result: Dict) -> Dict:
        """
        Compute global and section-specific relevance signals for a result.

        Returns:
        - global_hits / section_hits: integer counts
        - global_score / section_score: ratios (for logging/debugging only)
        - matched_global / matched_section: the actual keywords hit
        - section_name: from result (if any)
        """
        content = result.get("content", result.get("text", "")).lower()
        if not content or len(content) < 20:
            return {
                "global_hits": 0,
                "section_hits": 0,
                "global_score": 0.0,
                "section_score": 0.0,
                "matched_global": [],
                "matched_section": [],
                "section_name": result.get("section_name"),
            }

        # Global campus keyword hits
        matched_global = [kw for kw in self.CAMPUS_KEYWORDS if kw in content]
        global_hits = len(matched_global)
        global_score = (
            global_hits / len(self.CAMPUS_KEYWORDS) if self.CAMPUS_KEYWORDS else 0.0
        )

        # Section-specific hits
        section_name = result.get("section_name")
        matched_section = []
        section_hits = 0
        section_score = 0.0

        if section_name and section_name in self.SECTION_KEYWORDS:
            section_kw = self.SECTION_KEYWORDS[section_name]
            matched_section = [kw for kw in section_kw if kw in content]
            section_hits = len(matched_section)
            section_score = section_hits / len(section_kw) if section_kw else 0.0

        return {
            "global_hits": global_hits,
            "section_hits": section_hits,
            "global_score": global_score,
            "section_score": section_score,
            "matched_global": matched_global,
            "matched_section": matched_section,
            "section_name": section_name,
        }

    
    def is_relevant(self, result: Dict) -> bool:
        """
        Lightweight relevance check (secondary filter).

        Uses hit counts for robustness (not sensitive to keyword list length),
        with ratios only for logging/debugging.
        """
        scores = self.score_relevance(result)

        g_hits = scores["global_hits"]
        s_hits = scores["section_hits"]
        g_score = scores["global_score"]
        s_score = scores["section_score"]
        section_name = scores["section_name"]

        # Main gating logic:
        # - Pass if we see at least 2 global hits, OR
        # - Pass if we see at least 1 section-specific hit
        is_relevant = (g_hits >= 2) or (s_hits >= 1)

        if is_relevant:
            logger.debug(
                "Result relevant "
                f"(g_hits={g_hits}, s_hits={s_hits}, "
                f"g_score={g_score:.3f}, s_score={s_score:.3f}, "
                f"section_name={section_name}, "
                f"global_samples={scores['matched_global'][:3]}, "
                f"section_samples={scores['matched_section'][:3]})"
            )
        else:
            logger.debug(
                "Result not relevant "
                f"(g_hits={g_hits}, s_hits={s_hits}, "
                f"g_score={g_score:.3f}, s_score={s_score:.3f}, "
                f"section_name={section_name})"
            )

        return is_relevant



