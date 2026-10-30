import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Modal } from '../../client/components/ui/Modal';
import { Input } from '../../client/components/ui/Input';
import { Badge } from '../../client/components/ui/Badge';
import { Button } from '../../client/components/ui/Button';
import { Card, CardHeader } from '../../client/components/ui/Card';
import { LiveRegion } from '../../client/components/ui/LiveRegion';

describe('Accessibility Tests - UI Components', () => {
  it('Modal should have no accessibility violations', async () => {
    const { container } = render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        subtitle="Test subtitle"
      >
        <p>Modal content goes here</p>
        <button>Action</button>
      </Modal>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input component should have no accessibility violations', async () => {
    const { container } = render(
      <Input
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        required
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input with error should have no accessibility violations', async () => {
    const { container } = render(
      <Input
        label="Email Address"
        type="email"
        error="Please enter a valid email"
        required
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input with helper text should have no accessibility violations', async () => {
    const { container } = render(
      <Input
        label="Username"
        helperText="Choose a unique username"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Badge component should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Badge variant="default">Default</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Button component should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="outline">Outline Button</Button>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Card component should have no accessibility violations', async () => {
    const { container } = render(
      <Card>
        <CardHeader title="Card Title" subtitle="Card subtitle" />
        <p>Card content</p>
      </Card>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('LiveRegion should have no accessibility violations', async () => {
    const { container } = render(
      <LiveRegion message="Status update" politeness="polite" />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Form with multiple inputs should have no accessibility violations', async () => {
    const { container } = render(
      <form>
        <Input
          label="Full Name"
          type="text"
          required
        />
        <Input
          label="Email"
          type="email"
          required
          error="Email is required"
        />
        <Input
          label="Phone"
          type="tel"
          helperText="Format: +91 98765 43210"
        />
        <Button type="submit">Submit</Button>
      </form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Multiple interactive elements should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <button aria-label="Close">×</button>
        <a href="#content" aria-label="Skip to content">Skip</a>
        <input type="checkbox" id="agree" />
        <label htmlFor="agree">I agree to terms</label>
        <select aria-label="Select country">
          <option>India</option>
          <option>USA</option>
        </select>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Status indicators with text should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Badge variant="success">PAID</Badge>
        <Badge variant="warning">PENDING</Badge>
        <Badge variant="danger">OVERDUE</Badge>
        <span className="sr-only">Payment status</span>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Heading hierarchy should be valid', async () => {
    const { container } = render(
      <div>
        <h1>Main Title</h1>
        <h2>Section Title</h2>
        <h3>Subsection</h3>
        <p>Content</p>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Landmarks should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <header role="banner">
          <nav aria-label="Main navigation">
            <button>Home</button>
          </nav>
        </header>
        <main role="main" aria-label="Main content">
          <h1>Page Title</h1>
          <p>Content</p>
        </main>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Color contrast should pass WCAG AA standards', async () => {
    const { container } = render(
      <div>
        <p className="text-slate-900 bg-white">High contrast text</p>
        <button className="bg-indigo-600 text-white px-4 py-2">
          Primary Button
        </button>
        <Badge variant="success">Success Badge</Badge>
      </div>
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility Tests - ARIA Attributes', () => {
  it('ARIA labels should be properly associated', async () => {
    const { container } = render(
      <div>
        <button aria-label="Close dialog">×</button>
        <div role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
          <h2 id="dialog-title">Dialog Title</h2>
          <p id="dialog-desc">Dialog description</p>
        </div>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ARIA live regions should be properly configured', async () => {
    const { container } = render(
      <div>
        <div role="status" aria-live="polite" aria-atomic="true">
          Loading...
        </div>
        <div role="alert" aria-live="assertive">
          Error occurred
        </div>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ARIA required and invalid should work with forms', async () => {
    const { container } = render(
      <form>
        <label htmlFor="email">Email (required)</label>
        <input
          id="email"
          type="email"
          aria-required="true"
          aria-invalid="false"
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          aria-required="true"
          aria-invalid="true"
          aria-describedby="password-error"
        />
        <span id="password-error" role="alert">
          Password must be at least 8 characters
        </span>
      </form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ARIA expanded should work with collapsible content', async () => {
    const { container } = render(
      <div>
        <button aria-expanded="false" aria-controls="content">
          Expand
        </button>
        <div id="content" hidden>
          Hidden content
        </div>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ARIA current should indicate active navigation', async () => {
    const { container } = render(
      <nav aria-label="Main">
        <a href="/home">Home</a>
        <a href="/about" aria-current="page">About</a>
        <a href="/contact">Contact</a>
      </nav>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility Tests - Keyboard Navigation', () => {
  it('All interactive elements should be keyboard accessible', async () => {
    const { container } = render(
      <div>
        <button>Button</button>
        <a href="#link">Link</a>
        <input type="text" aria-label="Input field" />
        <select aria-label="Select option"><option>Option</option></select>
        <textarea aria-label="Text area"></textarea>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Custom interactive elements should have proper roles and tabindex', async () => {
    const { container } = render(
      <div>
        <div role="button" tabIndex={0} onClick={() => {}}>
          Custom Button
        </div>
        <div role="link" tabIndex={0} onClick={() => {}}>
          Custom Link
        </div>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility Tests - Language Attributes', () => {
  it('Language attributes should be properly set', async () => {
    const { container } = render(
      <div>
        <p lang="en">English text</p>
        <p lang="hi">हिंदी पाठ</p>
        <p lang="gu">ગુજરાતી લખાણ</p>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
