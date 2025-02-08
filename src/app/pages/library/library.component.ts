import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookService, Book } from '../../services/book.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Search Bar -->
      <div class="mb-8">
        <div class="relative">
          <input
            type="text"
            placeholder="Search books..."
            class="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button class="absolute right-4 top-1/2 transform -translate-y-1/2">
            🔍
          </button>
        </div>
      </div>

      <!-- Continue Reading Section -->
      <div *ngIf="lastReadBook" class="mb-12">
        <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Continue Reading</h2>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex items-center">
          <div class="w-24 h-36 bg-gray-200 dark:bg-gray-700 rounded mr-6">
            <img *ngIf="lastReadBook.coverUrl"
                 [src]="lastReadBook.coverUrl"
                 [alt]="lastReadBook.title"
                 class="w-full h-full object-cover rounded">
            <div *ngIf="!lastReadBook.coverUrl"
                 class="w-full h-full flex items-center justify-center">
              <span class="text-2xl font-bold text-gray-400">{{ lastReadBook.title[0] }}</span>
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold mb-2">{{ lastReadBook.title }}</h3>
            <p class="text-gray-600 dark:text-gray-400 mb-4">{{ lastReadBook.author }}</p>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <div class="bg-blue-500 h-2 rounded-full"
                   [style.width.%]="lastReadBook.progress * 100"></div>
            </div>
            <button (click)="openBook(lastReadBook.id)"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Continue Reading
            </button>
          </div>
        </div>
      </div>

      <!-- Get Started Section (when no books) -->
      <div *ngIf="books.length === 0" class="mb-12">
        <div class="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Welcome to Immersive</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-8">Start your reading journey by importing your first book</p>
          <button (click)="importBook()"
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Import Your First Book
          </button>
        </div>
      </div>

      <!-- My Library Section -->
      <div *ngIf="books.length > 0" class="mb-12">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">My Library</h2>
          <button (click)="importBook()"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Import Book
          </button>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div *ngFor="let book of books"
               class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer"
               (click)="openBook(book.id)">
            <div class="aspect-w-2 aspect-h-3 bg-gray-200 dark:bg-gray-700">
              <img *ngIf="book.coverUrl"
                   [src]="book.coverUrl"
                   [alt]="book.title"
                   class="object-cover w-full h-full">
              <div *ngIf="!book.coverUrl"
                   class="flex items-center justify-center h-full">
                <span class="text-2xl font-bold text-gray-400">{{ book.title[0] }}</span>
              </div>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ book.title }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ book.author }}</p>
              <div class="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded">
                <div class="h-full bg-blue-500 rounded"
                     [style.width.%]="book.progress * 100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LibraryComponent implements OnInit {
  books: Book[] = [];
  lastReadBook: Book | null = null;

  constructor(
    private bookService: BookService,
    private router: Router
  ) {}

  ngOnInit() {
    this.bookService.books$.subscribe(books => {
      this.books = books;
      // Get the most recently read book
      this.lastReadBook = books.length > 0 
        ? books.reduce((latest, current) => 
            new Date(current.lastRead) > new Date(latest.lastRead) ? current : latest
          )
        : null;
    });
  }

  async importBook() {
    try {
      const book = await this.bookService.importBook();
      if (book) {
        this.openBook(book.id);
      }
    } catch (error) {
      console.error('Failed to import book:', error);
    }
  }

  openBook(bookId: string) {
    this.router.navigate(['/read', bookId]);
  }
}