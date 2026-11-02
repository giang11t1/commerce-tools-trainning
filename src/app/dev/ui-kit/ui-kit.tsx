'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/commercetools-ui/atoms/button';
import Checkbox from '@/components/commercetools-ui/atoms/checkbox';
import Dropdown from '@/components/commercetools-ui/atoms/dropdown';
import Input from '@/components/commercetools-ui/atoms/input';
import Radio from '@/components/commercetools-ui/atoms/radio';
import Skeleton from '@/components/commercetools-ui/atoms/skeleton';
import Modal from '@/components/commercetools-ui/organisms/modal';

const sections = [
  { id: 'tokens', label: 'Design tokens', terms: 'colors typography spacing radius shadows focus breakpoints' },
  { id: 'buttons', label: 'Button', terms: 'button primary secondary warning underlined ghost size loading disabled' },
  { id: 'inputs', label: 'Input', terms: 'input text password disabled readonly error helper' },
  { id: 'selection', label: 'Selection controls', terms: 'checkbox radio dropdown select' },
  { id: 'feedback', label: 'Feedback', terms: 'modal dialog skeleton loading' },
  { id: 'surfaces', label: 'Surface styles', terms: 'card badge alert empty state' },
];

const colors = [
  ['Primary', '--ds-color-primary'], ['Secondary', '--ds-color-secondary'],
  ['Gray 100', '--ds-color-gray-100'], ['Gray 200', '--ds-color-gray-200'],
  ['Gray 300', '--ds-color-gray-300'], ['Gray 400', '--ds-color-gray-400'],
  ['Gray 500', '--ds-color-gray-500'], ['Gray 600', '--ds-color-gray-600'],
  ['Gray 700', '--ds-color-gray-700'], ['Gray 800', '--ds-color-gray-800'],
  ['Blue 100', '--ds-color-blue-100'], ['Blue 300', '--ds-color-blue-300'],
  ['Blue 500', '--ds-color-blue-500'], ['Blue 600', '--ds-color-blue-600'],
  ['Blue 700', '--ds-color-blue-700'], ['Green 100', '--ds-color-green-100'],
  ['Green 300', '--ds-color-green-300'], ['Green 500', '--ds-color-green-500'],
  ['Green 600', '--ds-color-green-600'], ['Green 700', '--ds-color-green-700'],
  ['Yellow 100', '--ds-color-yellow-100'], ['Yellow 300', '--ds-color-yellow-300'],
  ['Yellow 500', '--ds-color-yellow-500'], ['Yellow 600', '--ds-color-yellow-600'],
  ['Yellow 700', '--ds-color-yellow-700'], ['Red 100', '--ds-color-red-100'],
  ['Red 300', '--ds-color-red-300'], ['Red 500', '--ds-color-red-500'],
  ['Red 600', '--ds-color-red-600'], ['Red 700', '--ds-color-red-700'],
] as const;

const tokenRows = [
  ['Body font', '--ds-font-body'], ['Body size', '--ds-font-size-body'],
  ['Body line height', '--ds-line-height-body'], ['Spacing base', '--ds-spacing-unit'],
  ['Control radius', '--ds-radius-control'], ['Surface radius', '--ds-radius-surface'],
  ['Surface shadow', '--ds-shadow-surface'], ['UI transition', '--ds-transition-ui'],
  ['Focus ring', '--ds-focus-ring'],
] as const;

const componentInfo = [
  { name: 'Button', path: 'src/components/commercetools-ui/atoms/button', variants: 'primary, secondary, warning, underlined, ghost; xs, s, m, l, fit, full, icon', interactive: true },
  { name: 'Input', path: 'src/components/commercetools-ui/atoms/input', variants: 'primary, secondary; inline or top label; error and dirty states', interactive: true },
  { name: 'Dropdown', path: 'src/components/commercetools-ui/atoms/dropdown', variants: 'native select or Headless UI listbox', interactive: true },
  { name: 'Checkbox', path: 'src/components/commercetools-ui/atoms/checkbox', variants: 'checked, unchecked, label positions', interactive: true },
  { name: 'Radio', path: 'src/components/commercetools-ui/atoms/radio', variants: 'checked and unchecked', interactive: true },
  { name: 'Modal', path: 'src/components/commercetools-ui/organisms/modal', variants: 'open and closed; optional close button', interactive: true },
  { name: 'Skeleton', path: 'src/components/commercetools-ui/atoms/skeleton', variants: 'loading placeholder', interactive: false },
];

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 space-y-5">
      <div>
        <h2 className="heading-2">{title}</h2>
        <p className="mt-1 text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ExampleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card card-body min-w-0"><h3 className="heading-4 mb-5">{title}</h3>{children}</div>;
}

export default function UiKit({ tokens }: { tokens: Record<string, string> }) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');
  const [buttonAdded, setButtonAdded] = useState(false);
  const [contactMethod, setContactMethod] = useState('email');

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => !query || `${section.label} ${section.terms}`.toLowerCase().includes(query));
  }, [search]);

  const copyToken = async (name: string) => {
    await navigator.clipboard.writeText(name);
    setCopiedToken(name);
    window.setTimeout(() => setCopiedToken(''), 1400);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <header className="mb-8 border-b border-line pb-8" id="top">
        <p className="eyebrow">Storefront foundations</p>
        <h1 className="mt-2 text-4xl font-bold text-ink">UI Kit</h1>
        <p className="mt-3 max-w-2xl text-muted">A live reference for the design tokens and shared UI components used by this storefront.</p>
        <label className="mt-6 block max-w-xl">
          <span className="label">Find a section</span>
          <input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search buttons, colors, inputs…" />
        </label>
      </header>

      <div id="main-content" className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside aria-label="UI kit navigation" className="h-fit lg:sticky lg:top-6">
          <nav className="card p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Sections</h2>
            <ul className="flex gap-2 overflow-x-auto lg:flex-col">
              {filteredSections.map((section) => <li key={section.id} className="shrink-0"><a className="link block rounded px-2 py-1 text-sm no-underline hover:bg-gray-100" href={`#${section.id}`}>{section.label}</a></li>)}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 space-y-12">
          {filteredSections.some((section) => section.id === 'tokens') && <Section id="tokens" title="Design tokens" description="The palette is carried forward from the existing default theme; semantic Tailwind colors and shared component styles use these tokens.">
            <ExampleCard title="Color palette">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {colors.map(([label, token]) => <button key={token} type="button" onClick={() => void copyToken(token)} className="group text-left" title={`Copy ${token}`}>
                  <span className="block h-12 rounded border border-line" style={{ backgroundColor: `rgb(var(${token}))` }} />
                  <span className="mt-1 block text-xs font-medium">{label}</span>
                  <span className="block truncate text-xs text-ink-muted">{copiedToken === token ? 'Copied!' : `rgb(${tokens[token]})`}</span>
                </button>)}
              </div>
            </ExampleCard>
            <div className="grid gap-4 xl:grid-cols-2">
              <ExampleCard title="Typography"><p className="text-3xl font-bold">Heading 1</p><p className="heading-2 mt-2">Heading 2</p><p className="heading-3 mt-2">Heading 3</p><p className="mt-3 text-body">Body text uses Lato, 1rem / 1.5.</p><p className="text-muted">Muted text communicates secondary information.</p></ExampleCard>
              <ExampleCard title="Foundation values"><dl className="divide-y divide-gray-100">{tokenRows.map(([label, token]) => <div key={token} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-sm"><dt>{label}<span className="block font-mono text-xs text-ink-muted">{token}</span></dt><dd className="max-w-56 break-all text-right font-mono text-xs text-ink-muted">{tokens[token]}</dd><button type="button" className="link col-span-2 justify-self-end text-xs" onClick={() => void copyToken(token)}>Copy token name</button></div>)}</dl><p className="field-hint mt-4">Responsive breakpoints: {['sm', 'md', 'lg', 'xl', '2xl'].map((size) => `${size} ${tokens[`--breakpoint-${size}`]}`).join(', ')}.</p></ExampleCard>
            </div>
            <ExampleCard title="Surface styles"><div className="grid gap-4 sm:grid-cols-2"><div className="card card-body"><p className="heading-4">Card</p><p className="text-muted">Shared surface class with border and shadow.</p><span className="badge badge-info mt-4 w-fit">Info badge</span></div><div className="alert alert-success"><strong>Success alert</strong><p className="mt-1">Semantic feedback style.</p></div><div className="alert alert-warning"><strong>Warning alert</strong><p className="mt-1">Action may need attention.</p></div><div className="alert alert-error"><strong>Error alert</strong><p className="mt-1">An error needs correction.</p></div></div></ExampleCard>
          </Section>}

          {filteredSections.some((section) => section.id === 'buttons') && <Section id="buttons" title="Button" description="Real shared Button component. Click the feedback example to preview its added state.">
            <ExampleCard title="Supported variants"><div className="flex flex-wrap items-center gap-3">{(['primary', 'secondary', 'warning', 'underlined', 'ghost'] as const).map((variant) => <Button key={variant} variant={variant}>{variant}</Button>)}</div></ExampleCard>
            <div className="grid gap-4 sm:grid-cols-2"><ExampleCard title="Sizes"><div className="flex flex-wrap items-center gap-3">{(['xs', 's', 'm', 'l'] as const).map((size) => <Button key={size} size={size} variant="secondary">Size {size}</Button>)}</div></ExampleCard><ExampleCard title="States"><div className="flex flex-wrap items-center gap-3"><Button disabled>Disabled</Button><Button loading>Loading</Button><Button added={buttonAdded} onClick={() => { setButtonAdded(true); window.setTimeout(() => setButtonAdded(false), 1200); }}>Click feedback</Button></div></ExampleCard></div>
          </Section>}

          {filteredSections.some((section) => section.id === 'inputs') && <Section id="inputs" title="Input" description="Real shared Input component with the existing label, variant, validation, and disabled APIs.">
            <div className="grid gap-4 md:grid-cols-2"><ExampleCard title="Default and secondary"><div className="space-y-5"><Input id="kit-name" name="kit-name" label="Name" labelPosition="top" placeholder="Enter a name" /><Input id="kit-secondary" name="kit-secondary" label="Company" labelPosition="top" variant="secondary" placeholder="Company name" /></div></ExampleCard><ExampleCard title="States"><div className="space-y-5"><Input id="kit-error" name="kit-error" label="Email" labelPosition="top" type="email" error="Enter a valid email address" defaultValue="not-an-email" /><Input id="kit-disabled" name="kit-disabled" label="Disabled" labelPosition="top" disabled defaultValue="Unavailable" /><Input id="kit-readonly" name="kit-readonly" label="Read only" labelPosition="top" readOnly defaultValue="Read-only value" /><Input id="kit-hint" name="kit-hint" label="Password" labelPosition="top" type="password" labelDesc="At least 8 characters" /></div></ExampleCard></div>
          </Section>}

          {filteredSections.some((section) => section.id === 'selection') && <Section id="selection" title="Selection controls" description="Real shared controls. Use keyboard navigation to interact with the dropdown and form fields.">
            <div className="grid gap-4 md:grid-cols-2"><ExampleCard title="Dropdown"><div className="max-w-md"><Dropdown name="kit-country" label="Country" defaultValue="us" items={[{ label: 'United States', value: 'us' }, { label: 'Germany', value: 'de' }, { label: 'Canada', value: 'ca' }]} /></div></ExampleCard><ExampleCard title="Checkbox and radio"><div className="space-y-5"><Checkbox name="kit-updates" label="Send me product updates" defaultChecked /><fieldset><legend className="label">Preferred contact</legend><div className="flex gap-3"><Radio className="flex h-10 w-auto items-center gap-2 px-2" id="kit-email" name="kit-contact" value="email" checked={contactMethod === 'email'} onChange={() => setContactMethod('email')}>Email</Radio><Radio className="flex h-10 w-auto items-center gap-2 px-2" id="kit-phone" name="kit-contact" value="phone" checked={contactMethod === 'phone'} onChange={() => setContactMethod('phone')}>Phone</Radio></div></fieldset></div></ExampleCard></div>
          </Section>}

          {filteredSections.some((section) => section.id === 'feedback') && <Section id="feedback" title="Feedback" description="A live dialog and the existing loading placeholder component.">
            <div className="grid gap-4 md:grid-cols-2"><ExampleCard title="Modal"><p className="mb-4 text-muted">Opens a keyboard-accessible shared modal with Escape and overlay close behavior.</p><Button onClick={() => setModalOpen(true)}>Open dialog</Button><Modal isOpen={modalOpen} onRequestClose={() => setModalOpen(false)} closeButton contentLabel="UI kit dialog"><div className="p-6"><h3 className="heading-3">Shared modal</h3><p className="mt-2 text-body">This is the application modal component.</p><Button className="mt-5" onClick={() => setModalOpen(false)}>Close</Button></div></Modal></ExampleCard><ExampleCard title="Skeleton"><div className="relative h-14 overflow-hidden rounded bg-gray-100"><Skeleton /></div><p className="field-hint">Static loading preview of the shared Skeleton component.</p></ExampleCard></div>
          </Section>}

          {filteredSections.some((section) => section.id === 'surfaces') && <Section id="surfaces" title="Surface styles" description="The project currently provides reusable shared surface classes rather than dedicated Badge, Card, or Alert React components.">
            <ExampleCard title="Available shared styles"><div className="flex flex-wrap gap-3"><span className="badge badge-neutral">Neutral</span><span className="badge badge-info">Info</span><span className="badge badge-success">Success</span><span className="badge badge-warning">Warning</span><span className="badge badge-danger">Danger</span><span className="badge badge-sale">Sale</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="card card-body"><h3 className="heading-4">Card surface</h3><p className="mt-2 text-muted">Uses the shared card and card-body styles.</p></div><div className="empty-state"><strong>Empty state</strong><p className="mt-2">No items to display.</p></div></div></ExampleCard>
          </Section>}

          <Section id="catalog" title="Component reference" description="Canonical imports, supported variants, and interaction notes for the components demonstrated above.">
            <ExampleCard title="Shared component metadata"><div className="overflow-x-auto"><table className="table"><thead><tr><th scope="col">Component</th><th scope="col">Variants and states</th><th scope="col">Interactive</th></tr></thead><tbody>{componentInfo.map((item) => <tr key={item.name}><th scope="row" className="text-left">{item.name}<code className="mt-1 block whitespace-nowrap text-xs font-normal text-ink-muted">{item.path}</code></th><td>{item.variants}</td><td>{item.interactive ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></ExampleCard>
          </Section>
        </div>
      </div>
      <a className="btn btn-secondary fixed bottom-4 right-4 z-20 shadow-surface" href="#top">Back to top</a>
    </main>
  );
}
