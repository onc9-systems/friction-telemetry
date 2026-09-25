import Foundation

/// Who is acting on this Mac. Until phase 02 there is no sign-in: each Mac is set to one person from the
/// fixed directory, and every request to the service names them in `x-ft-user`. The service refuses anyone else.
nonisolated enum Identity {
    static let header = "x-ft-user"
    static let defaultsKey = "identity.userId"

    /// The chosen person's id, or nil before one is chosen.
    static var userId: String? {
        get { UserDefaults.standard.string(forKey: defaultsKey) }
        set { UserDefaults.standard.set(newValue, forKey: defaultsKey) }
    }

    /// The directory bundled with the app, the same file the service reads.
    static func bundledDirectory(from directory: URL = SampleData.bundledDirectory) throws -> Directory {
        try JSONDecoder.contract.decode(Directory.self, from: Data(contentsOf: directory.appending(path: "fixed-directory.json")))
    }
}

extension URLRequest {
    /// Names the acting person. Every request to the service goes through this.
    nonisolated mutating func identify() {
        if let id = Identity.userId { setValue(id, forHTTPHeaderField: Identity.header) }
    }
}

extension Person {
    /// "Project Manager", or the permission when the directory has no title.
    var roleLabel: String { title ?? (leader ? "Leader" : "Employee") }
}
