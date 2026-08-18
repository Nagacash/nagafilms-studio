import BrowseContent from '@/components/gallery/BrowseContent';
import { getByType, typeLabel } from '@/lib/gallery/data';

export const metadata = { title: 'Movies — Naga Film' };

export default function MovieCategory() {
  const items = getByType('movie');
  return <BrowseContent items={items} initialType="movie" />;
}
