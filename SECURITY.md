# Security Policy

Morphiq ships source code that people install straight into their own projects
with `npx shadcn add`, so anything that affects the integrity of that install
path is treated as a security issue.

## Reporting a vulnerability

Report privately through GitHub — open
[a private security advisory](https://github.com/prathamhpatel/morphiq/security/advisories/new).
Please don't open a public issue for anything exploitable.

Expect an acknowledgement within 72 hours. Once a fix ships, the advisory is
published with credit to the reporter unless you'd rather stay anonymous.

## In scope

- Anything served from `https://morphiq.prathampatel.design/r/` that doesn't
  match the component sources in this repository
- Component code that introduces an injection, prototype pollution, or
  arbitrary-write vector into a consuming app
- Registry items whose `target` paths write outside the consumer's components
  directory
- Supply-chain problems in this repository: a compromised dependency, a
  tampered `package-lock.json`, or a malicious build step

## Out of scope

- Vulnerabilities in `three`, `gsap`, React, or other upstream dependencies —
  report those upstream; tell us if Morphiq pins an affected version
- Missing hardening headers on the marketing site with no demonstrated impact
- Denial of service through deliberately extreme component props (very large
  resolutions, absurd sample counts) in your own app
- Automated scanner output with no working proof of concept

## Verifying what you install

Every file in `/r/<name>.json` is a byte-for-byte copy of its source in this
repository. Before installing, you can diff them:

```bash
curl -s https://morphiq.prathampatel.design/r/prism-glass.json \
  | node -e "const j=JSON.parse(require('fs').readFileSync(0));j.files.forEach(f=>console.log(f.path,f.content.length))"
```

If the served content ever differs from the source at the matching commit,
treat the registry as compromised and report it.
