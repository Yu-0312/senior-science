# Design QA

## Source Truth

- Reference image: `/var/folders/_j/tgwn359j6lv2m4lncms30rnw0000gn/T/TemporaryItems/NSIRD_screencaptureui_snSApi/Screenshot 2026-07-24 at 8.17.46 PM.png`
- Secondary visual reference: `https://www.douyin.com/user/MS4wLjABAAAAs19HZ0ecHKqv0HuopcsXbgx1-pPx9b5sDh08LH9AAs0boFwZ5Gpixyub48yU8FfG?from_tab_name=main`
- Implementation: `http://127.0.0.1:4177/#double-slit`
- Source viewport: 2354 x 1482 px
- Extended source set: `/Users/maxwang/Desktop/Screenshot 2026-07-24 at 9.09.50 PM.png` through `/Users/maxwang/Desktop/Screenshot 2026-07-24 at 9.14.35 PM.png`

## Comparison

- Full desktop comparison used the source image and the implementation capture together at 2354 x 1482 px.
- The finished lab preserves the reference's dark, high-density scientific-instrument character while retaining this project's Taiwan curriculum navigation, terminology, and original physical model.
- The double-slit scene now visibly communicates an optical bench: laser housing, support feet, rail graduations, double slit, interference wavefronts, detector screen, bright-stripe preview, photon accumulation, order marks, and a measurement bracket.
- The shared simulation shell is applied by `PhysicsLab.ui.layout()` and `PhysicsLab.draw.bg()`, so all 200 experiments receive a consistent visual stage, parameter deck, real-time readout deck, instrument grid, and labelled chart frame.
- The secondary reference informed the cleaner apparatus silhouettes, restrained technical labels, and clear separation of the physical model from its measurement data; no short-video layout or third-party artwork was copied.
- The extended source set informed the new experiment-workbench hierarchy: clear instrument title, separated visual/control/data regions, structured procedure state, and data-first control tools. The implementation keeps the project’s original dark lab system rather than copying third-party screen composition or artwork.

## Focused QA

- Desktop: no stretched visual panel or unused in-panel vertical space after independent panel sizing.
- Mobile: checked at 390 x 844 px; document scroll width equals viewport width, the canvas is 304 x 164 px, and all three lab panels are present without overlap.
- Interaction: the unique `波長 λ (nm) 增加` control changed the value from 600 to 610 and redrew the live experiment.
- Runtime: browser console reported no errors on the refined double-slit page.
- Subject-stage sampling: checked mechanics, thermal, circuit, and magnetism screens. Each receives the appropriate stage name, calibration rail, colour treatment, and family-specific instrument chrome.
- Shared workbench controls now provide functioning experiment guidance, step-by-step procedure state, focus view, full-screen view, reading export, and primary-canvas capture for all registered experiments.
- Access gate is intentionally scoped as a page-lifetime barrier for a static GitHub Pages site; reloading or opening a new tab requires the password again. It is not represented as server-side access control.
- Curriculum registry: 12 modules, 200 curriculum IDs, and 200 registered simulations; duplicate, missing, and extra-ID checks are all empty. The app now repeats this audit at startup and exposes the result as `window.PhysicsLabAudit` for browser QA.
- Expanded-lab check: `核反應與質能轉換` renders its dedicated micro-observation scene, two live controls, calculated readout, graph, formula, and learning points. One keyboard increment of mass defect changed the model output from `664.59` to `709.37`.
- Responsive recheck: at 390 x 844 px, document scroll width equals the viewport width and the six shared workbench commands wrap into a clear two-column control grid without overlap.
- Runtime recheck: the expanded lab browser console reported no warnings or errors.
- Comprehensive extension check: the 44 fourth-batch labs were each opened through the site's own search and route flow. All 44 rendered their named experiment page, control deck, live readouts, relationship chart, formula, and learning points without a browser runtime error.
- Representative visual check: the `輻射平衡與溫室效應` stage renders a dedicated greenhouse chamber with incoming and outgoing radiation arrows, rather than a reused static image. Mechanics, optics, circuits, and modern physics were likewise sampled with `水火箭與反作用力`, `光纖傳輸與彎曲損耗`, `RLC 串聯共振與相位`, and `陰極射線管與電子比電荷`.

## History

- Added the common experiment-bench hierarchy and responsive layout.
- Added shared canvas calibration grid, corner marks, chart ticks, and denser readout surfaces.
- Elevated double-slit to a flagship optical-bench simulation.
- Added profile-driven stages for all 12 curriculum modules: motion / force / momentum / energy / oscillation use a mechanics rail, orbital topics use an observation field, thermal topics use a bench, waves use a wave guide, optics use an optical rail, circuits use terminals, magnetism uses field coils, and modern physics uses a detector field.
- Added the common guided-workbench command layer and per-page access gate across the complete curriculum.
- Extended the curriculum from the junior-high natural-science bridge through senior-high electives with 44 themed simulations: sensing, simple machines, fluid and thermal phenomena, sound, imaging, household circuits, electromagnetism, and modern-physics instruments.

final result: passed
