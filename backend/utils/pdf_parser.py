import PyPDF2
from io import BytesIO

def extract_text_from_pdf(pdf_file):
    """
    Extract text from a PDF file.
    """
    text = ""
    reader = PyPDF2.PdfReader(BytesIO(pdf_file.read()))

    for page in reader.pages:
        text += page.extract_text() + "\n"

    return text.strip()
