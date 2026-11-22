export const OAUTH_CALLBACK_EVENT = "instaquote:oauth-callback";
export const OAUTH_LOADING_TIMEOUT = 15_000;

/** Callback and watchdog finish independently of Browser.open's promise. */
export function watchOAuthLoading(target: EventTarget, onDone: () => void, onTimeout: () => void): () => void {
  let finished = false;
  const finish = (timeout = false) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    target.removeEventListener(OAUTH_CALLBACK_EVENT, callback);
    onDone();
    if (timeout) onTimeout();
  };
  const callback = () => finish();
  const timer = setTimeout(() => finish(true), OAUTH_LOADING_TIMEOUT);
  target.addEventListener(OAUTH_CALLBACK_EVENT, callback);
  return () => finish();
}