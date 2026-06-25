"""
In-Memory File System

You are building a simple in-memory file system that supports directories and
files. Paths are absolute and use '/' as a separator (e.g. '/a/b/file.txt').
The root is '/'.

Some methods are already implemented. Your task is to implement the remaining methods.

Methods to implement:
1. ls(path) - List the contents of a directory (or the file's own name)
2. append_to_file(path, content) - Append content to an existing file
3. delete(path) - Delete a file or directory (recursively)
4. find_files(extension) - Find all files whose name ends with a given extension
"""

from typing import List, Optional, Dict


class FileSystem:
    def __init__(self):
        # Each node is a dict:
        #   directory -> {'type': 'dir', 'children': {name: node}}
        #   file      -> {'type': 'file', 'content': str}
        self.root: Dict = {'type': 'dir', 'children': {}}

    def _split(self, path: str) -> List[str]:
        """Split an absolute path into its parts. '/' -> [], '/a/b' -> ['a', 'b']."""
        return [part for part in path.split('/') if part]

    def _get_node(self, path: str) -> Optional[Dict]:
        """Return the node at the given path, or None if it doesn't exist."""
        node = self.root
        for part in self._split(path):
            if node['type'] != 'dir' or part not in node['children']:
                return None
            node = node['children'][part]
        return node

    def mkdir(self, path: str) -> bool:
        """
        Create a directory, including any intermediate directories.
        Returns False if any part of the path already exists as a file.
        """
        node = self.root
        for part in self._split(path):
            if part not in node['children']:
                node['children'][part] = {'type': 'dir', 'children': {}}
            node = node['children'][part]
            if node['type'] != 'dir':
                return False
        return True

    def add_file(self, path: str, content: str) -> bool:
        """
        Create a file with the given content, overwriting it if it already exists.
        Intermediate directories are created as needed.
        Returns False if the target already exists as a directory, or if a parent
        component is a file.
        """
        parts = self._split(path)
        if not parts:
            return False
        node = self.root
        for part in parts[:-1]:
            if part not in node['children']:
                node['children'][part] = {'type': 'dir', 'children': {}}
            node = node['children'][part]
            if node['type'] != 'dir':
                return False
        name = parts[-1]
        existing = node['children'].get(name)
        if existing is not None and existing['type'] == 'dir':
            return False
        node['children'][name] = {'type': 'file', 'content': content}
        return True

    def read_file(self, path: str) -> Optional[str]:
        """Return the content of a file, or None if it doesn't exist or is a directory."""
        node = self._get_node(path)
        if node is None or node['type'] != 'file':
            return None
        return node['content']

    def exists(self, path: str) -> bool:
        """Return True if a file or directory exists at the path."""
        return self._get_node(path) is not None

    # TODO: Implement the following methods

    def ls(self, path: str) -> List[str]:
        """
        List the contents of the path.
        - If path is a directory, return a sorted list of the names of its
          immediate children (both files and subdirectories).
        - If path is a file, return a list containing just the file's name.
        - If the path doesn't exist, return an empty list.
        """
        pass

    def append_to_file(self, path: str, content: str) -> bool:
        """
        Append content to an existing file.
        - Returns False if the path doesn't exist or is a directory.
        - Returns True and appends the content otherwise.
        """
        pass

    def delete(self, path: str) -> bool:
        """
        Delete the file or directory at the path. Directories are removed
        recursively along with all of their contents.
        - Returns False if the path doesn't exist or is the root '/'.
        - Returns True on successful deletion.
        """
        pass

    def find_files(self, extension: str) -> List[str]:
        """
        Return a sorted list of the absolute paths of all files whose name ends
        with the given extension (e.g. '.txt').
        Example: ['/docs/readme.txt', '/notes.txt']
        Return an empty list if none are found.
        """
        pass
