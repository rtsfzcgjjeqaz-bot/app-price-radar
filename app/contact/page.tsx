import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact — App Price Radar',
  description: 'Get in touch with the App Price Radar team.',
};

export default function ContactPage() {
  return <ContactClient />;
}
