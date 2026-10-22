import React from 'react';
import { SkeletonCard } from '@/components/loading/Skeleton';

// Kept so existing imports keep working; the implementation now lives in components/loading.
export { Skeleton } from '@/components/loading/Skeleton';

export const JobCardSkeleton: React.FC = () => <SkeletonCard variant="job" />;
