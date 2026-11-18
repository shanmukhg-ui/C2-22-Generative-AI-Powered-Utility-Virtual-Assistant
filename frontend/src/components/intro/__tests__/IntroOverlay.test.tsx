import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { IntroOverlay } from '../IntroOverlay';
import { useIntroPreference } from '../../../hooks/useIntroPreference';

describe('IntroOverlay Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();

    // Create landing main heading to test focus restoration
    const heading = document.createElement('h1');
    heading.id = 'landing-main-heading';
    heading.tabIndex = -1;
    document.body.appendChild(heading);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    const heading = document.getElementById('landing-main-heading');
    if (heading) document.body.removeChild(heading);
  });

  it('renders in the loading state, Start is disabled, Enter does nothing', () => {
    const handleClose = vi.fn();
    render(<IntroOverlay onClose={handleClose} durationMs={4000} />);

    // Dialog exists with correct accessibility attributes
    const dialog = screen.getByRole('dialog', { name: /UtilityAI engine loading/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Title and loading status
    expect(screen.getByText('UtilityAI Engine')).toBeInTheDocument();
    expect(screen.getByText('Waking neural core…')).toBeInTheDocument();

    // Start button is disabled
    const startButton = screen.getByRole('button', { name: /Loading…/i });
    expect(startButton).toBeDisabled();

    // Pressing Enter does not trigger close while loading
    fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('advances checklist items in order at their thresholds', () => {
    render(<IntroOverlay onClose={vi.fn()} durationMs={4000} />);

    // Initially Neural Core is PENDING or starts waking
    expect(screen.getByText('Neural core')).toBeInTheDocument();
    expect(screen.getByText('Knowledge base (RAG)')).toBeInTheDocument();
    expect(screen.getByText('Utility connectors')).toBeInTheDocument();
    expect(screen.getByText('Role-based security')).toBeInTheDocument();
    expect(screen.getByText('Interface and effects')).toBeInTheDocument();

    // Advance halfway (2000ms -> ~75% progress with easing)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Neural core (20%) and Knowledge base (42%) and Utility connectors (65%) should now be ARMED
    const armedBadges = screen.getAllByText('ARMED');
    expect(armedBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('becomes ready after boot duration: checklist shows all checks, Start is enabled & focused', () => {
    render(<IntroOverlay onClose={vi.fn()} durationMs={2000} />);

    // Fast-forward through full duration
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // All 5 checklist items must be ARMED
    const armedBadges = screen.getAllByText('ARMED');
    expect(armedBadges).toHaveLength(5);

    // Ready status announced
    expect(screen.getByText(/Engine ready\. Press/i)).toBeInTheDocument();

    // Start button is now enabled and focused
    const startButton = screen.getByRole('button', { name: /Start UtilityAI/i });
    expect(startButton).not.toBeDisabled();
    expect(document.activeElement).toBe(startButton);
  });

  it('closes on Enter when ready and restores focus to landing-main-heading', () => {
    const handleClose = vi.fn();
    render(<IntroOverlay onClose={handleClose} durationMs={1000} />);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    const heading = document.getElementById('landing-main-heading');
    const focusSpy = vi.spyOn(heading!, 'focus');

    // Press Enter to start
    act(() => {
      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' });
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it('closes on Start button click when ready', () => {
    const handleClose = vi.fn();
    render(<IntroOverlay onClose={handleClose} durationMs={1000} />);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    const startButton = screen.getByRole('button', { name: /Start UtilityAI/i });
    const heading = document.getElementById('landing-main-heading');
    const focusSpy = vi.spyOn(heading!, 'focus');

    act(() => {
      fireEvent.click(startButton);
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it('closes on screen click when ready', () => {
    render(<IntroOverlay onClose={vi.fn()} durationMs={1000} />);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    const dialog = screen.getByRole('dialog');
    const heading = document.getElementById('landing-main-heading');
    const focusSpy = vi.spyOn(heading!, 'focus');

    act(() => {
      fireEvent.click(dialog);
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it('closes on Esc during loading and restores focus', () => {
    render(<IntroOverlay onClose={vi.fn()} durationMs={4000} />);

    const heading = document.getElementById('landing-main-heading');
    const focusSpy = vi.spyOn(heading!, 'focus');

    // Press Esc during early loading
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it('closes on Skip intro button click during loading', () => {
    render(<IntroOverlay onClose={vi.fn()} durationMs={4000} />);

    const skipButton = screen.getByRole('button', { name: /Skip intro/i });
    const heading = document.getElementById('landing-main-heading');
    const focusSpy = vi.spyOn(heading!, 'focus');

    act(() => {
      fireEvent.click(skipButton);
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it('cleans up body overflow and timer on unmount', () => {
    const { unmount } = render(<IntroOverlay onClose={vi.fn()} durationMs={4000} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('still advances boot sequence when prefers-reduced-motion is true', () => {
    // Mock reduced motion
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<IntroOverlay onClose={vi.fn()} durationMs={1500} />);

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    const armedBadges = screen.getAllByText('ARMED');
    expect(armedBadges).toHaveLength(5);
    expect(screen.getByRole('button', { name: /Start UtilityAI/i })).not.toBeDisabled();
  });
});

describe('useIntroPreference Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('defaults to once per session (shows initially, hides after markIntroShown)', () => {
    const { result } = renderHook(() => useIntroPreference());

    expect(result.current.introPref).toBe('session');
    expect(result.current.shouldShowIntro).toBe(true);

    act(() => {
      result.current.markIntroShown();
    });

    expect(result.current.shouldShowIntro).toBe(false);
  });

  it('respects "never" preference and renders nothing', () => {
    localStorage.setItem('utilityai_intro_pref', 'never');
    const { result } = renderHook(() => useIntroPreference());

    expect(result.current.introPref).toBe('never');
    expect(result.current.shouldShowIntro).toBe(false);
  });

  it('respects "always" preference and shows even after marked shown', () => {
    const { result } = renderHook(() => useIntroPreference());

    act(() => {
      result.current.setIntroPref('always');
    });

    expect(result.current.introPref).toBe('always');
    expect(result.current.shouldShowIntro).toBe(true);

    act(() => {
      result.current.markIntroShown();
    });

    // In 'always' mode, should still show
    expect(result.current.shouldShowIntro).toBe(true);
  });

  it('forceReplay shows intro even if session already completed', () => {
    const { result } = renderHook(() => useIntroPreference());

    act(() => {
      result.current.markIntroShown();
    });
    expect(result.current.shouldShowIntro).toBe(false);

    act(() => {
      result.current.forceReplay();
    });
    expect(result.current.shouldShowIntro).toBe(true);
  });
});
