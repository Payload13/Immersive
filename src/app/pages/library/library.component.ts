import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { BookService, Book } from "../../services/book.service";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { invoke } from "@tauri-apps/api/tauri";

@Component({
  selector: "app-library",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Search Bar -->
      <div class="mb-8 flex items-center gap-4">
        <div class="relative w-full">
          <input
            type="text"
            placeholder="Search books..."
            class="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            [(ngModel)]="searchQuery"
          />
          <button class="absolute right-4 top-1/2 transform -translate-y-1/2">
            🔍
          </button>
        </div>
        <button
          (click)="importBook()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          [class.opacity-50]="multiSelect"
          [disabled]="multiSelect"
        >
          Import Book
        </button>
        <button
          (click)="toggleMultiSelect()"
          class="px-4 py-2 rounded-lg transition-colors"
          [class.bg-blue-600]="multiSelect"
          [class.bg-gray-500]="!multiSelect"
          [class.text-white]="true"
        >
          {{ multiSelect ? "Cancel Selection" : "Select Books" }}
        </button>
        <button
          *ngIf="multiSelect && selectedBooks.size > 0"
          (click)="deleteSelectedBooks()"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete Selected ({{ selectedBooks.size }})
        </button>
      </div>

      <!-- Loading Animation -->
      <div *ngIf="loading" class="flex justify-center items-center my-4">
        <div class="flex space-x-2">
          <div class="w-3 h-3 bg-gray-400 rounded-full animate-bounce"></div>
          <div
            class="w-3 h-3 bg-gray-500 rounded-full animate-bounce delay-150"
          ></div>
          <div
            class="w-3 h-3 bg-gray-600 rounded-full animate-bounce delay-300"
          ></div>
        </div>
      </div>

      <!-- My Library Section -->
      <div *ngIf="books.length > 0" class="mb-12">
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          <div
            *ngFor="let book of filteredBooks()"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer group relative"
            [class.ring-2]="multiSelect && isSelected(book)"
            [class.ring-blue-500]="multiSelect && isSelected(book)"
            (click)="handleBookClick(book)"
          >
            <!-- Selection Overlay -->
            <div *ngIf="multiSelect" class="absolute top-2 left-2 z-10">
              <div
                class="w-6 h-6 rounded border-2"
                [class.bg-blue-500]="isSelected(book)"
                [class.border-blue-500]="isSelected(book)"
                [class.border-gray-300]="!isSelected(book)"
              >
                <svg
                  *ngIf="isSelected(book)"
                  class="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <div class="aspect-w-2 aspect-h-3 bg-gray-200 dark:bg-gray-700">
              <img
                *ngIf="book.coverUrl"
                [src]="book.coverUrl"
                [alt]="book.title"
                class="object-cover w-full h-full"
              />
              <div
                *ngIf="!book.coverUrl"
                class="flex items-center justify-center h-full"
              >
                <span
                  *ngIf="book.title"
                  class="text-2xl font-bold text-gray-400"
                >
                  {{ book.title[0] }}
                </span>
                <span
                  *ngIf="!book.title"
                  class="text-2xl font-bold text-gray-400"
                  >📖</span
                >
              </div>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
                {{ book.title }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ book.author }}
              </p>
              <div class="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded">
                <div
                  class="h-full bg-blue-500 rounded"
                  [style.width.%]="book.progress * 100"
                ></div>
              </div>
            </div>

            <!-- More Options Button -->
            <button
              *ngIf="!multiSelect"
              (click)="showDetails($event, book)"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-gray-700 text-white p-1 rounded-full"
            >
              &#8942;
            </button>
          </div>
        </div>
      </div>

      <!-- Book Details Modal -->
      <div
        *ngIf="selectedBook"
        class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <div
          class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm"
        >
          <img
            [src]="selectedBook.coverUrl"
            class="w-full h-48 object-cover rounded-lg mb-4"
          />
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ selectedBook.title }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            Author: {{ selectedBook.author }}
          </p>
          <div class="flex justify-between mt-4">
            <button
              (click)="deleteBook(selectedBook)"
              class="bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              Delete
            </button>
            <button
              (click)="selectedBook = null"
              class="bg-gray-500 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LibraryComponent implements OnInit {
  books: Book[] = [];
  lastReadBook: Book | null = null;
  selectedBook: Book | null = null;
  searchQuery = "";
  multiSelect = false;
  selectedBooks = new Set<string>(); // Store selected book IDs
  loading = false;

  constructor(private bookService: BookService, private router: Router) {}

  ngOnInit() {
    this.bookService.books$.subscribe((books) => {
      console.log("Books updated in Library:", books);
      this.books = books;
      this.checkStoragePath();
      this.loadAllCovers();
    });
  }

  private async loadAllCovers() {
    for (const book of this.books) {
      if (!book.coverUrl || !book.coverUrl.startsWith("data:")) {
        try {
          await this.bookService.loadCover(book);
        } catch (error) {
          console.error(`Failed to load cover for book ${book.id}:`, error);
        }
      }
    }
  }

  async checkStoragePath() {
    try {
      const path = await invoke("check_storage_path");
      console.log("Resolved Path:", path);
    } catch (error) {
      console.error("Error:", error);
    }
  }

  filteredBooks() {
    if (!this.searchQuery || this.searchQuery.trim() === "") {
      return this.books;
    }
    return this.books.filter(
      (book) =>
        book.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  toggleMultiSelect() {
    this.multiSelect = !this.multiSelect;
    if (!this.multiSelect) {
      // Clear selections when exiting multi-select mode
      this.selectedBooks.clear();
    }
  }

  isSelected(book: Book): boolean {
    return this.selectedBooks.has(book.id);
  }

  handleBookClick(book: Book) {
    if (this.multiSelect) {
      if (this.selectedBooks.has(book.id)) {
        this.selectedBooks.delete(book.id);
      } else {
        this.selectedBooks.add(book.id);
      }
    } else {
      this.openBook(book.id);
    }
  }

  async deleteSelectedBooks() {
    if (this.selectedBooks.size === 0) return;

    const count = this.selectedBooks.size;
    const delStatus = await confirm(
      `Are you sure you want to delete ${count} selected book${
        count > 1 ? "s" : ""
      }?`
    );
    if (delStatus) {
      for (const bookId of this.selectedBooks) {
        const book = this.books.find((b) => b.id === bookId);
        if (book) {
          await this.bookService.deleteBook(book);
        }
      }
      this.selectedBooks.clear();
      this.multiSelect = false;
    }
  }

  showDetails(event: Event, book: Book) {
    event.stopPropagation();
    this.selectedBook = book;
  }

  async importBook() {
    this.loading = true; // Show loading animation
    try {
      const book = await this.bookService.importBook();
      if (book) {
        console.log("Book imported successfully:", book.title);
      }
    } catch (error) {
      console.error("Error importing book:", error);
    } finally {
      this.loading = false; //Hide loading animation
    }
  }

  async deleteBook(book: Book) {
    const delStatus = await confirm(
      `Are you sure you want to delete "${book.title}"?`
    );
    if (delStatus) {
      await this.bookService.deleteBook(book);
      this.selectedBook = null;
    }
  }

  openBook(bookId: string) {
    if (!this.multiSelect) {
      const book = this.books.find((b) => b.id === bookId);
      this.router.navigate(["/read", bookId], {
        state: {
          bookData: book, // Pass the full book object
          epubPath: book?.path,
        },
      });
    }
  }
}
