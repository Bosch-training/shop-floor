// Renders server output only; no rule evaluation here (FR-13).
export default function Notification({ notification, onDismiss }) {
  if (!notification) return null;
  const { type, message, failures } = notification;

  if (type === 'success') {
    return (
      <div role='status'>
        <p>{message}</p>
        <button type='button' onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div role='alert'>
      <p>{message}</p>
      <ul>
        {failures.map((failure, index) => (
          <li key={`${failure.rule}-${index}`}>
            <strong>{failure.rule}</strong>: {failure.message}
            <br />
            Fix: {failure.fix}
          </li>
        ))}
      </ul>
      <button type='button' onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
