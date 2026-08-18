import './gallery.css';
import GalleryHeader from '../../components/gallery/Header';
import GalleryFooter from '../../components/gallery/Footer';

export const metadata = {
  title: 'Naga Film — Movie Stills, TV Frames & Cinematic References',
  description:
    'Browse original AI-generated movie stills, series frames, music-video and commercial references. Built for filmmakers — no copyrighted film frames, ever.',
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
