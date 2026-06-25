import unittest
from solution import StringToolkit


class StringToolkitTest(unittest.TestCase):
    def setUp(self):
        self.toolkit = StringToolkit()

    # --- Already implemented methods ---

    def test_reverse_string(self):
        self.assertEqual(self.toolkit.reverse_string("hello"), "olleh")

    def test_count_vowels(self):
        self.assertEqual(self.toolkit.count_vowels("Hello World"), 3)

    def test_is_palindrome(self):
        self.assertTrue(self.toolkit.is_palindrome("racecar"))
        self.assertTrue(self.toolkit.is_palindrome("A man, a plan, a canal: Panama"))
        self.assertFalse(self.toolkit.is_palindrome("hello"))

    def test_capitalize_words(self):
        self.assertEqual(
            self.toolkit.capitalize_words("the quick brown fox"),
            "The Quick Brown Fox",
        )

    # --- Methods to implement ---

    def test_count_words(self):
        self.assertEqual(self.toolkit.count_words("hello world foo"), 3)

    def test_count_words_single(self):
        self.assertEqual(self.toolkit.count_words("hello"), 1)

    def test_count_words_empty(self):
        self.assertEqual(self.toolkit.count_words(""), 0)
        self.assertEqual(self.toolkit.count_words("   "), 0)

    def test_char_frequency(self):
        result = self.toolkit.char_frequency("hello")
        self.assertEqual(result, {'h': 1, 'e': 1, 'l': 2, 'o': 1})

    def test_char_frequency_excludes_spaces(self):
        result = self.toolkit.char_frequency("a a")
        self.assertEqual(result, {'a': 2})

    def test_char_frequency_case_sensitive(self):
        result = self.toolkit.char_frequency("Aa")
        self.assertEqual(result, {'A': 1, 'a': 1})

    def test_char_frequency_empty(self):
        self.assertEqual(self.toolkit.char_frequency(""), {})

    def test_find_longest_word(self):
        self.assertEqual(self.toolkit.find_longest_word("the quick brown fox"), "quick")

    def test_find_longest_word_tie_returns_first(self):
        # "cat" and "dog" both length 3; "cat" appears first
        self.assertEqual(self.toolkit.find_longest_word("cat dog"), "cat")

    def test_find_longest_word_empty(self):
        self.assertEqual(self.toolkit.find_longest_word(""), "")
        self.assertEqual(self.toolkit.find_longest_word("   "), "")

    def test_caesar_cipher(self):
        self.assertEqual(self.toolkit.caesar_cipher("abc", 1), "bcd")

    def test_caesar_cipher_wraps_around(self):
        self.assertEqual(self.toolkit.caesar_cipher("xyz", 3), "abc")

    def test_caesar_cipher_preserves_case(self):
        self.assertEqual(self.toolkit.caesar_cipher("AbC", 1), "BcD")

    def test_caesar_cipher_leaves_non_letters(self):
        self.assertEqual(self.toolkit.caesar_cipher("a-b c!", 1), "b-c d!")


if __name__ == '__main__':
    unittest.main()
