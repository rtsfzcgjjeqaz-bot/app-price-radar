import type { Metadata } from 'next';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'About — App Price Radar',
  description: 'App Price Radar helps users worldwide find the cheapest App Store subscription prices.',
};

export default function AboutPage() {
  return <AboutClient />;
}
