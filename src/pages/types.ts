import type { User } from 'firebase/auth';
import type { Data } from '../data/store';

export interface PageProps {
  data: Data;
  user: User | null;
}
