import './gallery.css';
import GalleryHeader from '@/components/gallery/Header';
import GalleryFooter from '@/components/gallery/Footer';

export const metadata = {
  title: 'Naga Film — Movie Stills, TV Frames & Cinematic References',
  description:
    'Original movie stills, series frames, and music-video references. No copyrighted film frames.',
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
