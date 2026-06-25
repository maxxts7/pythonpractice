import unittest
from solution import LibrarySystem


class LibrarySystemTest(unittest.TestCase):
    def setUp(self):
        self.library = LibrarySystem()
        # Setup some books and members
        self.library.add_book("B001", "Python Basics", "John Smith")
        self.library.add_book("B002", "Data Structures", "Jane Doe")
        self.library.add_book("B003", "Algorithms", "Bob Wilson")
        self.library.register_member("M001", "Alice")
        self.library.register_member("M002", "Bob")

    def test_borrow_and_return(self):
        result = self.library.borrow_book("M001", "B001", "2024-01-01")
        self.assertTrue(result)
        self.assertIn("B001", self.library.get_member_books("M001"))

        result = self.library.return_book("M001", "B001", "2024-01-10")
        self.assertTrue(result)
        self.assertNotIn("B001", self.library.get_member_books("M001"))

    def test_reserve_book(self):
        # First, have someone borrow the book
        self.library.borrow_book("M001", "B001", "2024-01-01")

        # Now M002 should be able to reserve it
        result = self.library.reserve_book("M002", "B001")
        self.assertTrue(result)

        # M002 should not be able to reserve it again
        result = self.library.reserve_book("M002", "B001")
        self.assertFalse(result)

    def test_reserve_available_book_fails(self):
        # Should not be able to reserve an available book
        result = self.library.reserve_book("M001", "B001")
        self.assertFalse(result)

    def test_reserve_own_borrowed_book_fails(self):
        self.library.borrow_book("M001", "B001", "2024-01-01")
        # M001 should not be able to reserve a book they already have
        result = self.library.reserve_book("M001", "B001")
        self.assertFalse(result)

    def test_cancel_reservation(self):
        self.library.borrow_book("M001", "B001", "2024-01-01")
        self.library.reserve_book("M002", "B001")

        result = self.library.cancel_reservation("M002", "B001")
        self.assertTrue(result)

        # Should be able to reserve again after cancellation
        result = self.library.reserve_book("M002", "B001")
        self.assertTrue(result)

    def test_cancel_nonexistent_reservation(self):
        result = self.library.cancel_reservation("M001", "B001")
        self.assertFalse(result)

    def test_get_overdue_books(self):
        self.library.borrow_book("M001", "B001", "2024-01-01")
        self.library.borrow_book("M002", "B002", "2024-01-10")

        # Check on Jan 20 - B001 should be overdue (19 days), B002 not (10 days)
        overdue = self.library.get_overdue_books("2024-01-20")
        self.assertEqual(len(overdue), 1)
        self.assertEqual(overdue[0]['book_id'], "B001")
        self.assertEqual(overdue[0]['member_id'], "M001")
        self.assertEqual(overdue[0]['days_overdue'], 5)  # 19 - 14 = 5 days overdue

    def test_get_overdue_books_multiple(self):
        self.library.borrow_book("M001", "B001", "2024-01-01")
        self.library.borrow_book("M002", "B002", "2024-01-05")

        # Check on Jan 25 - both should be overdue
        overdue = self.library.get_overdue_books("2024-01-25")
        self.assertEqual(len(overdue), 2)
        book_ids = [b['book_id'] for b in overdue]
        self.assertIn("B001", book_ids)
        self.assertIn("B002", book_ids)

    def test_get_member_history(self):
        self.library.borrow_book("M001", "B001", "2024-01-01")
        self.library.return_book("M001", "B001", "2024-01-10")
        self.library.borrow_book("M001", "B002", "2024-01-15")

        history = self.library.get_member_history("M001")
        self.assertEqual(len(history), 2)

        # Check first record
        self.assertEqual(history[0]['book_id'], "B001")
        self.assertEqual(history[0]['title'], "Python Basics")
        self.assertEqual(history[0]['borrow_date'], "2024-01-01")
        self.assertEqual(history[0]['return_date'], "2024-01-10")

        # Check second record (still borrowed)
        self.assertEqual(history[1]['book_id'], "B002")
        self.assertIsNone(history[1]['return_date'])

    def test_get_member_history_nonexistent(self):
        history = self.library.get_member_history("M999")
        self.assertEqual(history, [])


if __name__ == '__main__':
    unittest.main()
