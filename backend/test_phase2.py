import fitz

def test_parse():
    doc = fitz.open("backend/uploads/1_Big_Data_Syllabus.pdf")
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text("text")
        if text.strip():
            pages.append({"page_num": i + 1, "text": text})
    print(f"Parsed {len(pages)} pages.")
    if pages:
        print(f"Page 1 metadata: {pages[0]['page_num']}")
        print(f"Page 1 text snippet: {pages[0]['text'][:100]}")

test_parse()
