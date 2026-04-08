import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostCardSkeleton from '../components/social/PostCardSkeleton';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      const { initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }) => <div data-testid="skeleton" className={className} />,
}));

describe('PostCardSkeleton', () => {
  it('renders without crashing', () => {
    expect(() => render(<PostCardSkeleton />)).not.toThrow();
  });

  it('renders multiple skeleton placeholders', () => {
    render(<PostCardSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    // There should be several skeleton elements for avatar, text lines, image, and action buttons
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it('includes a rounded-full skeleton for the avatar placeholder', () => {
    render(<PostCardSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    const avatar = skeletons.find((el) => el.className.includes('rounded-full'));
    expect(avatar).toBeDefined();
  });

  it('includes a large skeleton for the image placeholder', () => {
    render(<PostCardSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    const image = skeletons.find((el) => el.className.includes('h-48'));
    expect(image).toBeDefined();
  });
});
