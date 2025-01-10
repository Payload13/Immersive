import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookService, Book } from '../../services/book.service';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">My Library</h1>
        <div class="space-x-4">
          <button
            *ngIf="selectedBooks.length === 2"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            (click)="openParallelReader()"
          >
            Read Selected in Parallel
          </button>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            (click)="importBook()"
          >
            Import Book
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div *ngFor="let book of books"
             class="relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
             [class.ring-2]="isSelected(book)"
             [class.ring-blue-500]="isSelected(book)"
             (click)="toggleBookSelection(book)">
          <div class="aspect-w-2 aspect-h-3 bg-gray-200">
            <img *ngIf="book.coverUrl"
                 [src]="book.coverUrl"
                 [alt]="book.title"
                 class="object-cover">
            <div *ngIf="!book.coverUrl"
                 class="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700">
              <span class="text-xl font-bold text-gray-400">{{ book.title[0] }}</span>
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ book.title }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ book.author }}</p>
            <div class="mt-2 h-1 bg-gray-200 rounded">
              <div class="h-full bg-blue-500 rounded"
                   [style.width.%]="book.progress * 100"></div>
            </div>
          </div>
        </div>

        <div *ngIf="books.length === 0"
             class="col-span-full text-center text-gray-600 dark:text-gray-400 py-8">
          No books in your library yet. Import some books to get started!
        </div>
      </div>
    </div>
  `
})
export class LibraryComponent {
  books: Book[] = [];
  selectedBooks: Book[] = [];

  constructor(private bookService: BookService) {
    this.bookService.books$.subscribe(books => {
      this.books = books;
    });
  }

  async importBook() {
    try {
      await this.bookService.importBook();
    } catch (error) {
      console.error('Failed to import book:', error);
    }
  }

  toggleBookSelection(book: Book) {
    const index = this.selectedBooks.findIndex(b => b.id === book.id);
    if (index === -1) {
      if (this.selectedBooks.length < 2) {
        this.selectedBooks.push(book);
      }
    } else {
      this.selectedBooks.splice(index, 1);
    }
  }

  isSelected(book: Book): boolean {
    return this.selectedBooks.some(b => b.id === book.id);
  }

  openParallelReader() {
    if (this.selectedBooks.length === 2) {
      window.location.href = `/parallel/${this.selectedBooks[0].id}/${this.selectedBooks[1].id}`;
    }
  }
}