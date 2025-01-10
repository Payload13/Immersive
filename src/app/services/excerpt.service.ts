import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Excerpt {
  id: string;
  bookId: string;
  text: string;
  cfi: string;
  note?: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ExcerptService {
  private excerpts = new BehaviorSubject<Excerpt[]>([]);
  excerpts$ = this.excerpts.asObservable();

  constructor() {
    this.loadExcerpts();
  }

  private loadExcerpts() {
    const stored = localStorage.getItem('book-excerpts');
    if (stored) {
      this.excerpts.next(JSON.parse(stored));
    }
  }

  private saveExcerpts(excerpts: Excerpt[]) {
    localStorage.setItem('book-excerpts', JSON.stringify(excerpts));
    this.excerpts.next(excerpts);
  }

  addExcerpt(bookId: string, text: string, cfi: string, note?: string): Excerpt {
    const excerpt: Excerpt = {
      id: crypto.randomUUID(),
      bookId,
      text,
      cfi,
      note,
      createdAt: new Date()
    };

    const current = this.excerpts.value;
    this.saveExcerpts([...current, excerpt]);
    return excerpt;
  }

  deleteExcerpt(id: string) {
    const current = this.excerpts.value;
    this.saveExcerpts(current.filter(e => e.id !== id));
  }

  updateExcerptNote(id: string, note: string) {
    const current = this.excerpts.value;
    const updated = current.map(e => 
      e.id === id ? { ...e, note } : e
    );
    this.saveExcerpts(updated);
  }

  getExcerptsForBook(bookId: string): Excerpt[] {
    return this.excerpts.value.filter(e => e.bookId === bookId);
  }
}