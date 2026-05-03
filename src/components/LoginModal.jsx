import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal({ show, onClose }) {
  const { login, register, error, loading, clearError } = useAuth();
  const [mode, setMode]         = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [localErr, setLocalErr] = useState('');

  useEffect(() => {
    if (show) {
      setUsername('');
      setPassword('');
      setConfirm('');
      setLocalErr('');
      clearError();
    }
  }, [show, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');

    if (mode === 'register' && password !== confirm) {
      setLocalErr('Passwords do not match.');
      return;
    }

    const ok = mode === 'login'
      ? await login(username, password)
      : await register(username, password);

    if (ok) onClose();
  };

  if (!show) return null;

  const displayError = localErr || error;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {displayError && (
              <div className="alert alert-danger py-2">{displayError}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  className="form-control"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              {mode === 'register' && (
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    className="form-control"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading
                  ? <span className="spinner-border spinner-border-sm me-2" />
                  : null}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>

          <div className="modal-footer justify-content-center border-0 pt-0">
            {mode === 'login' ? (
              <p className="mb-0 text-muted small">
                No account?{' '}
                <button className="btn btn-link btn-sm p-0" onClick={() => setMode('register')}>
                  Register
                </button>
              </p>
            ) : (
              <p className="mb-0 text-muted small">
                Already have an account?{' '}
                <button className="btn btn-link btn-sm p-0" onClick={() => setMode('login')}>
                  Sign In
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
