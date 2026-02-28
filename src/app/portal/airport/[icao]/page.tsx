'use client';

import { use } from 'react';
import AirportDetail from '@/components/AirportDetail';

interface PageProps {
    params: Promise<{ icao: string }>;
}

export default function AirportPage({ params }: PageProps) {
    const { icao } = use(params);
    return <AirportDetail icao={icao} />;
}
