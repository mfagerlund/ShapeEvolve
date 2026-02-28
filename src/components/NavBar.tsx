import { user, signIn, signOut, authReady } from '../auth';

export function NavBar() {
  const u = user.value;

  return (
    <nav class="navbar">
      <div class="navbar-left">
        <a href="/" class="logo">ShapeEvolve</a>
      </div>
      <div class="navbar-right">
        {authReady.value && (
          u ? (
            <div class="user-menu">
              <a href="/my-shapes" class="btn btn-sm">My Shapes</a>
              <img
                class="avatar"
                src={u.photoURL ?? ''}
                alt={u.displayName ?? ''}
                referrerpolicy="no-referrer"
              />
              <button class="btn btn-sm" onClick={signOut}>Sign Out</button>
            </div>
          ) : (
            <button class="btn btn-primary btn-sm" onClick={signIn}>Sign In</button>
          )
        )}
      </div>
    </nav>
  );
}
