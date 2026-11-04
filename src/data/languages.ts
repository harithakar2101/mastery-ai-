import { SupportedLanguage } from '../types';

export interface BuggyPreset {
  title: string;
  description: string;
  code: string;
  errorLog: string;
  tier1Hint: string;
  tier2Concept: string;
  tier3Drill: string;
  fixCheck: (code: string) => { isFixed: boolean; feedback: string };
}

export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  extension: string;
  monacoLang: string;
  defaultSnippet: string;
  defaultCode: string;
  version: string;
  buggyPreset: BuggyPreset;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: 'python',
    name: 'Python',
    extension: '.py',
    monacoLang: 'python',
    defaultSnippet: 'def solution():\n    # Implement here\n    pass\n',
    defaultCode: 'def solution():\n    # Implement here\n    pass\n',
    version: '3.11',
    buggyPreset: {
      title: 'Recursion Depth Exceeded (Missing Base Case)',
      description: 'Recursive factorial function lacks a termination condition, leading to maximum recursion depth RecursionError.',
      code: 'def factorial(n):\n    # Bug: Missing base case triggers stack overflow\n    return n * factorial(n - 1)\n\nprint(factorial(5))\n',
      errorLog: 'RecursionError: maximum recursion depth exceeded in comparison\n  File "solution.py", line 3, in factorial\n  [Previous line repeated 996 more times]',
      tier1Hint: 'Look at the recursion termination: what should happen when n reaches 0 or 1?',
      tier2Concept: 'Every recursive function must have a base case that returns without calling itself, preventing an infinite recursion call stack.',
      tier3Drill: 'What condition should stop the factorial recursion? (e.g. if n <= 1: return 1)',
      fixCheck: (code: string) => {
        const isFixed = /if\s*\(?n\s*(<=|==|<)\s*[01]\)?:\s*return\s+1/i.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Base case correctly added! Recursion terminates properly.'
            : 'Missing or incomplete base case check for n <= 1.',
        };
      },
    },
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    monacoLang: 'javascript',
    defaultSnippet: 'function solution() {\n  // Implement here\n}\n',
    defaultCode: 'function solution() {\n  // Implement here\n}\n',
    version: 'ES2022',
    buggyPreset: {
      title: 'Off-by-One Array Index Loop Error',
      description: 'Loop condition uses <= array.length, accessing an out-of-bounds undefined index and throwing TypeError.',
      code: 'function printItems(items) {\n  // Bug: <= causes off-by-one out-of-bounds access\n  for (let i = 0; i <= items.length; i++) {\n    console.log(items[i].toUpperCase());\n  }\n}\n\nprintItems(["alpha", "beta", "gamma"]);\n',
      errorLog: "TypeError: Cannot read properties of undefined (reading 'toUpperCase')\n    at printItems (solution.js:4:26)\n    at Object.<anonymous> (solution.js:8:1)",
      tier1Hint: 'Check the loop termination condition. Remember array indices in JavaScript run from 0 to length - 1.',
      tier2Concept: 'Zero-indexed arrays of size N have valid indices 0 to N-1. When i equals items.length, items[i] evaluates to undefined.',
      tier3Drill: 'What comparison operator should be used instead of <= ?',
      fixCheck: (code: string) => {
        const isFixed = /i\s*<\s*items\.length/i.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Loop condition corrected to strict inequality (< items.length).'
            : 'Loop condition still accesses index beyond array bounds.',
        };
      },
    },
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: '.ts',
    monacoLang: 'typescript',
    defaultSnippet: 'function solution(): void {\n  // Implement here\n}\n',
    defaultCode: 'function solution(): void {\n  // Implement here\n}\n',
    version: '5.3',
    buggyPreset: {
      title: 'Unchecked Optional Property Access',
      description: 'Accessing nested property without null check or optional chaining leads to runtime TypeError.',
      code: 'interface UserPayload {\n  user?: {\n    profile?: {\n      name: string;\n    };\n  };\n}\n\nfunction getDisplayName(payload: UserPayload): string {\n  // Bug: Direct access without null check\n  return payload.user.profile.name;\n}\n\nconsole.log(getDisplayName({}));\n',
      errorLog: "TypeError: Cannot read properties of undefined (reading 'profile')\n    at getDisplayName (solution.ts:10:23)",
      tier1Hint: 'The user or profile properties are optional. Use optional chaining (?.) or an explicit check before accessing nested fields.',
      tier2Concept: 'In TypeScript, optional fields may be undefined at runtime. Optional chaining (?.) short-circuits evaluation when a reference is nullish.',
      tier3Drill: 'How can you safely navigate through payload.user and profile using modern TypeScript syntax?',
      fixCheck: (code: string) => {
        const isFixed =
          /payload\.user\?\.profile\?\.name/i.test(code) ||
          /payload\?\.user\?\.profile\?\.name/i.test(code) ||
          /payload\.user\s*&&\s*payload\.user\.profile/i.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Safely handled nullish intermediate properties!'
            : 'Still unsafe direct property access detected.',
        };
      },
    },
  },
  {
    id: 'java',
    name: 'Java',
    extension: '.java',
    monacoLang: 'java',
    defaultSnippet: 'public class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
    defaultCode: 'public class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
    version: 'OpenJDK 21',
    buggyPreset: {
      title: 'ArrayIndexOutOfBoundsException',
      description: 'Attempting to access array element at index equal to the array length throws ArrayIndexOutOfBoundsException.',
      code: 'public class Solution {\n    public static void main(String[] args) {\n        int[] scores = new int[]{95, 88, 72, 91, 100};\n        // Bug: Accessing scores[scores.length]\n        for (int i = 0; i <= scores.length; i++) {\n            System.out.println("Score: " + scores[i]);\n        }\n    }\n}\n',
      errorLog: 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5\n\tat Solution.main(Solution.java:6)',
      tier1Hint: 'Review the for-loop termination condition. What is the highest valid index for an array of length 5?',
      tier2Concept: 'Java arrays are 0-indexed. The last element is at length - 1. Iterating up to <= length causes an out of bounds exception.',
      tier3Drill: 'Change the loop boundary from <= to <.',
      fixCheck: (code: string) => {
        const isFixed = /i\s*<\s*scores\.length/.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Loop correctly constrained to i < scores.length.'
            : 'Array still indexed out of bounds.',
        };
      },
    },
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: '.cpp',
    monacoLang: 'cpp',
    defaultSnippet: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
    defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
    version: 'C++20 (GCC 13)',
    buggyPreset: {
      title: 'Null Pointer Dereference',
      description: 'Dereferencing uninitialized or nullptr pointer causes memory segment fault (SIGSEGV).',
      code: '#include <iostream>\n\nint main() {\n    int* ptr = nullptr;\n    // Bug: Dereferencing nullptr without allocation or check\n    *ptr = 42;\n    std::cout << *ptr << std::endl;\n    return 0;\n}\n',
      errorLog: 'Segmentation fault (core dumped) - signal 11 (SIGSEGV)\nAddress not mapped to object: 0x0',
      tier1Hint: 'The pointer `ptr` is currently null. Allocate memory (e.g. `new int(42)` or point to a valid stack variable) before dereferencing.',
      tier2Concept: 'Pointers store memory addresses. Dereferencing a nullptr attempts to read/write to protected address space 0x0.',
      tier3Drill: 'How do you allocate an integer on the heap or stack and point ptr to it?',
      fixCheck: (code: string) => {
        const isFixed = /new\s+int/i.test(code) || /int\s+[a-zA-Z_]\w*\s*=\s*\d+/i.test(code) || /&\w+/.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Valid memory allocated/pointed before dereferencing.'
            : 'Pointer remains null or unallocated.',
        };
      },
    },
  },
  {
    id: 'c',
    name: 'C',
    extension: '.c',
    monacoLang: 'c',
    defaultSnippet: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
    defaultCode: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
    version: 'C17 (GCC 13)',
    buggyPreset: {
      title: 'Buffer Overflow via Unbounded Input',
      description: 'Using unsafe gets() allows writing past the allocated buffer, corrupting stack frame.',
      code: '#include <stdio.h>\n\nint main() {\n    char buf[16];\n    // Bug: gets does not bound read length\n    gets(buf);\n    printf("Input: %s\\n", buf);\n    return 0;\n}\n',
      errorLog: '*** stack smashing detected ***: terminated\nAborted (core dumped)\nwarning: the gets function is dangerous and should not be used.',
      tier1Hint: 'Replace the deprecated and unsafe gets() function with fgets(buf, sizeof(buf), stdin).',
      tier2Concept: 'gets() does not perform boundary checks, allowing buffer overflows that overwrite return addresses and smash the stack.',
      tier3Drill: 'Which standard C function reads at most N-1 characters into a buffer?',
      fixCheck: (code: string) => {
        const isFixed = /fgets\s*\(\s*buf/i.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Replaced gets with bounds-checked fgets!'
            : 'Unsafe unbounded read function still present.',
        };
      },
    },
  },
  {
    id: 'go',
    name: 'Go',
    extension: '.go',
    monacoLang: 'go',
    defaultSnippet: 'package main\n\nimport "fmt"\n\nfunc main() {\n}\n',
    defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n}\n',
    version: '1.21',
    buggyPreset: {
      title: 'Deadlock on Unbuffered Channel',
      description: 'Sending to an unbuffered channel in main goroutine with no concurrent receiver causes fatal deadlock.',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Bug: Unbuffered channel send blocks forever without receiver\n    ch := make(chan int)\n    ch <- 42\n    fmt.Println(<-ch)\n}\n',
      errorLog: 'fatal error: all goroutines are asleep - deadlock!\n\ngoroutine 1 [chan send]:\nmain.main()\n\t/solution.go:8 +0x45',
      tier1Hint: 'Make the channel buffered (e.g. `make(chan int, 1)`) or launch a goroutine to send/receive asynchronously.',
      tier2Concept: 'In Go, sends to unbuffered channels block until another goroutine executes a receive.',
      tier3Drill: 'How can you specify buffer capacity 1 when creating the channel?',
      fixCheck: (code: string) => {
        const isFixed = /make\s*\(\s*chan\s+int\s*,\s*[1-9][0-9]*\s*\)/i.test(code) || /go\s+func/i.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Channel buffered or goroutine decoupled to prevent deadlock.'
            : 'Unbuffered synchronous channel send still blocks execution.',
        };
      },
    },
  },
  {
    id: 'rust',
    name: 'Rust',
    extension: '.rs',
    monacoLang: 'rust',
    defaultSnippet: 'fn main() {\n}\n',
    defaultCode: 'fn main() {\n}\n',
    version: '1.75',
    buggyPreset: {
      title: 'Use After Move (Ownership Violation)',
      description: 'Moving a non-Copy String into another variable and then accessing the original variable violates Rust borrow checker.',
      code: 'fn main() {\n    let s1 = String::from("Mastery.ai");\n    // Bug: Ownership moves to s2\n    let s2 = s1;\n    println!("s1: {}, s2: {}", s1, s2);\n}\n',
      errorLog: 'error[E0382]: borrow of moved value: `s1`\n --> src/main.rs:5:32\n  |\n3 |     let s2 = s1;\n  |              -- value moved here\n4 |     println!("s1: {}, s2: {}", s1, s2);\n  |                                ^^ value borrowed here after move',
      tier1Hint: 'Clone `s1` (`let s2 = s1.clone();`) or borrow `s1` (`let s2 = &s1;`) instead of moving full ownership.',
      tier2Concept: 'Rust enforces single-ownership semantics for heap data. When s1 is assigned to s2, ownership is transferred unless cloned or borrowed.',
      tier3Drill: 'What method makes an explicit copy of a heap allocated value in Rust?',
      fixCheck: (code: string) => {
        const isFixed = /\.clone\(\)/i.test(code) || /let\s+s2\s*=\s*&s1/i.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Ownership preserved using clone() or borrowing (&s1).'
            : 'Value is still moved before subsequent use.',
        };
      },
    },
  },
  {
    id: 'php',
    name: 'PHP',
    extension: '.php',
    monacoLang: 'php',
    defaultSnippet: '<?php\n// Implement here\n',
    defaultCode: '<?php\n// Implement here\n',
    version: '8.2',
    buggyPreset: {
      title: 'Undefined Array Key Access',
      description: 'Accessing an associative array key that may not exist triggers an E_WARNING / Undefined array key.',
      code: '<?php\n$config = ["theme" => "dark"];\n// Bug: Missing check for optional key\necho $config["language"];\n',
      errorLog: 'Warning: Undefined array key "language" in /solution.php on line 4',
      tier1Hint: 'Use the null coalescing operator `??` or `isset($config[\'language\'])` to provide a fallback value.',
      tier2Concept: 'In modern PHP, reading non-existent array keys raises a warning. Null coalescing (`$config[\'language\'] ?? \'default\'`) safely defaults.',
      tier3Drill: 'What operator provides a fallback if a key is not set in PHP 7+?',
      fixCheck: (code: string) => {
        const isFixed = /\?\?/i.test(code) || /isset\(/i.test(code) || /array_key_exists\(/i.test(code);
        return {
          isFixed,
          feedback: isFixed
            ? 'Safe array access implemented with null coalescing or isset check.'
            : 'Key access still unguarded.',
        };
      },
    },
  },
];
