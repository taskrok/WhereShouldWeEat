export function WaitingPage() {
  return (
    <div className="page page--waiting">
      <div className="waiting-content">
        <div className="spinner" />
        <h2>You're ready!</h2>
        <p>Waiting for everyone to finish picking...</p>
      </div>
    </div>
  );
}
