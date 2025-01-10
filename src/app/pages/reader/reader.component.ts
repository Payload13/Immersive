import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SettingsPanelComponent } from '../../components/settings-panel.component';
import { SearchPanelComponent } from '../../components/search-panel.component';
import { LookupPanelComponent } from '../../components/lookup-panel.component';
import { ExcerptPanelComponent } from '../../components/excerpt-panel.component';
import { ExcerptService } from '../../services/excerpt.service';
import { LookupService } from '../../services/lookup.service';
import { BookService, Book } from '../../services/book.service';
import { SettingsService } from '../../services/settings.service';
import ePub from 'epubjs';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SettingsPanelComponent,
    SearchPanelComponent,
    LookupPanelComponent,
    ExcerptPanelComponent
  ],
  template: `
    <div class="flex h-screen">
      <!-- Main reader area -->
      <div class="flex-1 relative">
        <div #readerContainer class="h-full"></div>
        
        <!-- Navigation controls -->
        <div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <button 
            (click)="prev()" 
            class="p-2 rounded-full bg-gray-800/50 text-white hover:bg-gray-800/75"
          >
            ←
          </button>
          <button 
            (click)="next()" 
            class="p-2 rounded-full bg-gray-800/50 text-white hover:bg-gray-800/75"
          >
            →
          </button>
        </div>

        <!-- Settings toggle -->
        <button 
          (click)="showSettings = !showSettings"
          class="fixed top-4 right-4 p-2 rounded-full bg-gray-800/50 text-white hover:bg-gray-800/75"
        >
          ⚙️
        </button>

        <!-- Search toggle -->
        <button 
          (click)="showSearch = !showSearch"
          class="fixed top-4 right-16 p-2 rounded-full bg-gray-800/50 text-white hover:bg-gray-800/75"
        >
          🔍
        </button>
      </div>

      <!-- Side panels -->
      <div *ngIf="showSearch" class="w-80 border-l border-gray-200 dark:border-gray-700">
        <app-search-panel 
          [book]="book"
          (navigate)="navigateToLocation($event)"
        ></app-search-panel>
      </div>

      <div *ngIf="showSettings" class="w-80 border-l border-gray-200 dark:border-gray-700">
        <app-settings-panel></app-settings-panel>
      </div>

      <!-- Floating panels -->
      <div class="absolute right-8 top-8 space-y-4 z-50">
        <div *ngIf="showLookup">
          <app-lookup-panel></app-lookup-panel>
        </div>
        
        <div *ngIf="showExcerpt">
          <app-excerpt-panel
            [bookId]="bookId"
            [text]="selectedText"
            [cfi]="selectedCfi"
            (close)="showExcerpt = false"
          ></app-excerpt-panel>
        </div>
      </div>

      <!-- Context menu -->
      <div *ngIf="showContextMenu"
           [style.top.px]="contextMenuY"
           [style.left.px]="contextMenuX"
           class="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
        <button
          (click)="lookupSelection()"
          class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Look Up
        </button>
        <button
          (click)="excerptSelection()"
          class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Save Excerpt
        </button>
        <button
          (click)="highlightSelection()"
          class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Highlight
        </button>
      </div>
    </div>
  `
})
export class ReaderComponent implements OnInit {
  @ViewChild('readerContainer') readerContainer!: ElementRef;
  @Input() bookId: string = '';
  @Input() parallelMode: boolean = false;

  book: any;
  rendition: any;
  currentBook: Book | null = null;
  
  // UI state
  showExcerpt = false;
  showLookup = false;
  showSearch = false;
  showSettings = false;
  showContextMenu = false;
  
  // Selection state
  contextMenuX = 0;
  contextMenuY = 0;
  selectedText = '';
  selectedCfi = '';

  constructor(
    private route: ActivatedRoute,
    private bookService: BookService,
    private settingsService: SettingsService,
    private excerptService: ExcerptService,
    private lookupService: LookupService
  ) {}

  async ngOnInit() {
    // Get book ID from route if not provided as input
    if (!this.bookId) {
      this.route.params.subscribe(async params => {
        this.bookId = params['bookId'];
        await this.loadBook();
      });
    } else {
      await this.loadBook();
    }

    // Apply settings changes
    this.settingsService.settings$.subscribe(settings => {
      if (this.rendition) {
        this.rendition.themes.fontSize(settings.fontSize + 'px');
        this.rendition.themes.font(settings.fontFamily);
        this.applyTheme(settings.theme);
        
        // Handle view mode change
        if (settings.viewMode === 'scroll') {
          this.rendition.flow('scrolled');
        } else {
          this.rendition.flow('paginated');
        }
      }
    });
  }

  async loadBook() {
    try {
      // Get book from service
      const books = await this.bookService.books$.toPromise();
      this.currentBook = books ? books.find(b => b.id === this.bookId) || null : null;
      
      if (!this.currentBook) {
        console.error('Book not found:', this.bookId);
        return;
      }

      // Load book data
      const bookData = await this.bookService.readBookFile(this.currentBook.path);
      this.book = ePub(bookData);
      
      // Initialize rendition
      this.rendition = this.book.renderTo(this.readerContainer.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none'
      });

      // Load last position
      const savedLocation = localStorage.getItem(`book-${this.bookId}-location`);
      if (savedLocation) {
        this.rendition.display(savedLocation);
      } else {
        this.rendition.display();
      }

      // Set up selection handling
      this.rendition.on('selected', (cfiRange: string, contents: any) => {
        const selection = contents.window.getSelection();
        const text = selection.toString().trim();
        
        if (text) {
          this.selectedText = text;
          this.selectedCfi = cfiRange;
          
          // Show context menu at mouse position
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          this.contextMenuX = rect.right;
          this.contextMenuY = rect.bottom;
          this.showContextMenu = true;
        }
      });

      // Save location on page change
      this.rendition.on('relocated', (location: any) => {
        if (this.currentBook) {
          localStorage.setItem(`book-${this.bookId}-location`, location.start.cfi);
          this.currentBook.progress = location.start.percentage;
          this.bookService.saveBookMetadata(this.currentBook);
        }
      });

    } catch (error) {
      console.error('Failed to load book:', error);
    }
  }

  // Navigation
  next() {
    this.rendition.next();
  }

  prev() {
    this.rendition.prev();
  }

  navigateToLocation(cfi: string) {
    this.rendition.display(cfi);
  }

  // Context menu actions
  lookupSelection() {
    this.showContextMenu = false;
    this.showLookup = true;
    this.lookupService.lookupWord(this.selectedText);
  }

  excerptSelection() {
    this.showContextMenu = false;
    this.showExcerpt = true;
  }

  highlightSelection() {
    this.showContextMenu = false;
    
    if (!this.currentBook) return;

    // Add highlight to the book
    this.rendition.annotations.highlight(
      this.selectedCfi,
      {},
      (e: Event) => {
        // Handle click on highlight
        console.log('Highlight clicked:', e);
      }
    );

    // Save highlight
    this.bookService.addHighlight(
      this.currentBook,
      this.selectedCfi,
      this.selectedText,
      'yellow'
    );
  }

  private applyTheme(theme: 'light' | 'dark' | 'sepia') {
    const themes = {
      light: {
        body: {
          background: '#ffffff',
          color: '#000000'
        }
      },
      dark: {
        body: {
          background: '#1a1a1a',
          color: '#ffffff'
        }
      },
      sepia: {
        body: {
          background: '#f4ecd8',
          color: '#5f4b32'
        }
      }
    };

    this.rendition.themes.register(theme, themes[theme]);
    this.rendition.themes.select(theme);
  }
}