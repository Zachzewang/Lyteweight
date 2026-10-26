# Building Lyteweight for iPhone

This builds the native iOS app on a Mac and installs it on your iPhone with a free Apple ID.

The free Apple ID ("Personal Team") signs the phone app only. The Apple Watch app, the lock-screen widget, Live Activities, Apple Health and push are left out, because Apple only allows them on the paid developer program.

An app signed with a free Apple ID stops opening after 7 days. Reinstall it with the "Every 7 days" steps at the end. Your data stays on the phone between reinstalls.

## What you need

- A Mac with macOS 15.6 or later. Upstream builds with Xcode 26, which needs it.
- About 40 GB of free disk space.
- Your iPhone and its USB cable.

## One-time setup

1. Install Xcode from the Mac App Store. Open it once and let it install the iOS components it offers.
2. In Terminal, point the command-line tools at Xcode:
   `sudo xcode-select -s /Applications/Xcode.app`
3. Install Homebrew from https://brew.sh if you don't have it.
4. Install Node 22 and CocoaPods:
   `brew install node@22 cocoapods`
5. Put Node 22 on your PATH, then open a new Terminal window:
   `echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc`
6. Check the versions. `node -v` should print v22, and `pod --version` should print a version number.
7. Get the code:
   `git clone https://github.com/barely-ai/Lyteweight.git && cd Lyteweight`
   If the repo is still private, git asks for a GitHub login. Use a personal access token as the password.
8. Tell Xcode where Node is. Xcode doesn't read your shell PATH, so this file pins it:
   `echo "export NODE_BINARY=$(command -v node)" > ios/.xcode.env.local`
9. Install the dependencies and generate the app's theme and data files. The pod step takes 10-20 minutes the first time.
   `npm install && npm run ios:prepare && npm run pod-install`

## Signing and installing

1. Open the workspace (the `.xcworkspace`, not the `.xcodeproj`):
   `open ios/Liftosaur.xcworkspace`
2. In Xcode, go to Settings → Accounts, click +, and sign in with your Apple ID.
3. In the left sidebar, click the blue Liftosaur project. Then select the Liftosaur target → Signing & Capabilities.
4. Tick "Automatically manage signing". Set Team to your name with "(Personal Team)".
5. If Xcode says the bundle identifier is not available, change `com.barelyai.lyteweight` to anything unique, for example `com.barelyai.lyteweight2`.
6. Go to Product → Scheme → Edit Scheme → Run → Info, and set Build Configuration to Release. A Release build packs the app's code inside the app, so it runs without the Mac.
7. Plug in the iPhone and tap Trust on the phone. On iOS 16 or later, turn on Settings → Privacy & Security → Developer Mode, and let the phone restart.
8. In Xcode's top bar, pick your iPhone as the run destination. Press ⌘R. The first build takes 15-30 minutes on an M2 Air.
9. On the iPhone, go to Settings → General → VPN & Device Management. Tap your Apple ID, then Trust.
10. Open Lyteweight from the home screen.

## Moving your data from the web app

The native app and the web app keep separate data on the phone.

1. In the web app, go to Me → Export data to JSON file.
2. In the native app, go to Me → Import data from JSON file and pick that file.

## Every 7 days

1. Plug in the iPhone and open `ios/Liftosaur.xcworkspace`.
2. Press ⌘R. This rebuilds and reinstalls the app in a few minutes, and your data stays.

## Getting new versions

Run this in the Lyteweight folder, then press ⌘R in Xcode:

`git pull && npm install && npm run ios:prepare && npm run pod-install`

## When a build fails

Copy the first red error from Xcode's Issue navigator (the ⚠ tab in the left sidebar), or the last 30 lines of the Terminal output, and send it to Claude.
