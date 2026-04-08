import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LuminaStreakBadge from '../components/social/LuminaStreakBadge';

vi.mock('lucide-react', () => ({
  Flame: () => <svg data-testid="flame-icon" />,
  Zap: () => <svg data-testid="zap-icon" />,
}));

describe('LuminaStreakBadge', () => {
  describe('when streak is falsy', () => {
    it('renders nothing when streak is 0', () => {
      const { container } = render(<LuminaStreakBadge streak={0} sparks={10} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when streak is null', () => {
      const { container } = render(<LuminaStreakBadge streak={null} sparks={10} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when streak is undefined', () => {
      const { container } = render(<LuminaStreakBadge streak={undefined} sparks={5} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('full (non-compact) mode', () => {
    it('displays the streak count', () => {
      render(<LuminaStreakBadge streak={7} sparks={42} />);
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('displays the sparks count', () => {
      render(<LuminaStreakBadge streak={7} sparks={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('shows "day streak" label', () => {
      render(<LuminaStreakBadge streak={7} sparks={42} />);
      expect(screen.getByText('day streak')).toBeInTheDocument();
    });

    it('shows "sparks" label', () => {
      render(<LuminaStreakBadge streak={7} sparks={42} />);
      expect(screen.getByText('sparks')).toBeInTheDocument();
    });

    it('renders flame and zap icons', () => {
      render(<LuminaStreakBadge streak={5} sparks={20} />);
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('renders streak value', () => {
      render(<LuminaStreakBadge streak={3} sparks={15} compact />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders sparks value', () => {
      render(<LuminaStreakBadge streak={3} sparks={15} compact />);
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('does NOT show "day streak" label in compact mode', () => {
      render(<LuminaStreakBadge streak={3} sparks={15} compact />);
      expect(screen.queryByText('day streak')).not.toBeInTheDocument();
    });

    it('does NOT show "sparks" label in compact mode', () => {
      render(<LuminaStreakBadge streak={3} sparks={15} compact />);
      expect(screen.queryByText('sparks')).not.toBeInTheDocument();
    });
  });

  describe('compact defaults to false', () => {
    it('renders full view by default', () => {
      render(<LuminaStreakBadge streak={1} sparks={1} />);
      expect(screen.getByText('day streak')).toBeInTheDocument();
    });
  });
});
