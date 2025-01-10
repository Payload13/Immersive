import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SearchResult {
  cfi: string;
  excerpt: string;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private results = new BehaviorSubject<SearchResult[]>([]);
  results$ = this.results.asObservable();
  
  private currentQuery = new BehaviorSubject<string>('');
  currentQuery$ = this.currentQuery.asObservable();

  async search(book: any, query: string) {
    if (!query.trim()) {
      this.results.next([]);
      return;
    }

    this.currentQuery.next(query);
    const results = await book.search(query);
    
    // Process and enhance search results
    const enhancedResults = await Promise.all(
      results.map(async (result: any) => {
        const { cfi, excerpt } = result;
        const percentage = await book.locations.percentageFromCfi(cfi);
        
        return {
          cfi,
          excerpt: this.highlightSearchTerm(excerpt, query),
          percentage: Math.round(percentage * 100)
        };
      })
    );

    this.results.next(enhancedResults);
  }

  private highlightSearchTerm(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  clearSearch() {
    this.results.next([]);
    this.currentQuery.next('');
  }
}