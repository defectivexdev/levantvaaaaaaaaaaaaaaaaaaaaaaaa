'use client';

import { use } from 'react';
import ActivityDetail from '@/components/ActivityDetail';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ActivityDetailPage({ params }: PageProps) {
    const { id } = use(params);
    return <ActivityDetail activityId={id} />;
}
