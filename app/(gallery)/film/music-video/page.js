import BrowseContent from '../../../components/gallery/BrowseContent';
import { getByType } from '../../../lib/gallery/data';

export const metadata = { title: 'Music Videos — Naga Film' };

export default function MusicCategory() {
  const items = getByType('music');
  return <BrowseContent items={items} initialType="music" />;
}
