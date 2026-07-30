import json
from app import create_app
from services.rag_service import retrieve_context

app = create_app()

new_eval_set = [
  # --- Big Data Analytics ---
  {
    "query": "What is the role of a data scientist?",
    "expected_file": "Big_Data_Syllabus.pdf",
    "expected_text": "Role of Data Scientist"
  },
  {
    "query": "How many hours for Google File System?",
    "expected_file": "Big_Data_Syllabus.pdf",
    "expected_text": "7 hrs"
  },
  {
    "query": "What is the optimization goal for large scale data?",
    "expected_file": "Big_Data_Syllabus.pdf",
    "expected_text": "Optimization for large scale data"
  },
  {
    "query": "What are the current trends in big data analytics?",
    "expected_file": "Big_Data_Syllabus.pdf",
    "expected_text": "Current Trend in Big Data Analytics"
  },

  # --- TOC Notes: Chapter 3 Regular Expressions ---
  {
    "query": "What regular expression operator represents union of regular languages?",
    "expected_file": "TOC-chapter3.pdf",
    "expected_text": "Union"
  },
  {
    "query": "What regular expression denotes C identifiers?",
    "expected_file": "TOC-chapter3.pdf",
    "expected_text": "Alphabet + _"
  },
  {
    "query": "What regular expression represents strings ending with 11?",
    "expected_file": "TOC-chapter3.pdf",
    "expected_text": "11"
  },
  {
    "query": "How is distributive law written for regular expressions?",
    "expected_file": "TOC-chapter3.pdf",
    "expected_text": "r(s+t) = rs+rt"
  },

  # --- TOC Notes: Chapter 6 Undecidability ---
  {
    "query": "What does the Church-Turing Thesis state regarding algorithmic procedures and Turing machines?",
    "expected_file": "CH_6_Slide_notes.pdf",
    "expected_text": "Church-Turing Thesis"
  },
  {
    "query": "Who is the author of the Undecidability lecture slide notes for Theory of Computation?",
    "expected_file": "CH_6_Slide_notes.pdf",
    "expected_text": "Nirmal Thapa"
  },
  {
    "query": "What concept addresses whether a problem can be solved by a Turing machine algorithm?",
    "expected_file": "CH_6_Slide_notes.pdf",
    "expected_text": "computability"
  },

  # --- TOC Syllabus ---
  {
    "query": "What topics are included under Unit 6 Computational Complexity in Theory of Computation?",
    "expected_file": "Theroy_of_Computation.pdf",
    "expected_text": "Class P and Class NP"
  },
  {
    "query": "How many lecture hours are allocated for Unit 2 Finite Automata and Regular Language?",
    "expected_file": "Theroy_of_Computation.pdf",
    "expected_text": "10  hrs"
  },

  # --- Mock Data: Artificial Intelligence ---
  {
    "query": "What minimax and pruning techniques are listed under Adversarial Search and Game Playing?",
    "expected_file": "Artificial_Intelligence.pdf",
    "expected_text": "Minimax algorithm"
  },
  {
    "query": "What components represent Constraint Satisfaction Problems?",
    "expected_file": "Artificial_Intelligence.pdf",
    "expected_text": "Variables"
  },
  {
    "query": "What topics are covered under Artificial Neural Network training?",
    "expected_file": "Artificial_Intelligence.pdf",
    "expected_text": "Forward Propagation"
  },

  # --- Mock Data: Data Structure and Algorithms ---
  {
    "query": "What circular queue concepts are covered under Unit 3 Queue and Linked List?",
    "expected_file": "Data_Structure_and_Algorithms.pdf",
    "expected_text": "Circular Queue"
  },
  {
    "query": "What sorting algorithms are taught under Unit 5 Sorting Algorithms?",
    "expected_file": "Data_Structure_and_Algorithms.pdf",
    "expected_text": "Quick Sort and Merge Sort"
  },
  {
    "query": "What recursive algorithms need to be implemented in the lab?",
    "expected_file": "Data_Structure_and_Algorithms.pdf",
    "expected_text": "Tower of Hanoi"
  },

  # --- Mock Data: Computer Architecture ---
  {
    "query": "What cache replacement algorithms are listed in Computer Architecture?",
    "expected_file": "Computer_Architecture.pdf",
    "expected_text": "FIFO, LRU, LFU"
  },
  {
    "query": "What operations are listed under Register Transfer Language and Micro operations?",
    "expected_file": "Computer_Architecture.pdf",
    "expected_text": "Shift Micro operations"
  },

  # --- Mock Data: Advanced Java ---
  {
    "query": "What UI frameworks are taught in Unit 3 for building components in Java?",
    "expected_file": "Advanced_Java.pdf",
    "expected_text": "Swing and JavaFX"
  },
  {
    "query": "What cookie and session topics are covered in Advanced Java?",
    "expected_file": "Advanced_Java.pdf",
    "expected_text": "Cookies and Sessions"
  }
]

with app.app_context():
    print(f"Testing {len(new_eval_set)} queries...")
    hits = 0
    for idx, item in enumerate(new_eval_set):
        chunks = retrieve_context(query=item['query'], top_k=3)
        match_found = False
        for c in chunks:
            fn = c['metadata'].get('filename', '')
            txt = c['text'].lower()
            if item['expected_file'] in fn and item['expected_text'].lower() in txt:
                match_found = True
                break
        if match_found:
            hits += 1
        else:
            print(f"MISS Q{idx+1}: {item['query']}")
            print(f"  Expected file: {item['expected_file']}, Expected text: {item['expected_text']}")
            if chunks:
                print(f"  Top chunk ret: {chunks[0]['metadata'].get('filename')} -> {chunks[0]['text'][:100]}...")
    print(f"Hit Rate (k=3): {hits}/{len(new_eval_set)} ({hits/len(new_eval_set)*100:.1f}%)")
