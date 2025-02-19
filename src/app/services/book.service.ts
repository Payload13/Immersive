import { Injectable } from "@angular/core";
import { open } from "@tauri-apps/api/dialog";
import {
  readBinaryFile,
  writeBinaryFile,
  readDir,
  createDir,
  BaseDirectory,
  removeFile,
} from "@tauri-apps/api/fs";
import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";
import { BehaviorSubject } from "rxjs";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  path: string;
  progress: number;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  lastRead: Date;
}

export interface Bookmark {
  id: string;
  cfi: string;
  text: string;
  createdAt: Date;
}

export interface Highlight {
  id: string;
  cfi: string;
  text: string;
  color: string;
  note?: string;
  createdAt: Date;
}

@Injectable({
  providedIn: "root",
})
export class BookService {
  private books = new BehaviorSubject<Book[]>([]);
  books$ = this.books.asObservable();

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      const appData = await appDataDir();
      await createDir(`${appData}books`, { recursive: true });
      await createDir(`${appData}metadata`, { recursive: true });
      await this.loadBooks();
    } catch (error) {
      console.error("Failed to initialize storage:", error);
    }
  }

  private async loadBooks() {
    try {
      const appData = await appDataDir();
      const metadataFiles = await readDir(`${appData}metadata`);
      const books: Book[] = [];

      for (const file of metadataFiles) {
        if (file.name?.endsWith(".json")) {
          try {
            const content = await readBinaryFile(
              `${appData}metadata/${file.name}`
            );
            const book = JSON.parse(new TextDecoder().decode(content));

            // Don't try to load cover here - we'll handle it in the component
            books.push(book);
          } catch (parseError) {
            console.error(
              `Failed to parse book metadata: ${file.name}`,
              parseError
            );
          }
        }
      }

      this.books.next(
        books.sort(
          (a, b) =>
            new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
        )
      );
    } catch (error) {
      console.error("Failed to load books:", error);
    }
  }

  async importBook(): Promise<Book | null> {
    try {
      console.log("Opening file dialog...");
      const selected = await open({
        multiple: false,
        filters: [{ name: "EPUB", extensions: ["epub"] }],
      });

      if (!selected || Array.isArray(selected)) return null;

      const fileName = selected.split(/[\\/]/).pop() || "unknown.epub";
      const appData = await appDataDir();
      const existingBooks = this.books.value; // Get current books

      // Check if a book with the same title already exists
      const isDuplicate = existingBooks.some(
        (b) =>
          b.path === selected ||
          b.title.toLowerCase() === fileName.toLowerCase()
      );
      if (isDuplicate) {
        console.warn(`Book "${fileName}" is already imported.`);
        return null;
      }

      const bookId = crypto.randomUUID();
      const bookPath = `${appData}books/${bookId}.epub`;

      console.log(`Selected file: ${fileName}, storing as ${bookPath}`);

      const bookContent = await readBinaryFile(selected);
      await writeBinaryFile(bookPath, bookContent);

      // Use Rust API to extract metadata and cover
      console.log("Invoking Rust API for metadata extraction...");
      const response: { title: string; author: string; cover?: string } =
        await invoke("extract_metadata", {
          filePath: bookPath,
        });

      console.log("Rust API response:", response);

      const book: Book = {
        id: bookId,
        title: response.title,
        author: response.author,
        path: bookPath,
        coverUrl: response.cover, // The cover is now directly a Base64 string
        progress: 0,
        bookmarks: [],
        highlights: [],
        lastRead: new Date(),
      };

      await this.saveBookMetadata(book);

      // ✅ Correctly update books without duplication issues
      this.books.next([book, ...existingBooks]);

      return book;
    } catch (error) {
      console.error("Failed to import book:", error);
      return null;
    }
  }

  async loadCover(book: Book) {
    // If coverUrl is already a Base64 string (starts with "data:"), we don't need to load it
    if (book.coverUrl && book.coverUrl.startsWith("data:")) {
      return;
    }

    try {
      const appData = await appDataDir();
      const coverPath = `${appData}books/${book.id}.cover.jpg`;

      // Use Rust API to get cover as Base64
      const coverBase64 = await invoke<string>("get_cover_base64", {
        filePath: coverPath,
      });

      // Update the book with the Base64 image
      book.coverUrl = coverBase64;

      // Update the book collection
      const updatedBooks = this.books.value.map((b) =>
        b.id === book.id ? { ...b, coverUrl: coverBase64 } : b
      );
      this.books.next(updatedBooks);
    } catch (error) {
      console.error(`Failed to load cover for book ${book.id}:`, error);
      // Don't set to undefined - keep the existing value in case of temporary error
    }
  }

  async saveBookMetadata(book: Book) {
    try {
      const appData = await appDataDir();
      await writeBinaryFile(
        `${appData}metadata/${book.id}.json`,
        new TextEncoder().encode(JSON.stringify(book, null, 2))
      );
    } catch (error) {
      console.error("Failed to save book metadata:", error);
      throw error;
    }
  }

  async updateBookProgress(book: Book, progress: number) {
    book.progress = progress;
    book.lastRead = new Date();
    await this.saveBookMetadata(book);

    // ✅ Ensure books observable updates properly
    const updatedBooks = this.books.value.map((b) =>
      b.id === book.id ? book : b
    );
    this.books.next(updatedBooks);
  }

  async readBookFile(path: string): Promise<string> {
    try {
      return await invoke("read_epub_content", { filePath: path });
    } catch (error) {
      console.error("Failed to read book file:", error);
      throw new Error("Could not read book content");
    }
  }

  async addHighlight(
    book: Book,
    cfi: string,
    text: string,
    color: string,
    note?: string
  ) {
    const highlight: Highlight = {
      id: crypto.randomUUID(),
      cfi,
      text,
      color,
      note,
      createdAt: new Date(),
    };

    book.highlights.push(highlight);
    await this.saveBookMetadata(book);
    return highlight;
  }

  async deleteBook(book: Book) {
    try {
      const appData = await appDataDir();
      const bookPath = `${appData}books/${book.id}.epub`;
      const metadataPath = `${appData}metadata/${book.id}.json`;
      const coverPath = `${appData}books/${book.id}.cover.jpg`;

      await removeFile(bookPath).catch((err) =>
        console.warn("Failed to delete EPUB file:", err)
      );
      await removeFile(metadataPath).catch((err) =>
        console.warn("Failed to delete metadata:", err)
      );
      await removeFile(coverPath).catch((err) =>
        console.warn("Failed to delete cover image:", err)
      );

      this.books.next(this.books.value.filter((b) => b.id !== book.id));
    } catch (error) {
      console.error("Failed to delete book:", error);
    }
  }
}
