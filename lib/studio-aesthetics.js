/** Decorative assets per studio tab — clips & panels, bright and neon-framed. */
export const STUDIO_AESTHETICS = {
  image: {
    type: 'video',
    src: '/video/landing-cta.mp4',
    poster: '/hero.jpg',
    objectPosition: 'center 20%',
    alt: 'Hero portrait in motion — same as landing',
    caption: 'Glow still',
  },
  video: {
    type: 'video',
    src: '/video/naga-baby.mp4',
    poster: '/assets/storyboard/panel-street.jpg',
    objectPosition: 'center 20%',
    alt: 'Image-to-video clip generated in Video Studio',
    caption: 'In motion',
  },
  lipsync: {
    type: 'video',
    src: '/video/lipsync-mood.mp4',
    poster: '/assets/storyboard/panel-face.jpg',
    objectPosition: 'center top',
    alt: 'Animated portrait — lip sync mood',
    caption: 'Portrait',
  },
  cinema: {
    type: 'video',
    src: '/video/cinema-mood.mp4',
    poster: '/assets/storyboard/panel-overhead.jpg',
    objectPosition: 'center',
    alt: 'Neon overhead alley — slow cinematic dolly',
    caption: 'Cinema wide',
  },
  storyboard: {
    type: 'filmstrip',
    caption: 'Panel preview',
    frames: [
      {
        type: 'image',
        src: '/assets/storyboard/panel-street.jpg',
        width: '42%',
        objectPosition: 'center',
      },
      {
        type: 'video',
        src: '/video/lipsync-mood.mp4',
        poster: '/assets/storyboard/panel-face.jpg',
        width: '33%',
        objectPosition: 'center top',
      },
      {
        type: 'video',
        src: '/video/cinema-mood.mp4',
        poster: '/assets/storyboard/panel-overhead.jpg',
        width: '25%',
        objectPosition: 'center',
      },
    ],
  },
  marketing: {
    type: 'video',
    src: '/video/marketing-mood.mp4',
    poster: '/assets/storyboard/panel-street.jpg',
    objectPosition: 'center',
    alt: 'Neon street ad mood — animated',
    caption: 'Brand mood',
  },
};

export const STORYBOARD_PANELS = {
  street: '/assets/storyboard/panel-street.jpg',
  overhead: '/assets/storyboard/panel-overhead.jpg',
  subway: '/assets/storyboard/panel-subway.jpg',
  face: '/assets/storyboard/panel-face.jpg',
};
