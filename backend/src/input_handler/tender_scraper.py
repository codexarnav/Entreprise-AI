import time
import json
import logging
from typing import List, Dict, Any
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from curl_cffi import requests

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

    def scrape_eprocure(self) -> List[Dict[str, Any]]:
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
            
            for url, title in list(tender_links.items())[:15]:
                try:
                    time.sleep(0.5)
                    detail_r = self.session.get(url, timeout=15)
                    detail_soup = BeautifulSoup(detail_r.text, 'html.parser')
                    
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
                        "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    # Extract detailed table metadata
                    for td in detail_soup.find_all(['td', 'b']):
                        text = td.text.strip().replace('\n', '')
                        if text in ["Tender ID", "Tender Reference Number", "Tender Value in \u20b9", "Tender Category", "Bid Submission End Date", "Bid Opening Date", "Title", "Work Description"]:
                            nxt = td.find_next_sibling('td') or td.find_next('td')
                            if nxt:
                                val = nxt.text.strip()
                                if text == "Tender ID": data["tender_id"] = val
                                elif text == "Work Description": data["description"] = val
                                elif text == "Tender Value in \u20b9": data["tender_value"] = val
                                elif text == "Bid Submission End Date": data["closing_date"] = val
                                elif text == "Bid Opening Date": data["opening_date"] = val

                    # Extract document URL
                    for a in detail_soup.find_all('a', href=True):
                        if 'Download' in a.text or '.pdf' in a['href'].lower() or 'Tendoc' in a['href']:
                            data['document_url'] = urljoin(self.eproc_base, a['href'])
                            break

                    tenders.append(data)
                except Exception as detail_err:
                    logger.warning(f"Skipping failed eProcure tender page {url}: {detail_err}")
                    continue
                    
        except Exception as e:
            logger.error(f"eProcure homepage failed completely: {e}")
        
        logger.info(f"Extracted {len(tenders)} multi-field details from eProcure.")
        return tenders

    def scrape_isro(self) -> List[Dict[str, Any]]:
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
                        
                        for row in rows[1:]:
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
                                        
                                tenders.append({
                                    "source": "ISRO",
                                    "tender_id": t_no,
                                    "title": f"Tender {t_no}",
                                    "description": t_desc,
                                    "tender_value": None, # ISRO table usually lacks value
                                    "closing_date": closing,
                                    "opening_date": opening,
                                    "document_url": doc_url,
                                    "url": view_url,
                                    "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
                                })
                        break
                        
        except Exception as e:
            logger.error(f"ISRO site failed completely: {e}")
            
        logger.info(f"Extracted {len(tenders)} multi-field details from ISRO.")
        return tenders

    def run(self, keyword: str = "") -> List[Dict[str, Any]]:
        results = []
        eproc_data = self.scrape_eprocure()
        isro_data = self.scrape_isro()
        
        all_tenders = eproc_data + isro_data
        for t in all_tenders:
             if self._match_keyword(t['title'], keyword) or self._match_keyword(t['description'], keyword) or self._match_keyword(t['tender_id'], keyword):
                 results.append(t)
                 
        return results

def run_tender_scraper(keyword: str = "") -> List[Dict[str, Any]]:
    scraper = TenderScraper()
    return scraper.run(keyword)

if __name__ == "__main__":
    import sys
    search_keyword = sys.argv[1] if len(sys.argv) > 1 else ""
    output = run_tender_scraper(search_keyword)
    print(json.dumps(output, indent=2))
