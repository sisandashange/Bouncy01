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
- Designer email/password sign-up and sign-in
- Save private drafts to Supabase
- Publish designs to the community feed
- View and reopen the designer's own saved designs
- Public discovery feed

## Run on Android

Install Node.js 22.13+ and Android Studio if building locally.

\`\`\`bash
npm install
npx expo install --fix
npx expo start
\`\`\`

Scan the QR code with a compatible Expo Go app, or use an Android emulator. For a standalone APK:

\`\`\`bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
\`\`\`

SDK 58 Expo Go support may depend on the current Play Store rollout. If Expo Go is not yet available on your device, use an EAS development build instead.

## Current 3D limitation

The current meshes are procedural 3D garment blockouts. They rotate in 3D and respond to colour/category selection, but they are not yet production garment meshes, sewn pattern pieces, physically simulated fabric, or imported real-world garments. The next major milestone is a licensed GLB garment library with editable panels, seams, trims, fit controls and fabric simulation.

## Supabase schema

The database migration is in \`supabase/migrations/20261110_fashion_studio_foundation.sql\`. It creates profiles, garment catalogue, designs, likes, comments and follows with RLS policies and explicit Data API grants.
