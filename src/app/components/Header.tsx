import Link from 'next/link';
import Image from 'next/image';

interface HeaderProps {
  showBackButton?: boolean;
  className?: string;
}

export default function Header({ showBackButton = true, className = "" }: HeaderProps) {
  return (
    <header className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src="/nexvision-logo.png"
            alt="NexVision Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-2xl font-bold text-gray-800">NexVision</span>
        </Link>
        
        {showBackButton && (
          <Link 
            href="/" 
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        )}
      </div>
    </header>
  );
}
