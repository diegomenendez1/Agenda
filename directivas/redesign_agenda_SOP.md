# Agenda App Redesign Directive

## Goal
Redesign the existing Agenda app to be coherent, professional, and optimal using the Stitch MCP tool.

## Inputs
- Existing Agenda App Codebase (React + Tailwind + Vite + Supabase).
- User credentials for testing: `diegomenendez1@gmail.com` / `Yali.202`.

## Outputs
- Updated UI code reflecting a professional and consistent design system.
- Stitch project/screens used for design generation.

## Steps
1.  **Project Assessment**:
    - Identify key views: Login, Dashboard, Task List, Leader View, Employee View, etc.
    - Document current design inconsistencies.

2.  **Stitch Integration**:
    - Check for existing Stitch projects related to "Agenda".
    - If none, create a new Stitch project named `Agenda Redesign`.
    - Use Stitch to generate high-fidelity mockups for key screens based on "professional, modern, coherent" prompts.
    - **CRITICAL**: Generate for `DESKTOP` device type. The app is primarily a web/desktop application.
    - Focus on: Typography, Color Palette, Spacing, Component reuse, Desktop-optimized layouts (sidebar, tables).

3.  **Implementation**:
    - Update `src/index.css` / Tailwind config with the new design system tokens.
    - Refactor core components (`Button`, `Card`, `Input`, `Layout`) to match Stitch designs.
    - Apply redesign to page templates.

4.  **Verification**:
    - Ensure responsiveness and accessibility.
    - Verify all user flows (Login -> Dashboard -> Action) remain functional.

## Constraints & Notes
- Use Tailwind CSS for styling.
- Ensure the app remains performant ("optimal").
- Do not break existing functionality while redesigning.
- "Check every minimum detail" means attention to micro-interactions, hover states, and alignment.
