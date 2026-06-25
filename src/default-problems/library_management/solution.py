"""
Library Management System

You are building a library management system that tracks books, members, and borrowing.
Some methods are already implemented. Your task is to implement the remaining methods.

Methods to implement:
1. reserve_book(member_id, book_id) - Reserve a book for a member (if available and not already borrowed)
2. cancel_reservation(member_id, book_id) - Cancel a reservation
3. get_overdue_books(current_date) - Get all books that are overdue (borrowed more than 14 days ago)
4. get_member_history(member_id) - Get borrowing history for a member (list of all books ever borrowed)
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta


class LibrarySystem:
    def __init__(self):
        self.books: Dict[str, Dict] = {}  # book_id -> {title, author, is_available}
        self.members: Dict[str, Dict] = {}  # member_id -> {name, borrowed_books, history}
        self.borrowings: Dict[str, Dict] = {}  # book_id -> {member_id, borrow_date}
        self.reservations: Dict[str, List[str]] = {}  # book_id -> [member_ids in queue]

    def add_book(self, book_id: str, title: str, author: str) -> bool:
        if book_id in self.books:
            return False
        self.books[book_id] = {'title': title, 'author': author, 'is_available': True}
        return True

    def register_member(self, member_id: str, name: str) -> bool:
        if member_id in self.members:
            return False
        self.members[member_id] = {'name': name, 'borrowed_books': [], 'history': []}
        return True

    def borrow_book(self, member_id: str, book_id: str, borrow_date: str) -> bool:
        if member_id not in self.members or book_id not in self.books:
            return False
        if not self.books[book_id]['is_available']:
            return False

        self.books[book_id]['is_available'] = False
        self.members[member_id]['borrowed_books'].append(book_id)
        self.members[member_id]['history'].append({
            'book_id': book_id,
            'borrow_date': borrow_date,
            'return_date': None
        })
        self.borrowings[book_id] = {
            'member_id': member_id,
            'borrow_date': borrow_date
        }
        return True

    def return_book(self, member_id: str, book_id: str, return_date: str) -> bool:
        if member_id not in self.members or book_id not in self.books:
            return False
        if book_id not in self.members[member_id]['borrowed_books']:
            return False

        self.books[book_id]['is_available'] = True
        self.members[member_id]['borrowed_books'].remove(book_id)

        # Update history with return date
        for record in self.members[member_id]['history']:
            if record['book_id'] == book_id and record['return_date'] is None:
                record['return_date'] = return_date
                break

        del self.borrowings[book_id]
        return True

    def get_available_books(self) -> List[Dict]:
        return [
            {'book_id': book_id, 'title': info['title'], 'author': info['author']}
            for book_id, info in self.books.items()
            if info['is_available']
        ]

    def get_member_books(self, member_id: str) -> List[str]:
        if member_id not in self.members:
            return []
        return self.members[member_id]['borrowed_books']

    # TODO: Implement the following methods

    def reserve_book(self, member_id: str, book_id: str) -> bool:
        """
        Reserve a book for a member.
        - Returns False if member or book doesn't exist
        - Returns False if book is available (should borrow instead)
        - Returns False if member already has this book borrowed
        - Returns False if member already has a reservation for this book
        - Returns True and adds member to reservation queue otherwise
        """
        pass

    def cancel_reservation(self, member_id: str, book_id: str) -> bool:
        """
        Cancel a reservation for a member.
        - Returns False if member or book doesn't exist
        - Returns False if member doesn't have a reservation for this book
        - Returns True and removes member from reservation queue otherwise
        """
        pass

    def get_overdue_books(self, current_date: str) -> List[Dict]:
        """
        Get all books that are overdue (borrowed more than 14 days ago).
        Date format: 'YYYY-MM-DD'
        Returns list of dicts with: book_id, title, member_id, member_name, days_overdue
        """
        pass

    def get_member_history(self, member_id: str) -> List[Dict]:
        """
        Get complete borrowing history for a member.
        Returns list of dicts with: book_id, title, author, borrow_date, return_date
        Return empty list if member doesn't exist.
        """
        pass
