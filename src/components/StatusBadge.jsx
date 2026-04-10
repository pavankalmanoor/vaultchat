/**
 * A small pill that shows where data currently lives.
 * The colour gives instant "privacy signal" to the user.
 */
export default function StatusBadge({ location = 'browser-memory' }) {
  const configs = {
    'browser-memory': {
      dot: 'bg-emerald-400',
      label: 'Browser memory only',
      className: 'badge-private',
    },
    'api-transit': {
      dot: 'bg-amber-400',
      label: 'In transit to API',
      className: 'badge-warning',
    },
  };

  const cfg = configs[location] ?? configs['browser-memory'];

  return (
    <span className={cfg.className}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}
