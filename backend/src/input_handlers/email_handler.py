import os
import imaplib
import email
from email.header import decode_header
import json
from datetime import datetime
from dotenv import load_dotenv

# Try to load .env from the root of the project
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv() # Fallback to default search

GMAIL_ID = os.getenv("GMAIL_ID")
APP_PASSWORD = os.getenv("APP_PASSWORD")

# Save directory: backend/data/emails/
save_directory = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "emails")

def connect_to_gmail(email_id: str = None, app_password: str = None):
    """Connects to Gmail via IMAP and returns the connected object.

    Args:
        email_id:     Gmail address. Falls back to GMAIL_ID env var if not provided.
        app_password: Gmail App Password. Falls back to APP_PASSWORD env var if not provided.
    """
    resolved_id = email_id or GMAIL_ID
    resolved_pw = app_password or APP_PASSWORD

    if not resolved_id or not resolved_pw:
        raise ValueError(
            "Email credentials not available. Either pass email_id/app_password directly "
            "(injected at login) or set GMAIL_ID and APP_PASSWORD environment variables."
        )

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(resolved_id, resolved_pw)
        return mail
    except Exception as e:
        print(f"Failed to connect to Gmail ({resolved_id}): {e}")
        return None

def fetch_unread_emails(mail, limit=10):
    """Fetches unread emails from the inbox with a limit."""
    mail.select("inbox")
    status, messages = mail.search(None, "UNSEEN")
    if status == "OK":
        email_ids = messages[0].split()
        return email_ids[-limit:] if limit else email_ids
    return []

def get_header_value(msg, header_name):
    """Extracts and decodes a specific header from the email message."""
    value = msg.get(header_name)
    if value:
        decoded_value, charset = decode_header(value)[0]
        if isinstance(decoded_value, bytes):
            charset = charset or 'utf-8'
            try:
                decoded_value = decoded_value.decode(charset)
            except Exception:
                decoded_value = decoded_value.decode('utf-8', errors='replace')
        return decoded_value
    return ""

def get_email_body(msg):
    """Extracts the body of the email."""
    body_text = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    body_text += payload.decode(errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body_text = payload.decode(errors="replace")
            
    return body_text.strip()

def extract_and_save_attachments(msg, save_dir):
    """Extracts attachments from the email and saves them to the specified directory."""
    saved_files = []
    if msg.is_multipart():
        for part in msg.walk():
            content_disposition = str(part.get("Content-Disposition"))
            if "attachment" in content_disposition:
                filename = part.get_filename()
                if filename:
                    decoded_filename, charset = decode_header(filename)[0]
                    if isinstance(decoded_filename, bytes):
                        charset = charset or 'utf-8'
                        try:
                            decoded_filename = decoded_filename.decode(charset)
                        except Exception:
                            decoded_filename = decoded_filename.decode('utf-8', errors='replace')
                    
                    safe_filename = "".join(c for c in decoded_filename if c.isalnum() or c in (' ', '.', '_', '-')).rstrip()
                    
                    attachments_dir = os.path.join(save_dir, "attachments")
                    if not os.path.exists(attachments_dir):
                        os.makedirs(attachments_dir)
                        
                    # Handle multiple files with the same name
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    safe_filename = f"{timestamp}_{safe_filename}"
                    filepath = os.path.join(attachments_dir, safe_filename)
                    
                    payload = part.get_payload(decode=True)
                    if payload:
                        with open(filepath, "wb") as f:
                            f.write(payload)
                        saved_files.append(filepath)
    return saved_files

def classify_email(text):
    """Classifies email into RFP, Proposal, Negotiation, or None based on keywords."""
    text_lower = text.lower()
    
    # Simple keyword-based classification
    if any(keyword in text_lower for keyword in ["rfp", "request for proposal", "request for tender"]):
        return "RFP"
    elif any(keyword in text_lower for keyword in ["proposal", "pitch"]):
        return "Proposal"
    elif any(keyword in text_lower for keyword in ["negotiation", "counteroffer", "terms", "contract review"]):
        return "Negotiation"
        
    return None

def save_email(email_data):
    """Saves the email to the data directory."""
    if not os.path.exists(save_directory):
        os.makedirs(save_directory)

    # Use a timestamp and category-based filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    category_slug = email_data['category'].lower().replace(" ", "_")
    filename = f"{category_slug}_{timestamp}.json"
    filepath = os.path.join(save_directory, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(email_data, f, indent=4, ensure_ascii=False)
        
    return filepath

def process_unread_emails(email_id: str = None, app_password: str = None):
    """
    Fetch, parse, classify, filter, and save unread emails.
    Returns a list of structured data for relevant emails. Unwanted emails are discarded.

    Args:
        email_id:     Gmail address (falls back to GMAIL_ID env var).
        app_password: Gmail App Password (falls back to APP_PASSWORD env var).
    """
    mail = connect_to_gmail(email_id=email_id, app_password=app_password)
    if not mail:
        return []

    email_ids = fetch_unread_emails(mail)
    processed_emails = []

    for email_id in email_ids:
        # Fetching the email also marks it as seen by default
        res, msg_data = mail.fetch(email_id, "(RFC822)")
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                
                subject = get_header_value(msg, "Subject")
                sender = get_header_value(msg, "From")
                date = get_header_value(msg, "Date")
                body = get_email_body(msg)

                combined_text = f"{subject} {body}"
                category = classify_email(combined_text)

                if category:
                    attachments = extract_and_save_attachments(msg, save_directory)
                    
                    email_info = {
                        "subject": subject,
                        "sender": sender,
                        "date": date,
                        "body": body,
                        "category": category,
                        "source": "gmail",
                        "status": "processed",
                        "attachments": attachments
                    }
                    filepath = save_email(email_info)
                    email_info["saved_path"] = filepath
                    processed_emails.append(email_info)
                else:
                    # Could log discarded emails here if necessary, but skipping for now
                    pass 

    mail.logout()
    return processed_emails

if __name__ == "__main__":
    # Test the handler if run directly
    print("Starting email processing...")
    emails = process_unread_emails()
    print(f"\nProcessed {len(emails)} relevant emails.")
    for e in emails:
         print(f"Saved [{e['category']}] email: {e['subject']} -> {e['saved_path']}")
