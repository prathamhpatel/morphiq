# Contributing to Morphiq

New components are welcome. So are fixes, docs and better defaults.

Morphiq components are **original work**. Do not paste in code, shaders or
assets from another component library — React Bits, Aceternity, Magic UI or
anyone else. Taking inspiration from an effect is fine; copying the
implementation is not. If a component started as someone else's code, say so in
the pull request and expect it to be rewritten or declined.

## Getting set up

```bash
git clone https://github.com/prathamhpatel/morphiq
cd morphiq
npm install
npm run dev
```

No configuration needed. The landing page is at `/`; the component docs sit
behind **Components** in the nav.

```
packages/prism-glass/   the published npm package
src/components/         component sources
src/site/               the WebGL landing page
src/site/components/    the docs site
registry.json           shadcn registry manifest
public/r/               built registry output — generated, do not hand-edit
```

## Adding a component

**1. Write it fully controlled.** Every setting is a prop with a sensible
default. No internal control panel, no demo UI, no hardcoded content — if the
component renders a list, the list is a prop. A consumer should be able to drop
it in and have it look right with zero configuration, then change any single
thing without editing the source.

**2. Give it a docs page.** Add it to `SIDEBAR` and `PAGES` in
`src/site/components/ComponentsPage.jsx`. The `controls` array declares the
Customize panel — `range`, `select`, `text` and `color` kinds are available, and
each control takes an optional `when` predicate if it only applies in some
modes. Every prop worth changing should be on that panel.

**3. Declare it in `registry.json`.** This is the part with the sharp edges —
read the next section before you write the entry.

## Registry entries

The registry is what makes `npx shadcn@latest add @morphiq/<name>` work. Two rules
matter more than the rest, both learned the hard way:

**Give every file an explicit `target`.** Without one, the CLI routes files by
type — `registry:lib` lands in the consumer's `lib/`, `registry:component` in
`components/` — and any relative import between them breaks on install. Put each
item's files in their own folder:

```json
{
  "path": "packages/prism-glass/src/PrismGlass.jsx",
  "type": "registry:component",
  "target": "components/prism-glass/PrismGlass.jsx"
}
```

**Type stylesheets and other non-JS files as `registry:file`.** The CLI parses
`registry:component` files as JavaScript; hand it a `.css` file and the install
dies with `Unexpected token (1:0)` and silently skips the file.

**Declare every package the component imports.** List runtime packages in
`dependencies` (`"three"`, `"maath"`, `"gsap"`), and other registry items in
`registryDependencies`. The CLI installs exactly what an entry declares and
nothing more, so a missed package ships a component that cannot compile — and
`shadcn add` still reports success, because writing the files is all it was
asked to do. ASCII Field shipped this way: it imports `gsap` and `@gsap/react`
and declared neither.

Check the entry against the source rather than from memory:

```bash
grep -h "^import" <the component's files> | grep -v "\./"
```

Then rebuild and test the real install path:

```bash
npm run registry:build     # writes public/r/
```

Serve `public/` and install from it into a scratch project:

```bash
npx shadcn@latest add http://127.0.0.1:8899/r/<name>.json
```

Check that every file landed where its imports expect it. An entry that
validates is not the same as an entry that installs.

The scratch project needs a schema-valid `components.json` (`style`, `tailwind`,
`rsc`, `aliases` are all required) and a `jsconfig.json` declaring the `@/*`
alias, or the CLI stops before it reaches the registry.

## Pull requests

`main` is protected — open a pull request rather than pushing to it.

Before you open one:

- `npm run build` passes
- the component renders correctly at its default props, with no console errors
- the docs page and its Customize controls work
- if you touched `registry.json`, you installed the item into a scratch project
  **and ran that project's build** — not just `shadcn add`. A successful add
  only means files were written; the build is what proves the dependencies are
  declared and the imports resolve
- `public/r/` is rebuilt and committed alongside the `registry.json` change

Describe what the component does and why it belongs in the kit. Screenshots or a
short capture help a lot for anything visual — most of this library is motion,
and motion does not survive a text description.

## Licence

Contributions are accepted under the [MIT licence](./LICENSE). By opening a pull
request you confirm the work is yours to license under it.
