'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`Naga Film request: ${title || 'Title'}`);
    const body = encodeURIComponent(
      `Title or artist: ${title}\nEmail: ${email}\n\n${note}`,
    );
    window.location.href = `mailto:hello@nagafilms.com?subject=${subject}&body=${body}`;
    setSent(true);
  }

  if (sent) {
    return (
      <p className="nf-contact-success" role="status">
        Your mail app should open with a pre-filled message. If it did not, email{' '}
        <a href="mailto:hello@nagafilms.com">hello@nagafilms.com</a> directly.
      </p>
    );
  }

  return (
    <form className="nf-contact-form" onSubmit={handleSubmit}>
      <label className="nf-field-label" htmlFor="contact-title">
        Title or artist
      </label>
      <input
        id="contact-title"
        className="nf-field-input"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title or artist"
        required
      />
      <label className="nf-field-label" htmlFor="contact-email">
        Your email
      </label>
      <input
        id="contact-email"
        className="nf-field-input"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@studio.com"
        required
      />
      <label className="nf-field-label" htmlFor="contact-note">
        What are you looking for?
      </label>
      <textarea
        id="contact-note"
        className="nf-field-textarea"
        name="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Describe the frames, mood, or rights submission…"
        rows={4}
        required
      />
      <button type="submit" className="nf-btn nf-btn-gold">
        Send request
      </button>
    </form>
  );
}
