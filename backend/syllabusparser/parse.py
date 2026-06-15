import os
import json
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

def process_syllabus_for_rag(pdf_path, output_json_path):
    print("loading")
    
    # 1. Load the PDF page by page natively keeping metadata (page numbers) intact
    loader = PyPDFLoader("ComputerEngineering.pdf")
    raw_documents = loader.load()
    print(f"✅ Loaded {len(raw_documents)} pages successfully.")

    print("\n🔄 Step 2: Initializing Text Splitter for RAG optimization...")
    # 2. Configure the smart splitter. It looks for paragraphs, sentences, then words.
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,       # Ideal size for embedding models to maintain semantic meaning
        chunk_overlap=200,     # Overlap prevents context loss at boundaries
        length_function=len,
        separators=["\n\n", "\n", " ", ""] # Order of importance for splitting
    )

    # 3. Split the loaded documents into chunks
    print("🔄 Step 3: Chunking text while preserving document metadata...")
    chunks = text_splitter.split_documents(raw_documents)
    print(f"✅ Generated {len(chunks)} total semantic chunks.")

    # 4. Format chunks into a clean JSON structure ready for LangChain ingestion
    rag_json_ready = []
    for i, chunk in enumerate(chunks):
        rag_json_ready.append({
            "chunk_id": i + 1,
            "page_content": chunk.page_content,
            "metadata": {
                "source": os.path.basename(pdf_path),
                "page": chunk.metadata.get("page", 0) + 1, # Page index starts at 0, converting to 1-based index
            }
        })

    # 5. Export to JSON file
    print(f"\n🔄 Step 4: Writing formatted data to {output_json_path}...")
    with open(output_json_path, 'w', encoding='utf-8', errors ="replace") as f:
        json.dump(rag_json_ready, f, indent=4, ensure_ascii=False)
        
    print("🎉 Done! Your chunks are perfectly formatted for LangChain.")

if __name__ == "__main__":
    # Ensure your actual PDF file name matches this path
    PDF_INPUT_FILE = "ComputerEngineering.pdf"
    JSON_OUTPUT_FILE = "syllabus_rag_chunks.json"
    
    if os.path.exists(PDF_INPUT_FILE):
        process_syllabus_for_rag(PDF_INPUT_FILE, JSON_OUTPUT_FILE)
    else:
        print(f"❌ Error: Please put your '{PDF_INPUT_FILE}' file inside this directory first.")