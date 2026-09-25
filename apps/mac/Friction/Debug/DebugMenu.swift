#if DEBUG
import AppKit

/// Debug builds only: every state the shell draws, reachable without real capture.
final class DebugMenu: NSObject, NSMenuDelegate {
    let menu = NSMenu(title: "Debug")
    private let model: AppModel
    private let pill: PillController
    private let showReview: () -> Void

    init(model: AppModel, pill: PillController, showReview: @escaping () -> Void) {
        self.model = model
        self.pill = pill
        self.showReview = showReview
        super.init()
        menu.delegate = self
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        let states = NSMenu()
        for s in PillState.allCases {
            let i = NSMenuItem(title: s.debugTitle, action: #selector(setPill(_:)), keyEquivalent: "")
            i.target = self; i.representedObject = s.rawValue; i.state = pill.model.state == s ? .on : .off
            states.addItem(i)
        }
        let statesItem = NSMenuItem(title: "Pill state", action: nil, keyEquivalent: ""); statesItem.submenu = states
        menu.addItem(statesItem)
        add("Show capture review", #selector(review))
        menu.addItem(.separator())
        let scripts = NSMenu()
        for s in StubScript.allCases {
            let i = NSMenuItem(title: s.title, action: #selector(setScript(_:)), keyEquivalent: "")
            i.target = self; i.representedObject = s.rawValue; i.state = model.stubScript == s ? .on : .off
            scripts.addItem(i)
        }
        let scriptsItem = NSMenuItem(title: "Answer script", action: nil, keyEquivalent: ""); scriptsItem.submenu = scripts
        menu.addItem(scriptsItem)
        add("Leader permission", #selector(toggleLeader)).state = model.isLeader ? .on : .off
        add("Empty data", #selector(toggleEmpty)).state = model.emptyData ? .on : .off
        menu.addItem(.separator())
        add("Reset pill position", #selector(resetPill))
    }

    @discardableResult private func add(_ title: String, _ action: Selector) -> NSMenuItem {
        let i = NSMenuItem(title: title, action: action, keyEquivalent: "")
        i.target = self
        menu.addItem(i)
        return i
    }

    @objc private func setPill(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String, let s = PillState(rawValue: raw) else { return }
        pill.model.show(s)
    }
    @objc private func review() { showReview() }
    @objc private func setScript(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String, let s = StubScript(rawValue: raw) else { return }
        model.stubScript = s
    }
    @objc private func toggleLeader() {
        model.isLeader.toggle()
        if !model.isLeader, Surface.initiative.contains(model.selection) { model.selection = .home }
    }
    @objc private func toggleEmpty() { model.emptyData.toggle() }
    @objc private func resetPill() { pill.resetPosition() }
}
#endif
