'use client';

import { useState } from 'react';
import Link from 'next/link';

const FAQ = [
  {
    q: 'How do I get started?',
    a: (
      <>
        <ol className="list-decimal space-y-2 pl-4">
          <li>
            <Link href="/signup" className="text-[#00ff88] hover:underline">
              Create a free account
            </Link>{' '}
            — email and password, no MuAPI key required.
          </li>
          <li>
            <Link href="/credits" className="text-[#00ff88] hover:underline">
              Buy a credit pack
            </Link>{' '}
            with Stripe (one-time payment).
          </li>
          <li>
            Open the{' '}
            <Link href="/studio/image" className="text-[#00ff88] hover:underline">
              Studio
            </Link>
            , pick a model, and generate. Costs are shown in the model picker before you run.
          </li>
        </ol>
      </>
    ),
  },
  {
    q: 'Do I need a MuAPI or API key?',
    a: 'No. Regular users only need a Naga Films account and credits. We handle the provider layer on our side — you never paste or manage an upstream API key in the studio.',
  },
  {
    q: 'How does pricing work?',
    a: 'You buy prepaid credit packs (Starter, Creator, or Pro). Each generation costs a number of credits based on the model — fixed for most images, “from ~X credits” for video and other dynamic models. You only pay for what you generate. There is no monthly subscription.',
  },
  {
    q: 'What are the credit packs?',
    a: (
      <>
        <ul className="space-y-2">
          <li>
            <strong className="text-white/70">Starter</strong> — $9 · 500 credits · good for trying the
            studios
          </li>
          <li>
            <strong className="text-white/70">Creator</strong> — $15 · 1,000 credits · regular production
            work
          </li>
          <li>
            <strong className="text-white/70">Pro</strong> — $59 · 5,000 credits · volume / production days
          </li>
        </ul>
        <p className="mt-3">
          See live pack details on the{' '}
          <Link href="/credits" className="text-[#00ff88] hover:underline">
            credits page
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    q: 'What happens if a generation fails?',
    a: 'Credits are held when you start a job. If the generation fails or is cancelled, those credits are restored to your wallet automatically. You are not charged for failed tasks.',
  },
  {
    q: 'Can I get a cash refund on credit packs?',
    a: 'Pack purchases are one-time and non-refundable once payment succeeds — similar to prepaid API credit policies. If something goes wrong with a generation, we restore app credits; we do not refund card payments for unused pack balance.',
  },
  {
    q: 'Which models and studios are included?',
    a: 'Image, Video, Cinema, and Lip Sync studios with 200+ live models from the MuAPI catalog — FLUX, Kling, Veo, Seedance, Wan, lip-sync engines, and more. The model picker syncs from the live catalog and shows approximate credit cost per model.',
  },
  {
    q: 'Are outputs AI-generated (EU AI Act)?',
    a: 'Yes. Image, video, cinema, and lip-sync results from the Studio are artificially generated or manipulated by AI models. If you publish deepfakes or AI text on public-interest topics, you may need to disclose that under the EU AI Act. See the Privacy Policy (AI Act notice) for details.',
  },
  {
    q: 'Is there a subscription?',
    a: 'No. Naga Films Studio is pay-as-you-go via credit packs only. Buy more credits when you run low.',
  },
  {
    q: 'Can I self-host or use my own key?',
    a: 'The open-source codebase can be self-hosted for teams that want full infrastructure control. The hosted studio at nagafilms-studio.vercel.app is credit-based — no BYO key for end users. Operator/admin tooling is separate and not exposed in the consumer UI.',
  },
];

export default function LandingFaq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07] bg-[#080808]">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
              aria-expanded={isOpen}
            >
              <span className="text-[14px] font-bold tracking-tight text-white/90">{item.q}</span>
              <span
                className={`mt-0.5 shrink-0 text-[#00ff88] transition-transform ${isOpen ? 'rotate-45' : ''}`}
                aria-hidden
              >
                +
              </span>
            </button>
            {isOpen && (
              <div className="px-6 pb-5 text-[13px] leading-relaxed text-white/45">{item.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
