/**
 * 首页组件
 */

import { PageSkeleton } from '@/components/layout';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">
          Welcome to Scryer
        </h1>
        <p className="text-center text-lg text-gray-600 mb-8">
          Frontend infrastructure is ready.
        </p>
        <div className="card">
          <h2 className="card-title">Getting Started</h2>
          <div className="card-content space-y-4">
            <p>
              Your Next.js 14 frontend with TypeScript and TailwindCSS is now set up and ready to use.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>TypeScript strict mode enabled</li>
              <li>TailwindCSS configured</li>
              <li>ESLint and Prettier set up</li>
              <li>API client ready</li>
              <li>Component structure organized</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 演示骨架屏组件 */}
      <div className="max-w-2xl w-full mt-12">
        <h2 className="text-2xl font-bold mb-4">Loading States</h2>
        <PageSkeleton variant="default" />
      </div>
    </main>
  );
}
