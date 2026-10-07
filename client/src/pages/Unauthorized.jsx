import { ShieldAlert } from 'lucide-react';
import Seo from '../components/Seo.jsx';
import Button from '../components/ui/Button.jsx';
import { Container } from '../components/ui/Primitives.jsx';

export default function Unauthorized() {
  return (
    <Container className="grid min-h-[70dvh] place-items-center pt-24 text-center">
      <Seo title="Unauthorized" noindex />
      <div>
        <ShieldAlert className="mx-auto mb-4 size-10 text-subtle" aria-hidden="true" />
        <p className="font-mono text-sm text-accent">403</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">You don't have access</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">This area is for the site owner. If that's you, sign in with the admin account.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button to="/admin/login">Admin sign in</Button>
          <Button to="/" variant="secondary">Home</Button>
        </div>
      </div>
    </Container>
  );
}
