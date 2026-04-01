import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export default function PostCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl sm:rounded-2xl overflow-hidden shadow-lg p-4 sm:p-6"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
        <div className="flex-1 w-full space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      
      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </motion.div>
  );
}