import { Injectable } from '@angular/core';
import { open } from '@tauri-apps/api/dialog';
import { readBinaryFile, writeFile, readDir, createDir, BaseDirectory } from '@tauri-apps/api/fs';
import { BehaviorSubject } from 'rxjs';

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
  providedIn: 'root'
})
export class BookService {
  private books = new BehaviorSubject<Book[]>([]);
  books$ = this.books.asObservable();
  
  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      // Create necessary directories
      await createDir('books', { dir: BaseDirectory.App, recursive: true });
      await createDir('metadata', { dir: BaseDirectory.App, recursive: true });
      await this.loadBooks();
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  private async loadBooks() {
    try {
      const metadataFiles = await readDir('metadata', { dir: BaseDirectory.App });
      const books: Book[] = [];
      
      for (const file of metadataFiles) {
        if (file.name?.endsWith('.json')) {
          const content = await readBinaryFile(`metadata/${file.name}`, { dir: BaseDirectory.App });
          const book = JSON.parse(new TextDecoder().decode(content));
          books.push(book);
        }
      }
      
      this.books.next(books.sort((a, b) => 
        new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
      ));
    } catch (error) {
      console.error('Failed to load books:', error);
    }
  }

  async readBookFile(path: string): Promise<ArrayBuffer> {
    try {
      return await readBinaryFile(path, { dir: BaseDirectory.App });
    } catch (error) {
      console.error('Failed to read book file:', error);
      throw new Error('Could not read book file');
    }
  }

  async importBook() {
    try {
      // Open file dialog
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'EPUB',
          extensions: ['epub']
        }]
      });

      if (!selected || Array.isArray(selected)) return null;

      const fileName = selected.split(/[\\/]/).pop() || 'unknown.epub';
      const bookId = crypto.randomUUID();
      const bookPath = `books/${bookId}.epub`;
      
      const bookContent = await readBinaryFile(selected);
      await writeFile(bookPath, new TextDecoder().decode(bookContent), { dir: BaseDirectory.App });
      
      // Create book metadata
      const book: Book = {
        id: bookId,
        title: fileName.replace('.epub', ''),
        author: 'Unknown',
        path: bookPath,
        progress: 0,
        bookmarks: [],
        highlights: [],
        lastRead: new Date()
      };

      // Save metadata
      await this.saveBookMetadata(book);
      
      // Update books list
      const currentBooks = this.books.value;
      this.books.next([book, ...currentBooks]);

      return book;
    } catch (error) {
      console.error('Failed to import book:', error);
      throw error;
    }
  }

  async saveBookMetadata(book: Book) {
    try {
      await writeFile(
        `metadata/${book.id}.json`,
        JSON.stringify(book, null, 2),
        { dir: BaseDirectory.App }
      );
    } catch (error) {
      console.error('Failed to save book metadata:', error);
      throw error;
    }
  }

  async addBookmark(book: Book, cfi: string, text: string) {
    const bookmark: Bookmark = {
      id: crypto.randomUUID(),
      cfi,
      text,
      createdAt: new Date()
    };
    
    book.bookmarks.push(bookmark);
    await this.saveBookMetadata(book);
    return bookmark;
  }

  async addHighlight(book: Book, cfi: string, text: string, color: string, note?: string) {
    const highlight: Highlight = {
      id: crypto.randomUUID(),
      cfi,
      text,
      color,
      note,
      createdAt: new Date()
    };
    
    book.highlights.push(highlight);
    await this.saveBookMetadata(book);
    return highlight;
  }

  async updateBookProgress(book: Book, progress: number) {
    book.progress = progress;
    book.lastRead = new Date();
    await this.saveBookMetadata(book);
    
    // Update books list to reflect changes
    const currentBooks = this.books.value;
    const updatedBooks = currentBooks.map(b => 
      b.id === book.id ? book : b
    );
    this.books.next(updatedBooks);
  }
}