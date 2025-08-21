C/C++: /home/expo/workingdir/build/TimeTrackerConfigApp/node_modules/expo-modules-core/android/CMakeLists.txt debug|arm64-v8a : com.google.prefab.api.NoMatchingLibraryException: No compatible library found for //ReactAndroid/hermestooling. Rejected the following libraries:
> Task :app:mergeDebugResources
> Task :expo-modules-core:compileDebugKotlin

w: file:///home/expo/workingdir/build/TimeTrackerConfigApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/apploader/AppLoaderProvider.kt:34:52 Unchecked cast of 'java.lang.Class<*>!' to 'java.lang.Class<out expo.modules.apploader.HeadlessAppLoader>'.
[Incubating] Problems report is available at: file:///home/expo/workingdir/build/TimeTrackerConfigApp/android/build/reports/problems/problems-report.html

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
For more on this, please refer to https://docs.gradle.org/8.13/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
234 actionable tasks: 233 executed, 1 up-to-date
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':expo-modules-core:configureCMakeDebug[arm64-v8a]'.
> [CXX1214] /home/expo/workingdir/build/TimeTrackerConfigApp/node_modules/expo-modules-core/android/CMakeLists.txt debug|arm64-v8a : User has minSdkVersion 23 but library was built for 24 [//ReactAndroid/hermestooling]