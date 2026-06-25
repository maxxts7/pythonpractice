import unittest
from solution import FileSystem


class FileSystemTest(unittest.TestCase):
    def setUp(self):
        self.fs = FileSystem()

    # --- Already implemented methods ---

    def test_mkdir_and_exists(self):
        self.assertTrue(self.fs.mkdir("/a/b/c"))
        self.assertTrue(self.fs.exists("/a"))
        self.assertTrue(self.fs.exists("/a/b/c"))
        self.assertFalse(self.fs.exists("/a/b/x"))

    def test_add_and_read_file(self):
        self.assertTrue(self.fs.add_file("/a/file.txt", "hello"))
        self.assertEqual(self.fs.read_file("/a/file.txt"), "hello")
        # intermediate directory should have been created
        self.assertTrue(self.fs.exists("/a"))

    def test_read_nonexistent_file(self):
        self.assertIsNone(self.fs.read_file("/nope.txt"))

    def test_add_file_overwrites(self):
        self.fs.add_file("/f.txt", "one")
        self.fs.add_file("/f.txt", "two")
        self.assertEqual(self.fs.read_file("/f.txt"), "two")

    # --- Methods to implement ---

    def test_ls_directory_sorted(self):
        self.fs.mkdir("/a")
        self.fs.add_file("/a/z.txt", "")
        self.fs.add_file("/a/a.txt", "")
        self.fs.mkdir("/a/sub")
        self.assertEqual(self.fs.ls("/a"), ["a.txt", "sub", "z.txt"])

    def test_ls_file_returns_name(self):
        self.fs.add_file("/a/file.txt", "x")
        self.assertEqual(self.fs.ls("/a/file.txt"), ["file.txt"])

    def test_ls_root(self):
        self.fs.add_file("/b.txt", "")
        self.fs.mkdir("/a")
        self.assertEqual(self.fs.ls("/"), ["a", "b.txt"])

    def test_ls_nonexistent(self):
        self.assertEqual(self.fs.ls("/nope"), [])

    def test_append_to_file(self):
        self.fs.add_file("/f.txt", "foo")
        self.assertTrue(self.fs.append_to_file("/f.txt", "bar"))
        self.assertEqual(self.fs.read_file("/f.txt"), "foobar")

    def test_append_to_nonexistent(self):
        self.assertFalse(self.fs.append_to_file("/nope.txt", "x"))

    def test_append_to_directory_fails(self):
        self.fs.mkdir("/a")
        self.assertFalse(self.fs.append_to_file("/a", "x"))

    def test_delete_file(self):
        self.fs.add_file("/a/f.txt", "x")
        self.assertTrue(self.fs.delete("/a/f.txt"))
        self.assertFalse(self.fs.exists("/a/f.txt"))
        # parent directory should still exist
        self.assertTrue(self.fs.exists("/a"))

    def test_delete_directory_recursive(self):
        self.fs.add_file("/a/b/f.txt", "x")
        self.assertTrue(self.fs.delete("/a"))
        self.assertFalse(self.fs.exists("/a"))
        self.assertFalse(self.fs.exists("/a/b/f.txt"))

    def test_delete_nonexistent(self):
        self.assertFalse(self.fs.delete("/nope"))

    def test_delete_root_fails(self):
        self.assertFalse(self.fs.delete("/"))

    def test_find_files(self):
        self.fs.add_file("/a/readme.txt", "")
        self.fs.add_file("/a/b/notes.txt", "")
        self.fs.add_file("/a/image.png", "")
        self.assertEqual(
            self.fs.find_files(".txt"),
            ["/a/b/notes.txt", "/a/readme.txt"],
        )

    def test_find_files_none(self):
        self.fs.add_file("/a/file.md", "")
        self.assertEqual(self.fs.find_files(".txt"), [])


if __name__ == '__main__':
    unittest.main()
