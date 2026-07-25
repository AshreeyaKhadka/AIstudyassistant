import json
import os

def analyze_unitwise():
    path = "backend/syllabusparser/unitwise.json"
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    faculties = list(data.keys())
    print("Faculties:", len(faculties))
    
    total_subjects = 0
    total_units = 0
    unique_topics = set()
    
    for fac, subjects in data.items():
        total_subjects += len(subjects)
        for subj, subj_data in subjects.items():
            if 'units' in subj_data:
                for unit in subj_data['units']:
                    total_units += 1
                    if 'sub_topics' in unit:
                        for topic in unit['sub_topics']:
                            unique_topics.add(topic)
                            
    print(f"Total Subjects: {total_subjects}")
    print(f"Total Units: {total_units}")
    print(f"Unique Topics: {len(unique_topics)}")
    
if __name__ == '__main__':
    analyze_unitwise()
