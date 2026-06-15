"use client";

import dynamic from 'next/dynamic';

const NetworkGraph = dynamic(() => import('./NetworkGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-gray-500 animate-pulse">Chargement du graphe...</div>
    </div>
  )
});

export default NetworkGraph;
