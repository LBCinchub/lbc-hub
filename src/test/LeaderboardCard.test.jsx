import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeaderboardCard from '../components/challenges/LeaderboardCard';

// framer-motion: render children immediately without animation
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      // Strip animation-specific props before passing to the DOM element
      const { initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// Radix Avatar: render children directly
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children, ...props }) => <span {...props}>{children}</span>,
}));

const challenge = { target: 100, reward_badge: '🏆' };

const participants = [
  { email: 'alice@test.com', name: 'Alice', progress: 80 },
  { email: 'bob@test.com', name: 'Bob', progress: 50 },
  { email: 'carol@test.com', name: 'Carol', progress: 90 },
  { email: 'dave@test.com', name: 'Dave', progress: 20 },
];

describe('LeaderboardCard', () => {
  it('renders the Leaderboard heading', () => {
    render(<LeaderboardCard participants={participants} challenge={challenge} />);
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('sorts participants by progress descending', () => {
    render(<LeaderboardCard participants={participants} challenge={challenge} />);
    const names = screen
      .getAllByText(/Alice|Bob|Carol|Dave/)
      .map((el) => el.textContent);
    const order = ['Carol', 'Alice', 'Bob', 'Dave'];
    order.forEach((name, idx) => {
      expect(names[idx]).toBe(name);
    });
  });

  it('displays the correct percentage for each participant', () => {
    render(<LeaderboardCard participants={participants} challenge={challenge} />);
    // Carol: 90/100 = 90%
    expect(screen.getByText('90%')).toBeInTheDocument();
    // Alice: 80/100 = 80%
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows empty state when no participants', () => {
    render(<LeaderboardCard participants={[]} challenge={challenge} />);
    expect(screen.getByText('No participants yet')).toBeInTheDocument();
  });

  it('shows reward badge for top 3 participants', () => {
    render(<LeaderboardCard participants={participants} challenge={challenge} />);
    // reward_badge '🏆' appears for each of the top 3 entries
    const badges = screen.getAllByText('🏆');
    expect(badges.length).toBe(3);
  });

  it('limits displayed participants to 10', () => {
    const manyParticipants = Array.from({ length: 15 }, (_, i) => ({
      email: `user${i}@test.com`,
      name: `User ${i}`,
      progress: i * 5,
    }));
    render(<LeaderboardCard participants={manyParticipants} challenge={challenge} />);
    // Each participant row shows a "progress / target" string
    const progressTexts = screen.getAllByText(/\/ 100/);
    expect(progressTexts.length).toBeLessThanOrEqual(10);
  });

  it('uses email initial when name is missing', () => {
    const noNameParticipants = [
      { email: 'zara@test.com', progress: 55 },
    ];
    render(<LeaderboardCard participants={noNameParticipants} challenge={challenge} />);
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('displays progress vs target for each participant', () => {
    render(<LeaderboardCard participants={participants} challenge={challenge} />);
    expect(screen.getByText('90 / 100')).toBeInTheDocument();
    expect(screen.getByText('80 / 100')).toBeInTheDocument();
  });
});
