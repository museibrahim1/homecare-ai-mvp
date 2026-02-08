"""
Secretary of State Verification Service

Verifies business registration against state records using OpenCorporates API.
Supports all 50 US states.
"""

import os
import logging
import asyncio
import httpx
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# OpenCorporates API base URL
OPENCORPORATES_BASE_URL = "https://api.opencorporates.com/v0.4"

# State code to jurisdiction mapping for OpenCorporates
STATE_JURISDICTIONS = {
    "AL": "us_al", "AK": "us_ak", "AZ": "us_az", "AR": "us_ar", "CA": "us_ca",
    "CO": "us_co", "CT": "us_ct", "DE": "us_de", "FL": "us_fl", "GA": "us_ga",
    "HI": "us_hi", "ID": "us_id", "IL": "us_il", "IN": "us_in", "IA": "us_ia",
    "KS": "us_ks", "KY": "us_ky", "LA": "us_la", "ME": "us_me", "MD": "us_md",
    "MA": "us_ma", "MI": "us_mi", "MN": "us_mn", "MS": "us_ms", "MO": "us_mo",
    "MT": "us_mt", "NE": "us_ne", "NV": "us_nv", "NH": "us_nh", "NJ": "us_nj",
    "NM": "us_nm", "NY": "us_ny", "NC": "us_nc", "ND": "us_nd", "OH": "us_oh",
    "OK": "us_ok", "OR": "us_or", "PA": "us_pa", "RI": "us_ri", "SC": "us_sc",
    "SD": "us_sd", "TN": "us_tn", "TX": "us_tx", "UT": "us_ut", "VT": "us_vt",
    "VA": "us_va", "WA": "us_wa", "WV": "us_wv", "WI": "us_wi", "WY": "us_wy",
    "DC": "us_dc",
}


class SOSVerificationService:
    """
    Service for verifying businesses against Secretary of State records.
    
    Uses OpenCorporates API for searching business registrations across all 50 states.
    Falls back to manual verification queue if API is unavailable.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENCORPORATES_API_KEY")
        self.base_url = OPENCORPORATES_BASE_URL
    
    async def verify_business(
        self,
        business_name: str,
        state: str,
        registration_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify a business against Secretary of State records.
        
        Args:
            business_name: Legal name of the business
            state: Two-letter state code (e.g., "NE", "IA")
            registration_number: Optional state registration/file number
            
        Returns:
            Dictionary with verification results
        """
        state = state.upper()
        
        if state not in STATE_JURISDICTIONS:
            return {
                "found": False,
                "error": f"Invalid state code: {state}",
            }
        
        jurisdiction = STATE_JURISDICTIONS[state]
        
        try:
            # If we have a registration number, try direct lookup first
            if registration_number:
                result = await self._lookup_by_number(jurisdiction, registration_number)
                if result and result.get("found"):
                    return result
            
            # Search by name
            result = await self._search_by_name(business_name, jurisdiction)
            return result
            
        except Exception as e:
            logger.error(f"SOS verification error: {e}")
            return {
                "found": False,
                "error": str(e),
                "requires_manual_review": True,
            }
    
    async def _lookup_by_number(
        self, 
        jurisdiction: str, 
        registration_number: str,
        max_retries: int = 2,
        retry_delay: float = 2.0,
    ) -> Optional[Dict[str, Any]]:
        """Look up company by registration number with retry logic."""
        url = f"{self.base_url}/companies/{jurisdiction}/{registration_number}"
        params = {}
        if self.api_key:
            params["api_token"] = self.api_key
        
        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, params=params, timeout=30.0)
                    
                    if response.status_code == 200:
                        data = response.json()
                        company = data.get("results", {}).get("company", {})
                        return self._format_company_result(company)
                    elif response.status_code == 404:
                        return None
                    else:
                        logger.warning(
                            f"OpenCorporates lookup failed (attempt {attempt}/{max_retries}): "
                            f"HTTP {response.status_code}"
                        )
                        last_error = f"HTTP {response.status_code}"
                        
            except httpx.TimeoutException as e:
                logger.warning(
                    f"OpenCorporates lookup timeout (attempt {attempt}/{max_retries}): {e}"
                )
                last_error = e
            except httpx.ConnectError as e:
                logger.warning(
                    f"OpenCorporates connection error (attempt {attempt}/{max_retries}): {e}"
                )
                last_error = e
            except Exception as e:
                logger.error(f"OpenCorporates lookup error (attempt {attempt}/{max_retries}): {e}")
                last_error = e
            
            # Wait before retrying (unless this was the last attempt)
            if attempt < max_retries:
                await asyncio.sleep(retry_delay)
        
        logger.error(f"OpenCorporates lookup failed after {max_retries} attempts: {last_error}")
        return None
    
    async def _search_by_name(
        self, 
        business_name: str, 
        jurisdiction: str,
        max_retries: int = 2,
        retry_delay: float = 2.0,
    ) -> Dict[str, Any]:
        """Search for company by name with retry logic."""
        url = f"{self.base_url}/companies/search"
        params = {
            "q": business_name,
            "jurisdiction_code": jurisdiction,
            "per_page": 5,
        }
        if self.api_key:
            params["api_token"] = self.api_key
        
        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, params=params, timeout=30.0)
                    
                    if response.status_code == 200:
                        data = response.json()
                        companies = data.get("results", {}).get("companies", [])
                        
                        if not companies:
                            return {
                                "found": False,
                                "error": "No matching business found in state records",
                                "search_query": business_name,
                                "jurisdiction": jurisdiction,
                            }
                        
                        # Find best match
                        best_match = self._find_best_match(business_name, companies)
                        if best_match:
                            return self._format_company_result(best_match.get("company", {}))
                        
                        # Return first result if no exact match
                        return self._format_company_result(companies[0].get("company", {}))
                        
                    elif response.status_code == 401:
                        logger.warning("OpenCorporates API key invalid or rate limited")
                        return {
                            "found": False,
                            "error": "Verification service temporarily unavailable",
                            "requires_manual_review": True,
                        }
                    else:
                        logger.warning(
                            f"OpenCorporates search failed (attempt {attempt}/{max_retries}): "
                            f"HTTP {response.status_code}"
                        )
                        last_error = f"HTTP {response.status_code}"
                        
            except httpx.TimeoutException as e:
                logger.warning(
                    f"OpenCorporates search timeout (attempt {attempt}/{max_retries}): {e}"
                )
                last_error = e
            except httpx.ConnectError as e:
                logger.warning(
                    f"OpenCorporates connection error (attempt {attempt}/{max_retries}): {e}"
                )
                last_error = e
            except Exception as e:
                logger.error(f"OpenCorporates search error (attempt {attempt}/{max_retries}): {e}")
                last_error = e
            
            # Wait before retrying (unless this was the last attempt)
            if attempt < max_retries:
                await asyncio.sleep(retry_delay)
        
        logger.error(f"OpenCorporates search failed after {max_retries} attempts: {last_error}")
        return {
            "found": False,
            "error": f"Verification service failed after {max_retries} attempts",
            "requires_manual_review": True,
        }
    
    def _find_best_match(
        self, 
        search_name: str, 
        companies: list
    ) -> Optional[Dict]:
        """Find the best matching company from search results."""
        search_name_lower = search_name.lower().strip()
        
        for company_wrapper in companies:
            company = company_wrapper.get("company", {})
            company_name = company.get("name", "").lower().strip()
            
            # Exact match
            if company_name == search_name_lower:
                return company_wrapper
            
            # Match without common suffixes
            suffixes = [" llc", " inc", " corp", " corporation", " ltd", " limited", 
                       " co", " company", " llp", " lp", " pc", " pllc"]
            
            clean_search = search_name_lower
            clean_company = company_name
            for suffix in suffixes:
                clean_search = clean_search.replace(suffix, "")
                clean_company = clean_company.replace(suffix, "")
            
            if clean_search.strip() == clean_company.strip():
                return company_wrapper
        
        return None
    
    def _format_company_result(self, company: Dict) -> Dict[str, Any]:
        """Format OpenCorporates company data into our response format."""
        if not company:
            return {"found": False}
        
        # Determine status
        status = company.get("current_status", "unknown")
        is_active = status.lower() in ["active", "good standing", "in good standing"]
        
        # Extract registered agent if available
        registered_agent = None
        officers = company.get("officers", [])
        for officer in officers:
            if "agent" in officer.get("position", "").lower():
                registered_agent = officer.get("name")
                break
        
        # Format address
        address = company.get("registered_address_in_full") or company.get("registered_address")
        
        return {
            "found": True,
            "business_name": company.get("name"),
            "status": status,
            "is_active": is_active,
            "registration_number": company.get("company_number"),
            "registered_agent": registered_agent,
            "formation_date": company.get("incorporation_date"),
            "entity_type": company.get("company_type"),
            "address": address,
            "jurisdiction": company.get("jurisdiction_code"),
            "opencorporates_url": company.get("opencorporates_url"),
            "raw_data": company,
            "verified_at": datetime.utcnow().isoformat(),
        }
    
    async def get_company_details(
        self, 
        jurisdiction: str, 
        company_number: str
    ) -> Optional[Dict[str, Any]]:
        """Get detailed company information."""
        result = await self._lookup_by_number(jurisdiction, company_number)
        return result if result and result.get("found") else None


# Singleton instance
_sos_service: Optional[SOSVerificationService] = None


def get_sos_service() -> SOSVerificationService:
    """Get or create the SOS verification service instance."""
    global _sos_service
    if _sos_service is None:
        _sos_service = SOSVerificationService()
    return _sos_service
