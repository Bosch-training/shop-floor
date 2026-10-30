import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notification from './Notification.jsx';
import NotificationProvider, {
  useNotification,
} from './NotificationProvider.jsx';

const failures = [
  {
    rule: 'MATERIAL_INSUFFICIENT',
    message: 'Material M-10 has 15 available, 20 required.',
    fix: 'Reduce the quantity or increase stock.',
  },
  { rule: 'TIME_CONFLICT', message: 'Operator busy.', fix: 'Pick another.' },
];

describe('Notification (LLD-FR-11)', () => {
  it('renders a failure list with rule, message and fix (T-22)', () => {
    render(
      <Notification
        notification={{ type: 'error', message: 'Failed', failures }}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('MATERIAL_INSUFFICIENT')).toBeInTheDocument();
    expect(screen.getByText(/15 available, 20 required/)).toBeInTheDocument();
    expect(screen.getByText(/Fix: Pick another\./)).toBeInTheDocument();
  });

  it('renders a success message with role status (T-23)', () => {
    render(
      <Notification
        notification={{ type: 'success', message: 'Saved', failures: [] }}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('renders nothing without a notification', () => {
    const { container } = render(
      <Notification notification={null} onDismiss={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

function Harness() {
  const { notification, notifyError, notifySuccess, dismiss } =
    useNotification();
  return (
    <div>
      <button onClick={() => notifyError({ message: 'First', failures })}>
        error
      </button>
      <button onClick={() => notifySuccess('Second')}>success</button>
      <Notification notification={notification} onDismiss={dismiss} />
    </div>
  );
}

describe('NotificationProvider (T-24)', () => {
  it('keeps an error until dismissed; new one replaces it', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Harness />
      </NotificationProvider>,
    );

    await user.click(screen.getByText('error'));
    expect(screen.getByRole('alert')).toHaveTextContent('First');

    await user.click(screen.getByText('success'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Second');

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
