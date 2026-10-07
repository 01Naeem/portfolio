import { SearchX } from 'lucide-react';
import Seo from '../components/Seo.jsx';
import Button from '../components/ui/Button.jsx';
import { Container } from '../components/ui/Primitives.jsx';

export default function NotFound() {
  return (
    <Container className="grid min-h-[70dvh] place-items-center pt-24 text-center">
      <Seo title="Page not found" noindex />
      <div>
        <SearchX className="mx-auto mb-4 size-10 text-subtle" aria-hidden="true" />
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">This page doesn't exist</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">The link may be broken or the page may have moved.</p>
        <Button to="/" className="mt-8">Back to home</Button>
      </div>
    </Container>
  );
}
