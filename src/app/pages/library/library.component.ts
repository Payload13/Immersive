import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { BookService, Book } from "../../services/book.service";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { convertFileSrc } from "@tauri-apps/api/tauri";

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
        >
          Import Book
        </button>
        <button
          (click)="toggleMultiSelect()"
          class="px-4 py-2 bg-gray-500 text-white rounded-lg"
        >
          {{ multiSelect ? "Cancel" : "Select Books" }}
        </button>
      </div>

      <!-- My Library Section -->
      <div *ngIf="books.length > 0" class="mb-12">
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          <div
            *ngFor="let book of filteredBooks()"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer group relative"
            (click)="openBook(book.id)"
          >
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
              (click)="showDetails($event, book)"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-gray-700 text-white p-1 rounded-full"
            >
              &#8942;
            </button>
          </div>
        </div>
      </div>

      <!-- Book Details Card -->
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

  constructor(private bookService: BookService, private router: Router) {}

  ngOnInit() {
    this.bookService.books$.subscribe((books) => {
      console.log("Books updated in Library:", books);

      // The covers should already be Base64 data, no need for convertFileSrc
      this.books = books.map((book) => ({
        ...book,
      }));

      // Load covers for any books that need them
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
  }

  showDetails(event: Event, book: Book) {
    event.stopPropagation(); // Prevent the click from propagating to the book card
    this.selectedBook = book;
  }

  async importBook() {
    try {
      const book = await this.bookService.importBook();
      if (book) {
        // The cover should already be Base64 encoded from the Rust backend
        console.log("Book imported successfully:", book.title);
      }
    } catch (error) {
      console.error("Error importing book:", error);
    }
  }

  async deleteBook(book: Book) {
    if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
      await this.bookService.deleteBook(book);
      this.selectedBook = null;
    }
  }

  openBook(bookId: string) {
    if (!this.multiSelect) {
      this.router.navigate(["/read", bookId]);
    }
  }
}
