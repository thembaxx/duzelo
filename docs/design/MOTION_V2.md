# Duzelo motion system v2

Based on the Interface Lineage principles of one obvious next action, predictable affordances and honest progress, plus source-owned EasyUI pill navigation and spotlight interactions.

- **Layout:** every move is transform/opacity; avoid animations that reflow content while a user reads or types.
- **Transitions:** hover feedback 150–260ms; reveal 440ms; reduced motion disables ALL nonessential animations.
- **Scroll:** IntersectionObserver unobserves once revealed, cleans up on navigation. Without JavaScript, the page remains visible; no infinite scroll effects.
- **Menu:** native control semantics and Escape/keyboard semantics remain primary; no surprise route changes.
- **Discovery:** pill tab controls are keyboard-accessible with arrow navigation and announce result counts; filtering affects only public categories, never invented worker listings.
- **Loading:** skeleton represents unknown duration and doesn't claim a percent complete. Fallback page names offline state truthfully.
- **Performance:** no Framer Motion added, keep existing GSAP hero scoped; avoid scroll-driven parallax on underpowered mobile devices.
- **Evidence:** browser tests at 320/390/1440 widths, dark and system themes, reduced-motion, tab keyboard navigation.
