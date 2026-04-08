import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChallengeCard from '../components/challenges/ChallengeCard';

// Suppress framer-motion animations
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      const { initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Target: () => <svg data-testid="target-icon" />,
  Users: () => <svg data-testid="users-icon" />,
  Calendar: () => <svg data-testid="calendar-icon" />,
  TrendingUp: () => <svg data-testid="trending-icon" />,
  CheckCircle: () => <svg data-testid="check-icon" />,
}));

// Mock the base44 API client
const mockUpdate = vi.fn().mockResolvedValue({});
vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Challenge: {
        update: (...args) => mockUpdate(...args),
      },
    },
  },
}));

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const Wrapper = ({ children }) => (
  <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
);

const baseChallenge = {
  id: 'ch1',
  title: 'Travel 100 Miles',
  description: 'Explore the world',
  type: 'travel_miles',
  target: 100,
  reward_badge: '🌍',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  participants: [],
};

const user = { email: 'alice@test.com', full_name: 'Alice' };

describe('ChallengeCard', () => {
  beforeEach(() => {
    mockUpdate.mockClear();
  });

  it('renders the challenge title', () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('Travel 100 Miles')).toBeInTheDocument();
  });

  it('renders the challenge description', () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('Explore the world')).toBeInTheDocument();
  });

  it('renders the reward badge', () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByTitle('Reward badge')).toHaveTextContent('🌍');
  });

  it('displays the target value', () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows participant count as 0 when no participants', () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows "Join Challenge" button when user is not a participant', () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByRole('button', { name: /join challenge/i })).toBeInTheDocument();
  });

  it('"Join Challenge" button is disabled when user is null', () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={null} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByRole('button', { name: /join challenge/i })).toBeDisabled();
  });

  it('shows "View Leaderboard" and "Joined" when user is already a participant', () => {
    const challenge = {
      ...baseChallenge,
      participants: [{ email: 'alice@test.com', name: 'Alice', progress: 30 }],
    };
    render(
      <Wrapper>
        <ChallengeCard challenge={challenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByRole('button', { name: /view leaderboard/i })).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
  });

  it('calls onViewLeaderboard when "View Leaderboard" is clicked', () => {
    const onViewLeaderboard = vi.fn();
    const challenge = {
      ...baseChallenge,
      participants: [{ email: 'alice@test.com', name: 'Alice', progress: 30 }],
    };
    render(
      <Wrapper>
        <ChallengeCard
          challenge={challenge}
          user={user}
          onViewLeaderboard={onViewLeaderboard}
        />
      </Wrapper>
    );
    fireEvent.click(screen.getByRole('button', { name: /view leaderboard/i }));
    expect(onViewLeaderboard).toHaveBeenCalledOnce();
  });

  it('shows progress bar when user is a participant', () => {
    const challenge = {
      ...baseChallenge,
      participants: [{ email: 'alice@test.com', name: 'Alice', progress: 50 }],
    };
    render(
      <Wrapper>
        <ChallengeCard challenge={challenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('Your Progress')).toBeInTheDocument();
  });

  it('calls the API with the correct challenge id and new participant when joined', async () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    fireEvent.click(screen.getByRole('button', { name: /join challenge/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalledWith(
      'ch1',
      expect.objectContaining({
        participants: expect.arrayContaining([
          expect.objectContaining({ email: 'alice@test.com' }),
        ]),
      })
    );
  });

  it('uses emoji icon for known challenge type', () => {
    render(
      <Wrapper>
        <ChallengeCard challenge={baseChallenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    // travel_miles maps to ✈️
    expect(screen.getByText('✈️')).toBeInTheDocument();
  });

  it('uses 🎯 fallback icon for unknown challenge type', () => {
    const challenge = { ...baseChallenge, type: 'unknown_type' };
    render(
      <Wrapper>
        <ChallengeCard challenge={challenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('does not render reward badge section when reward_badge is absent', () => {
    const challenge = { ...baseChallenge, reward_badge: undefined };
    const { container } = render(
      <Wrapper>
        <ChallengeCard challenge={challenge} user={user} onViewLeaderboard={vi.fn()} />
      </Wrapper>
    );
    expect(container.querySelector('[title="Reward badge"]')).toBeNull();
  });
});
