import BrowseContent from '../../../components/gallery/BrowseContent';
import { getByType } from '../../../lib/gallery/data';

export const metadata = { title: 'Commercials — Naga Film' };

export default function CommercialCategory() {
  const items = getByType('commercial');
  return <BrowseContent items={items} initialType="commercial" />;
}
