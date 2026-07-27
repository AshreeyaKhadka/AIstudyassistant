export const compilerLanguages = {
  c: {
    id: 'c', name: 'C', monaco: 'c', fileName: 'solution.c',
    starter: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello, world!\\n");\n  return 0;\n}\n',
  },
  cpp: {
    id: 'cpp', name: 'C++', monaco: 'cpp', fileName: 'solution.cpp',
    starter: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, world!" << std::endl;\n  return 0;\n}\n',
  },
  java: {
    id: 'java', name: 'Java', monaco: 'java', fileName: 'Main.java',
    starter: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}\n',
  },
  python: {
    id: 'python', name: 'Python', monaco: 'python', fileName: 'solution.py',
    starter: 'def main():\n    print("Hello, world!")\n\n\nif __name__ == "__main__":\n    main()\n',
  },
};
