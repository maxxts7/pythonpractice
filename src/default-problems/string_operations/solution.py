"""
String Operations Toolkit

You are building a collection of utility functions that operate on strings.
Some methods are already implemented. Your task is to implement the remaining methods.

Methods to implement:
1. count_words(s) - Count the number of words in a string
2. char_frequency(s) - Count how many times each (non-space) character appears
3. find_longest_word(s) - Return the longest word in a string
4. caesar_cipher(s, shift) - Shift each letter by a given amount
"""

from typing import Dict


class StringToolkit:
    def reverse_string(self, s: str) -> str:
        """Return the string reversed."""
        return s[::-1]

    def count_vowels(self, s: str) -> int:
        """Return the number of vowels (a, e, i, o, u) in the string, case-insensitive."""
        return sum(1 for ch in s.lower() if ch in 'aeiou')

    def is_palindrome(self, s: str) -> bool:
        """
        Return True if the string is a palindrome.
        Ignores case and any non-alphanumeric characters.
        """
        cleaned = [ch.lower() for ch in s if ch.isalnum()]
        return cleaned == cleaned[::-1]

    def capitalize_words(self, s: str) -> str:
        """Return the string with the first letter of each word capitalized."""
        return ' '.join(word.capitalize() for word in s.split())

    # TODO: Implement the following methods

    def count_words(self, s: str) -> int:
        """
        Count the number of words in the string.
        Words are sequences separated by whitespace.
        Return 0 for an empty or whitespace-only string.
        Example: "hello world foo" -> 3
        """
        pass

    def char_frequency(self, s: str) -> Dict[str, int]:
        """
        Count how many times each character appears, excluding spaces.
        Counting is case-sensitive.
        Example: "hello" -> {'h': 1, 'e': 1, 'l': 2, 'o': 1}
        Return an empty dict for an empty string.
        """
        pass

    def find_longest_word(self, s: str) -> str:
        """
        Return the longest word in the string.
        If multiple words share the longest length, return the first one.
        Return an empty string if there are no words.
        Example: "the quick brown fox" -> "quick"
        """
        pass

    def caesar_cipher(self, s: str, shift: int) -> str:
        """
        Shift each alphabetic character forward by `shift` positions, wrapping
        around the alphabet. Preserve the case of each letter, and leave
        non-alphabetic characters unchanged.
        Example: caesar_cipher("abc", 1) -> "bcd"
        Example: caesar_cipher("xyz", 3) -> "abc"
        """
        pass
