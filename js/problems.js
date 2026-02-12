const PROBLEMS = [
  {
    id: "hello-python",
    title: "Hello Python",
    difficulty: "easy",
    description: "Write a function that returns a greeting string.",
    detailedDescription:
      "Write a function <code>greet(name)</code> that takes a person's name as a string and returns a greeting in the format <code>\"Hello, {name}!\"</code>.",
    examples: [
      { input: 'greet("Alice")', output: '"Hello, Alice!"' },
      { input: 'greet("World")', output: '"Hello, World!"' },
    ],
    constraints: [
      "name will be a non-empty string",
      "Return the string exactly in the format shown",
    ],
    tags: ["strings", "basics"],
    starterCode: `def greet(name):
    # Write your code here
    pass
`,
    testCode: `import unittest

class TestGreet(unittest.TestCase):
    def test_basic_name(self):
        self.assertEqual(greet("Alice"), "Hello, Alice!")

    def test_world(self):
        self.assertEqual(greet("World"), "Hello, World!")

    def test_single_char(self):
        self.assertEqual(greet("X"), "Hello, X!")

    def test_name_with_spaces(self):
        self.assertEqual(greet("John Doe"), "Hello, John Doe!")
`,
    solution: `def greet(name):
    return f"Hello, {name}!"
`,
  },
  {
    id: "sum-of-list",
    title: "Sum of List",
    difficulty: "easy",
    description: "Calculate the sum of a list of numbers without using the built-in sum().",
    detailedDescription:
      "Write a function <code>sum_list(numbers)</code> that takes a list of integers and returns their sum. Do <strong>not</strong> use the built-in <code>sum()</code> function.",
    examples: [
      { input: "sum_list([1, 2, 3, 4, 5])", output: "15" },
      { input: "sum_list([-1, 0, 1])", output: "0" },
      { input: "sum_list([])", output: "0" },
    ],
    constraints: [
      "Do not use the built-in sum() function",
      "The list may be empty (return 0)",
      "Elements are integers",
    ],
    tags: ["lists", "loops"],
    starterCode: `def sum_list(numbers):
    # Write your code here (do not use sum())
    pass
`,
    testCode: `import unittest

class TestSumList(unittest.TestCase):
    def test_positive_numbers(self):
        self.assertEqual(sum_list([1, 2, 3, 4, 5]), 15)

    def test_mixed_numbers(self):
        self.assertEqual(sum_list([-1, 0, 1]), 0)

    def test_empty_list(self):
        self.assertEqual(sum_list([]), 0)

    def test_single_element(self):
        self.assertEqual(sum_list([42]), 42)

    def test_negative_numbers(self):
        self.assertEqual(sum_list([-5, -3, -2]), -10)
`,
    solution: `def sum_list(numbers):
    total = 0
    for num in numbers:
        total += num
    return total
`,
  },
  {
    id: "count-vowels",
    title: "Count Vowels",
    difficulty: "easy",
    description: "Count the number of vowels in a given string.",
    detailedDescription:
      "Write a function <code>count_vowels(text)</code> that returns the number of vowels (a, e, i, o, u) in the input string. The count should be case-insensitive.",
    examples: [
      { input: 'count_vowels("hello")', output: "2" },
      { input: 'count_vowels("AEIOU")', output: "5" },
      { input: 'count_vowels("xyz")', output: "0" },
    ],
    constraints: [
      "Count both uppercase and lowercase vowels",
      "Only count a, e, i, o, u (not y)",
      "Input will be a string (may be empty)",
    ],
    tags: ["strings", "loops"],
    starterCode: `def count_vowels(text):
    # Write your code here
    pass
`,
    testCode: `import unittest

class TestCountVowels(unittest.TestCase):
    def test_lowercase(self):
        self.assertEqual(count_vowels("hello"), 2)

    def test_uppercase(self):
        self.assertEqual(count_vowels("AEIOU"), 5)

    def test_no_vowels(self):
        self.assertEqual(count_vowels("xyz"), 0)

    def test_empty_string(self):
        self.assertEqual(count_vowels(""), 0)

    def test_mixed_case(self):
        self.assertEqual(count_vowels("Hello World"), 3)
`,
    solution: `def count_vowels(text):
    count = 0
    for char in text:
        if char.lower() in "aeiou":
            count += 1
    return count
`,
  },
  {
    id: "reverse-string",
    title: "Reverse String",
    difficulty: "easy",
    description: "Reverse a string without using slicing.",
    detailedDescription:
      "Write a function <code>reverse_string(text)</code> that returns the reversed version of the input string. Do <strong>not</strong> use Python's slice notation (<code>[::-1]</code>).",
    examples: [
      { input: 'reverse_string("hello")', output: '"olleh"' },
      { input: 'reverse_string("Python")', output: '"nohtyP"' },
      { input: 'reverse_string("a")', output: '"a"' },
    ],
    constraints: [
      "Do not use slice notation [::-1]",
      "Input will be a non-empty string",
    ],
    tags: ["strings", "loops"],
    starterCode: `def reverse_string(text):
    # Write your code here (do not use [::-1])
    pass
`,
    testCode: `import unittest

class TestReverseString(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(reverse_string("hello"), "olleh")

    def test_mixed_case(self):
        self.assertEqual(reverse_string("Python"), "nohtyP")

    def test_single_char(self):
        self.assertEqual(reverse_string("a"), "a")

    def test_palindrome(self):
        self.assertEqual(reverse_string("racecar"), "racecar")

    def test_with_spaces(self):
        self.assertEqual(reverse_string("hi there"), "ereht ih")
`,
    solution: `def reverse_string(text):
    result = ""
    for char in text:
        result = char + result
    return result
`,
  },
  {
    id: "find-maximum",
    title: "Find Maximum",
    difficulty: "easy",
    description: "Find the largest number in a list without using max().",
    detailedDescription:
      "Write a function <code>find_max(numbers)</code> that returns the largest number in a list of integers. Do <strong>not</strong> use the built-in <code>max()</code> function. You may assume the list is non-empty.",
    examples: [
      { input: "find_max([3, 1, 4, 1, 5, 9])", output: "9" },
      { input: "find_max([-5, -2, -8])", output: "-2" },
      { input: "find_max([42])", output: "42" },
    ],
    constraints: [
      "Do not use the built-in max() function",
      "The list will contain at least one element",
      "Elements are integers",
    ],
    tags: ["lists", "loops"],
    starterCode: `def find_max(numbers):
    # Write your code here (do not use max())
    pass
`,
    testCode: `import unittest

class TestFindMax(unittest.TestCase):
    def test_mixed_numbers(self):
        self.assertEqual(find_max([3, 1, 4, 1, 5, 9]), 9)

    def test_negative_numbers(self):
        self.assertEqual(find_max([-5, -2, -8]), -2)

    def test_single_element(self):
        self.assertEqual(find_max([42]), 42)

    def test_duplicates(self):
        self.assertEqual(find_max([7, 7, 7]), 7)

    def test_max_at_start(self):
        self.assertEqual(find_max([100, 1, 2, 3]), 100)
`,
    solution: `def find_max(numbers):
    maximum = numbers[0]
    for num in numbers[1:]:
        if num > maximum:
            maximum = num
    return maximum
`,
  },
  {
    id: "is-palindrome",
    title: "Is Palindrome",
    difficulty: "medium",
    description: "Check if a string is a palindrome, ignoring case and spaces.",
    detailedDescription:
      "Write a function <code>is_palindrome(text)</code> that returns <code>True</code> if the given string is a palindrome, ignoring case and spaces. A palindrome reads the same forwards and backwards.",
    examples: [
      { input: 'is_palindrome("racecar")', output: "True" },
      { input: 'is_palindrome("Race Car")', output: "True" },
      { input: 'is_palindrome("hello")', output: "False" },
    ],
    constraints: [
      "Ignore case when comparing characters",
      "Ignore spaces",
      "Consider only alphabetic characters",
    ],
    tags: ["strings", "algorithms"],
    starterCode: `def is_palindrome(text):
    # Write your code here
    pass
`,
    testCode: `import unittest

class TestIsPalindrome(unittest.TestCase):
    def test_simple_palindrome(self):
        self.assertTrue(is_palindrome("racecar"))

    def test_ignore_case(self):
        self.assertTrue(is_palindrome("Race Car"))

    def test_not_palindrome(self):
        self.assertFalse(is_palindrome("hello"))

    def test_single_char(self):
        self.assertTrue(is_palindrome("a"))

    def test_with_spaces(self):
        self.assertTrue(is_palindrome("A man a plan a canal Panama"))

    def test_empty_string(self):
        self.assertTrue(is_palindrome(""))
`,
    solution: `def is_palindrome(text):
    cleaned = ""
    for char in text:
        if char.isalpha():
            cleaned += char.lower()
    return cleaned == cleaned[::-1]
`,
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "medium",
    description: "Generate a FizzBuzz sequence from 1 to n.",
    detailedDescription:
      'Write a function <code>fizzbuzz(n)</code> that returns a list of strings from 1 to n. For multiples of 3, use <code>"Fizz"</code>; for multiples of 5, use <code>"Buzz"</code>; for multiples of both, use <code>"FizzBuzz"</code>; otherwise use the number as a string.',
    examples: [
      {
        input: "fizzbuzz(5)",
        output: '["1", "2", "Fizz", "4", "Buzz"]',
      },
      {
        input: "fizzbuzz(15)[-1]",
        output: '"FizzBuzz"',
      },
    ],
    constraints: [
      "n will be a positive integer",
      "Return a list of strings",
      'Multiples of both 3 and 5 should be "FizzBuzz"',
    ],
    tags: ["loops", "conditionals"],
    starterCode: `def fizzbuzz(n):
    # Write your code here
    pass
`,
    testCode: `import unittest

class TestFizzBuzz(unittest.TestCase):
    def test_first_five(self):
        self.assertEqual(fizzbuzz(5), ["1", "2", "Fizz", "4", "Buzz"])

    def test_fizzbuzz_15(self):
        result = fizzbuzz(15)
        self.assertEqual(result[14], "FizzBuzz")

    def test_length(self):
        self.assertEqual(len(fizzbuzz(20)), 20)

    def test_fizz(self):
        result = fizzbuzz(3)
        self.assertEqual(result[2], "Fizz")

    def test_single(self):
        self.assertEqual(fizzbuzz(1), ["1"])
`,
    solution: `def fizzbuzz(n):
    result = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            result.append("FizzBuzz")
        elif i % 3 == 0:
            result.append("Fizz")
        elif i % 5 == 0:
            result.append("Buzz")
        else:
            result.append(str(i))
    return result
`,
  },
  {
    id: "word-frequency",
    title: "Word Frequency",
    difficulty: "medium",
    description: "Count the frequency of each word in a string.",
    detailedDescription:
      "Write a function <code>word_frequency(text)</code> that takes a string and returns a dictionary mapping each word (lowercase) to the number of times it appears. Words are separated by whitespace.",
    examples: [
      {
        input: 'word_frequency("hello world hello")',
        output: '{"hello": 2, "world": 1}',
      },
      { input: 'word_frequency("")', output: "{}" },
    ],
    constraints: [
      "Convert all words to lowercase",
      "Words are separated by whitespace",
      "Return an empty dict for empty input",
    ],
    tags: ["dictionaries", "strings"],
    starterCode: `def word_frequency(text):
    # Write your code here
    pass
`,
    testCode: `import unittest

class TestWordFrequency(unittest.TestCase):
    def test_basic(self):
        result = word_frequency("hello world hello")
        self.assertEqual(result, {"hello": 2, "world": 1})

    def test_empty(self):
        self.assertEqual(word_frequency(""), {})

    def test_single_word(self):
        self.assertEqual(word_frequency("python"), {"python": 1})

    def test_case_insensitive(self):
        result = word_frequency("Hello hello HELLO")
        self.assertEqual(result, {"hello": 3})

    def test_multiple_words(self):
        result = word_frequency("the cat sat on the mat")
        self.assertEqual(result["the"], 2)
        self.assertEqual(result["cat"], 1)
`,
    solution: `def word_frequency(text):
    freq = {}
    if not text.strip():
        return freq
    for word in text.lower().split():
        freq[word] = freq.get(word, 0) + 1
    return freq
`,
  },
];
