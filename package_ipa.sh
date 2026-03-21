#!/bin/bash
# Script to package an Xcode DerivedData .app into a sideloadable .ipa

echo "🔍 Locating Xcode DerivedData path..."
APP_PATH=$(xcodebuild -workspace ios/WashXpress.xcworkspace -scheme WashXpress -showBuildSettings | grep -m 1 "TARGET_BUILD_DIR" | awk '{print $3}')
APP_NAME=$(xcodebuild -workspace ios/WashXpress.xcworkspace -scheme WashXpress -showBuildSettings | grep -m 1 "EXECUTABLE_FOLDER_PATH" | awk '{print $3}')

FULL_APP_PATH="${APP_PATH}/${APP_NAME}"

if [ ! -d "$FULL_APP_PATH" ]; then
  echo "❌ Error: App build failed or .app not found. Please build the app in Xcode targeting your iPhone first."
  exit 1
fi

echo "📦 Packaging ${APP_NAME} into WashXpress_Dev.ipa..."
rm -rf Payload
mkdir Payload
cp -R "$FULL_APP_PATH" Payload/
zip -qr WashXpress_Dev.ipa Payload
rm -rf Payload

echo "✅ Success! WashXpress_Dev.ipa generated in $(pwd)/WashXpress_Dev.ipa"
