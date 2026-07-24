# Design QA

## Source Truth

- Reference image: `/var/folders/_j/tgwn359j6lv2m4lncms30rnw0000gn/T/TemporaryItems/NSIRD_screencaptureui_snSApi/Screenshot 2026-07-24 at 8.17.46 PM.png`
- Secondary visual reference: `https://www.douyin.com/user/MS4wLjABAAAAs19HZ0ecHKqv0HuopcsXbgx1-pPx9b5sDh08LH9AAs0boFwZ5Gpixyub48yU8FfG?from_tab_name=main`
- Implementation: `http://127.0.0.1:4177/#double-slit`
- Source viewport: 2354 x 1482 px

## Comparison

- Full desktop comparison used the source image and the implementation capture together at 2354 x 1482 px.
- The finished lab preserves the reference's dark, high-density scientific-instrument character while retaining this project's Taiwan curriculum navigation, terminology, and original physical model.
- The double-slit scene now visibly communicates an optical bench: laser housing, support feet, rail graduations, double slit, interference wavefronts, detector screen, bright-stripe preview, photon accumulation, order marks, and a measurement bracket.
- The shared simulation shell is applied by `PhysicsLab.ui.layout()` and `PhysicsLab.draw.bg()`, so all 84 experiments receive a consistent visual stage, parameter deck, real-time readout deck, instrument grid, and labelled chart frame.
- The secondary reference informed the cleaner apparatus silhouettes, restrained technical labels, and clear separation of the physical model from its measurement data; no short-video layout or third-party artwork was copied.

## Focused QA

- Desktop: no stretched visual panel or unused in-panel vertical space after independent panel sizing.
- Mobile: checked at 390 x 844 px; document scroll width equals viewport width, the canvas is 304 x 164 px, and all three lab panels are present without overlap.
- Interaction: the unique `波長 λ (nm) 增加` control changed the value from 600 to 610 and redrew the live experiment.
- Runtime: browser console reported no errors on the refined double-slit page.
- Subject-stage sampling: checked mechanics, thermal, circuit, and magnetism screens. Each receives the appropriate stage name, calibration rail, colour treatment, and family-specific instrument chrome.

## History

- Added the common experiment-bench hierarchy and responsive layout.
- Added shared canvas calibration grid, corner marks, chart ticks, and denser readout surfaces.
- Elevated double-slit to a flagship optical-bench simulation.
- Added profile-driven stages for all 12 curriculum modules: motion / force / momentum / energy / oscillation use a mechanics rail, orbital topics use an observation field, thermal topics use a bench, waves use a wave guide, optics use an optical rail, circuits use terminals, magnetism uses field coils, and modern physics uses a detector field.

final result: passed
