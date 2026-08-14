// Reject a promise if it doesn't settle within `ms`. Used to bound external
// calls (e.g. Resend) that ship no default timeout, so a stuck request fails
// fast instead of hanging a background task or an action indefinitely.
export function withTimeout<T>(p: Promise<T>, ms: number, label = "operation"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}
