import BrowseContent from '@/components/gallery/BrowseContent';
import { getByType } from '@/lib/gallery/data';

export const metadata = { title: 'Series — Naga Film' };

export default function SeriesCategory() {
  const items = getByType('series');
  return <BrowseContent items={items} initialType="series" />;
}
