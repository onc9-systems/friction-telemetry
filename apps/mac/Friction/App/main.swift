import AppKit

// AppKit lifecycle: a menu bar app whose one SwiftUI main window is hosted in an AppKit NSWindow,
// so the activation policy and the non-activating panels stay under direct control.
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
