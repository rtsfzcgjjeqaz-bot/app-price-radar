'use client';

import Image from 'next/image';
import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export default function AppIcon({ src, alt, size = 40, className = '' }: Props) {
  const [imgSrc, setImgSrc] = useState(src);

  const isLocal = imgSrc.startsWith('/');

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      className={`bg-gray-100 object-cover rounded-xl ${className}`}
      onError={() => setImgSrc('/app-placeholder.svg')}
      unoptimized={isLocal}
    />
  );
}
