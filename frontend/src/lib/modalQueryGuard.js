// Simple single-flight guard for modal query param navigation
let _locked = false;
const LOCK_TIME = 300; // ms

export const blockIfLocked = (actionName = '') => {
  if (_locked) {
    console.warn(`[modalQueryGuard] Blocking ${actionName} because a modal navigation is in-flight`);
    return true;
  }
  console.log(`[modalQueryGuard] Allowing ${actionName} — locking for ${LOCK_TIME}ms`);
  _locked = true;
  setTimeout(() => { _locked = false; console.log(`[modalQueryGuard] Unlocking ${actionName}`); }, LOCK_TIME);
  return false;
};

export const isLocked = () => _locked;

export default {
  blockIfLocked,
  isLocked
};