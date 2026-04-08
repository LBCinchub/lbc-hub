import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrendingWidget from '../components/social/TrendingWidget';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      const { initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

vi.mock('lucide-react', () => ({
  TrendingUp: () => <svg data-testid="trending-icon" />,
  Hash: () => <svg data-testid="hash-icon" />,
}));

const buildPost = (topics, likes = 0, reactions = {}) => ({
  topics,
  liked_by: Array.from({ length: likes }, (_, i) => `user${i}`),
  reactions,
});

describe('TrendingWidget', () => {
  it('renders nothing when there are no topics', () => {
    const { container } = render(
      <TrendingWidget posts={[buildPost([])]} onTopicClick={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when posts array is empty', () => {
    const { container } = render(
      <TrendingWidget posts={[]} onTopicClick={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders "Trending Now" heading', () => {
    render(
      <TrendingWidget
        posts={[buildPost(['cycling'])]}
        onTopicClick={vi.fn()}
      />
    );
    expect(screen.getByText('Trending Now')).toBeInTheDocument();
  });

  it('displays topics from posts', () => {
    const posts = [buildPost(['cycling', 'travel']), buildPost(['cycling'])];
    render(<TrendingWidget posts={posts} onTopicClick={vi.fn()} />);
    expect(screen.getByText('cycling')).toBeInTheDocument();
    expect(screen.getByText('travel')).toBeInTheDocument();
  });

  it('sorts topics so the most common appears first', () => {
    const posts = [
      buildPost(['cycling']),
      buildPost(['cycling']),
      buildPost(['travel']),
    ];
    render(<TrendingWidget posts={posts} onTopicClick={vi.fn()} />);
    const items = screen.getAllByRole('button');
    // First button should be cycling (2 posts)
    expect(items[0]).toHaveTextContent('cycling');
  });

  it('calls onTopicClick with the topic name when clicked', () => {
    const onTopicClick = vi.fn();
    render(
      <TrendingWidget
        posts={[buildPost(['cycling'])]}
        onTopicClick={onTopicClick}
      />
    );
    fireEvent.click(screen.getByText('cycling'));
    expect(onTopicClick).toHaveBeenCalledWith('cycling');
  });

  it('limits results to 8 topics maximum', () => {
    const topics = Array.from({ length: 12 }, (_, i) => `topic${i}`);
    const posts = topics.map((t) => buildPost([t]));
    render(<TrendingWidget posts={posts} onTopicClick={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeLessThanOrEqual(8);
  });

  it('counts engagement from likes in ranking score', () => {
    // 'popular' has 1 post but 10 likes; 'common' has 2 posts but 0 likes.
    // score = count*2 + engagement => popular=1*2+10=12, common=2*2+0=4
    const posts = [
      buildPost(['popular'], 10),
      buildPost(['common']),
      buildPost(['common']),
    ];
    render(<TrendingWidget posts={posts} onTopicClick={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('popular');
  });

  it('counts engagement from reactions in ranking score', () => {
    // 'reactive' has 1 post with 5 reaction users; 'common' has 2 posts with 0 reactions
    // score => reactive=1*2+5=7, common=2*2+0=4
    const posts = [
      buildPost(['reactive'], 0, { fire: ['a', 'b', 'c', 'd', 'e'] }),
      buildPost(['common']),
      buildPost(['common']),
    ];
    render(<TrendingWidget posts={posts} onTopicClick={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('reactive');
  });

  it('shows post count per topic', () => {
    const posts = [buildPost(['cycling']), buildPost(['cycling'])];
    render(<TrendingWidget posts={posts} onTopicClick={vi.fn()} />);
    expect(screen.getByText('2 posts')).toBeInTheDocument();
  });

  it('shows the total number of posts in the footer', () => {
    const posts = [buildPost(['cycling']), buildPost(['travel'])];
    render(<TrendingWidget posts={posts} onTopicClick={vi.fn()} />);
    expect(screen.getByText(`Based on ${posts.length} recent posts`)).toBeInTheDocument();
  });

  it('shows numbered rank starting from 1', () => {
    const posts = [buildPost(['cycling'])];
    render(<TrendingWidget posts={posts} onTopicClick={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
