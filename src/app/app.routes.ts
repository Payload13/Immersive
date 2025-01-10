import { Routes } from '@angular/router';
import { LibraryComponent } from './pages/library/library.component';
import { ReaderComponent } from './pages/reader/reader.component';
import { ParallelReaderComponent } from './pages/reader/parallel-reader.component';

export const routes: Routes = [
  {
    path: '',
    component: LibraryComponent
  },
  {
    path: 'read/:bookId',
    component: ReaderComponent
  },
  {
    path: 'parallel/:leftBookId/:rightBookId',
    component: ParallelReaderComponent
  }
];