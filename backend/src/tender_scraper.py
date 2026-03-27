import time
import json
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from curl_cffi import requests
import io
import PyPDF2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TenderScraper:
    def __init__(self):
        # Impersonate Chrome to evade basic bot blocks, using timeout for resilience
        self.session = requests.Session(impersonate="chrome110", timeout=30)
        self.eproc_base = "https://eprocure.gov.in/eprocure/app"
        self.isro_base = "https://eproc.isro.gov.in/"

    def _match_keyword(self, text: str, keyword: str) -> bool:
        if not keyword:
            return True
        return keyword.lower() in str(text).lower()

    def _extract_pdf_text_from_url(self, pdf_url: str) -> Optional[str]:
        if not pdf_url:
            return None
        try:
            time.sleep(1) # Prevent rate limiting
            response = self.session.get(pdf_url, timeout=30)
            if response.status_code == 200 and len(response.content) > 0:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(response.content))
                text = ""
                # Get text from first few pages to avoid massive payloads
                num_pages = min(len(pdf_reader.pages), 10) 
                for i in range(num_pages):
                    page = pdf_reader.pages[i]
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text.strip() if text else None
            else:
                logger.warning(f"Failed to fetch PDF from {pdf_url}, status code: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error extracting text from PDF url {pdf_url}: {e}")
            return None

    def scrape_eprocure(self, limit: int = None) -> List[Dict[str, Any]]:
        tenders = []
        try:
            logger.info("Scraping eProcure latest tenders stream...")
            r = self.session.get(self.eproc_base)
            soup = BeautifulSoup(r.text, 'html.parser')
            
            tender_links = {}
            for tbl in soup.find_all('table'):
                if "Latest Tenders" in tbl.text:
                    for a in tbl.find_all('a', href=True):
                        full_url = urljoin(self.eproc_base, a['href'])
                        title = a.text.strip()
                        if len(title) > 5 and full_url not in tender_links:
                            tender_links[full_url] = title

            if not tender_links:
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if "component=%24DirectLink" in href or "page=FrontEndTenderDetails" in href:
                        full_url = urljoin(self.eproc_base, href)
                        title = a.text.strip()
                        if len(title) > 5 and full_url not in tender_links:
                            tender_links[full_url] = title
            
            links_to_process = list(tender_links.items())
            if limit and limit > 0:
                links_to_process = links_to_process[:limit]

            for url, title in links_to_process:
                # Eprocure asks for captcha on document details, so skip fetching it.
                data = {
                    "source": "eProcure",
                    "tender_id": None,
                    "title": title,
                    "description": None,
                    "tender_value": None,
                    "closing_date": None,
                    "opening_date": None,
                    "document_url": None,
                    "url": url,
                    "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "context": None
                }
                tenders.append(data)
                    
        except Exception as e:
            logger.error(f"eProcure homepage failed completely: {e}")
        
        logger.info(f"Extracted {len(tenders)} multi-field details from eProcure.")
        return tenders

    def scrape_isro(self, limit: int = None) -> List[Dict[str, Any]]:
        tenders = []
        try:
            logger.info("Scraping ISRO full tender table stream...")
            r = self.session.get(self.isro_base)
            soup = BeautifulSoup(r.text, 'html.parser')
            
            for tbl in soup.find_all('table'):
                rows = tbl.find_all('tr')
                if len(rows) > 0:
                    headers = [c.text.strip().lower() for c in rows[0].find_all(['th', 'td'])]
                    if 'tender no' in headers and 'tender description' in headers:
                        desc_idx = headers.index('tender description')
                        no_idx = headers.index('tender no')
                        close_idx = headers.index('bid closing date (ist)') if 'bid closing date (ist)' in headers else -1
                        open_idx = headers.index('bid opening date (ist)') if 'bid opening date (ist)' in headers else -1
                        
                        rows_to_process = rows[1:]
                        if limit and limit > 0:
                            rows_to_process = rows_to_process[:limit]

                        for row in rows_to_process:
                            cols = row.find_all(['td', 'th'])
                            if len(cols) > max(desc_idx, no_idx):
                                t_no = cols[no_idx].text.strip()
                                t_desc = cols[desc_idx].text.strip()
                                closing = cols[close_idx].text.strip() if close_idx != -1 and len(cols) > close_idx else None
                                opening = cols[open_idx].text.strip() if open_idx != -1 and len(cols) > open_idx else None
                                
                                doc_url = None
                                view_url = self.isro_base
                                actions_col = cols[-1]
                                for a in actions_col.find_all('a', href=True):
                                    if "viewDocumentPT" in a['href'] or ".pdf" in a['href']:
                                        doc_url = urljoin(self.isro_base, a['href'])
                                        
                                context = self._extract_pdf_text_from_url(doc_url) if doc_url else None
                                        
                                tenders.append({
                                    "source": "ISRO",
                                    "tender_id": t_no if t_no else None,
                                    "title": f"Tender {t_no}" if t_no else None,
                                    "description": t_desc if t_desc else None,
                                    "tender_value": None, # ISRO table usually lacks value
                                    "closing_date": closing if closing else None,
                                    "opening_date": opening if opening else None,
                                    "document_url": doc_url if doc_url else None,
                                    "url": view_url if view_url else None,
                                    "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                                    "context": context
                                })
                        break
                        
        except Exception as e:
            logger.error(f"ISRO site failed completely: {e}")
            
        logger.info(f"Extracted {len(tenders)} multi-field details from ISRO.")
        return tenders

    def run(self, keyword: str = "", limit: int = None) -> List[Dict[str, Any]]:
        results = []
        eproc_data = self.scrape_eprocure(limit=limit)
        isro_data = self.scrape_isro(limit=limit)
        
        all_tenders = eproc_data + isro_data
        for t in all_tenders:
             if self._match_keyword(t['title'], keyword) or self._match_keyword(t['description'], keyword) or self._match_keyword(t['tender_id'], keyword):
                 results.append(t)
                 
        return results

def run_tender_scraper(keyword: str = "", limit: int = None) -> List[Dict[str, Any]]:
    scraper = TenderScraper()
    return scraper.run(keyword, limit=limit)

if __name__ == "__main__":
    import sys
    search_keyword = sys.argv[1] if len(sys.argv) > 1 else ""
    # For testing, you can pass a limit via args if preferred, otherwise hardcode limit=2 for testing or limit=None for production.
    # We will test it with limit 2 if a second arg is passed
    limit_val = int(sys.argv[2]) if len(sys.argv) > 2 else None
    output = run_tender_scraper(search_keyword, limit=limit_val)
    print(json.dumps(output, indent=2))
