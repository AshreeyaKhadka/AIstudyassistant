import os
import json

def analyze_repo(root_dir):
    exclude_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'uploads', 'instance', 'chroma_db'}
    results = []
    
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            file_path = os.path.join(root, file)
            ext = os.path.splitext(file)[1].lower()
            if ext in ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.css']:
                try:
                    size = os.path.getsize(file_path)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = sum(1 for _ in f)
                    results.append({
                        'path': os.path.relpath(file_path, root_dir),
                        'size': size,
                        'lines': lines
                    })
                except Exception:
                    pass
                    
    results.sort(key=lambda x: x['lines'], reverse=True)
    with open('repo_analysis.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == '__main__':
    analyze_repo('.')
