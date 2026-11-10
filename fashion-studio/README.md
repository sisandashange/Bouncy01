# Fashion Studio — Android 3D fashion design app

This app is stored in the \`fashion-studio/\` folder of the Bouncy01 repository. The existing root-level truck simulator \`index.html\` is intentionally left untouched.

## Connected backend

- Supabase project: **Bouncy**
- Project ref: \`lakupnehsetdazezlsrs\`
- Uses the client-safe Supabase publishable key in \`src/lib/supabase.js\`.
- Never put a Supabase secret/service-role key in a mobile app.

## Current working features

- Android-first React Native + Expo app shell
- Three.js garment preview rendered through Expo GL
- Rotating 3D garment blockouts for T-shirt, hoodie, jacket, dress and pants
- Colour and material selection (material choices adjust the 3D surface roughness)
- Swipe the preview to rotate the garment manually; automatic rotation pauses while dragging and resumes after release
- Designer email/password sign-up and sign-in
- Save private drafts to Supabase
- Publish designs to the community feed
- View and reopen the designer's own saved designs
- Public discovery feed

## Build an Android APK using GitHub

You can start the Android test build from a phone; no local computer or Termux is required.

1. Open the repository on GitHub and select **Actions**.
2. Select **Fashion Studio Android APK**.
3. Open the latest run. The workflow also runs automatically when files in fashion-studio/ change.
4. When the run succeeds, download the fashion-studio-android-debug artifact.
5. Extract the ZIP and install app-debug.apk on your Android phone. Android may ask you to allow installation from your browser or file manager.

This is a debug/test APK for installing and checking the app. It is not a signed Play Store release. If the build fails, open the failed run and use its logs to identify the issue before trying another build.

## Current 3D limitation

The current meshes are procedural 3D garment blockouts. They rotate in 3D and respond to colour/category selection, but they are not yet production garment meshes, sewn pattern pieces, physically simulated fabric, or imported real-world garments. The next major milestone is a licensed GLB garment library with editable panels, seams, trims, fit controls and fabric simulation.

## Supabase schema

The database migration is in \`supabase/migrations/20261110_fashion_studio_foundation.sql\`. It creates profiles, garment catalogue, designs, likes, comments and follows with RLS policies and explicit Data API grants.
