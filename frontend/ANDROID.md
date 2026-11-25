# Build an Android APK

The Android shell is managed by Capacitor. Before building an APK, install Android Studio with its Android SDK and a compatible JDK.

## Connect the app to the backend

An Android phone cannot reach the development backend at `localhost:3000`. Deploy the backend to a server reachable by the phone over HTTPS, then create `frontend/.env.production` with:

```env
VITE_API_BASE_URL=https://your-server.example.com/api
```

The backend must allow requests from the app. Do not put secrets in this frontend environment file.

## Build and install

From the `frontend` folder, run:

```sh
npm install
npm run android:sync
npm run android:open
```

In Android Studio, wait for Gradle sync, then choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**. The debug APK is written to `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Copy that APK to the phone and open it to install; Android may ask to allow installs from that file app.

For sharing outside development, create a signed release APK from Android Studio's **Build > Generate Signed Bundle / APK** flow.

After changing frontend code, run `npm run android:sync` again before rebuilding the APK.
