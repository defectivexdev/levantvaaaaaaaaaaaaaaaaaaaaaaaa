'use client';

import { use } from 'react';
import ActivityLegDetail from '@/components/ActivityLegDetail';

interface PageProps {
    params: Promise<{ legId: string }>;
}

export default function ActivityLegPage({ params }: PageProps) {
    const { legId } = use(params);
    return <ActivityLegDetail legId={legId} />;
}
