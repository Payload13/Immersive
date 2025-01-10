import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LookupResult {
  word: string;
  type: 'dictionary' | 'wikipedia';
  definition?: string;
  summary?: string;
  url?: string;
  loading: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LookupService {
  private result = new BehaviorSubject<LookupResult | null>(null);
  result$ = this.result.asObservable();

  async lookupWord(word: string) {
    // Start with loading state
    this.result.next({
      word,
      type: 'dictionary',
      loading: true
    });

    try {
      // Dictionary API (using Free Dictionary API)
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await response.json();

      if (response.ok) {
        const definition = data[0].meanings
          .map((meaning: any) => {
            return `${meaning.partOfSpeech}: ${meaning.definitions[0].definition}`;
          })
          .join('\n');

        this.result.next({
          word,
          type: 'dictionary',
          definition,
          loading: false
        });
      } else {
        throw new Error('Word not found');
      }
    } catch (error) {
      // Fallback to Wikipedia
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${word}`
        );
        const data = await response.json();

        if (response.ok) {
          this.result.next({
            word,
            type: 'wikipedia',
            summary: data.extract,
            url: data.content_urls?.desktop?.page,
            loading: false
          });
        } else {
          throw new Error('No results found');
        }
      } catch (wikiError) {
        this.result.next({
          word,
          type: 'dictionary',
          loading: false,
          error: 'No definition or article found'
        });
      }
    }
  }

  clearLookup() {
    this.result.next(null);
  }
}