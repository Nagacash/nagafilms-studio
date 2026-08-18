import './gallery.css';
import GalleryHeader from '@/components/gallery/Header';
import GalleryFooter from '@/components/gallery/Footer';

export const metadata = {
  title: 'Naga Film — AI cinema stills and shot references',
  description:
    'Original AI-generated cinema stills for shot reference. Not frames from other people’s films.',
};

export default function GalleryLayout({ children }) {
  return (
    <div className="nf">
      <GalleryHeader />
      <main className="nf-main">{children}</main>
      <GalleryFooter />
    </div>
  );
}
