Artwork the Prism Glass previews refract.

The lens is a texture shader — it can only sample a texture, never the DOM —
so every preview has to hand it a real image. These two files are that image
and the cursor-shaped mask, used by both the docs page and the test bench.

They live here rather than in `packages/prism-glass/` on purpose: the registry
entry ships only the four files under `src/`, and a 900KB PNG has no business
landing in someone's project when they install the component.
