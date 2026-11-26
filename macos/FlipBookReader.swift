import AppKit
import WebKit
import Foundation

final class FlipBookAppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var serverProcess: Process?
    private var serverPort: Int = 0
    private var pendingFilePaths: [String] = []
    private var isWebLoaded = false

    private let devRoot = ProcessInfo.processInfo.environment["DEVELOPER_ROOT"] ?? "/Users/openfrontierlabs/Developer"

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMainMenu()
        setupWindow()
        collectCliFiles()
        startBackendServer()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let proc = serverProcess, proc.isRunning {
            proc.terminate()
        }
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        let pdfPaths = urls.filter { $0.isFileURL && $0.pathExtension.lowercased() == "pdf" }.map { $0.path }
        guard !pdfPaths.isEmpty else { return }
        for p in pdfPaths {
            openLocalPdfPath(p)
        }
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func collectCliFiles() {
        for arg in CommandLine.arguments.dropFirst() {
            if arg.hasPrefix("-") { continue }
            if FileManager.default.fileExists(atPath: arg) {
                pendingFilePaths.append(arg)
            }
        }
    }

    private func setupWindow() {
        let screenFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let width = min(1360, screenFrame.width * 0.9)
        let height = min(880, screenFrame.height * 0.9)
        let rect = NSRect(
            x: screenFrame.midX - width / 2,
            y: screenFrame.midY - height / 2,
            width: width,
            height: height
        )

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "FlipBook Reader"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.appearance = NSAppearance(named: .darkAqua)
        window.backgroundColor = NSColor(calibratedRed: 76/255.0, green: 76/255.0, blue: 76/255.0, alpha: 1.0)
        window.minSize = NSSize(width: 680, height: 480)
        window.collectionBehavior = [.fullScreenPrimary]

        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()
        contentController.add(self, name: "flipbook")
        config.userContentController = contentController
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: rect, configuration: config)
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")
        webView.allowsBackForwardNavigationGestures = false

        window.contentView = webView
        window.delegate = self
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func setupMainMenu() {
        let mainMenu = NSMenu()

        // App menu
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenuItem.submenu = appMenu
        appMenu.addItem(withTitle: "About FlipBook Reader", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Hide FlipBook Reader", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Quit FlipBook Reader", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        // File menu
        let fileMenuItem = NSMenuItem()
        mainMenu.addItem(fileMenuItem)
        let fileMenu = NSMenu(title: "File")
        fileMenuItem.submenu = fileMenu
        let openItem = NSMenuItem(title: "Open PDF…", action: #selector(openFileDialog), keyEquivalent: "o")
        openItem.target = self
        fileMenu.addItem(openItem)
        fileMenu.addItem(NSMenuItem.separator())
        fileMenu.addItem(withTitle: "Close Window", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")

        // Edit menu (enables Cmd+C / Cmd+A inside text layer & search box)
        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: "Edit")
        editMenuItem.submenu = editMenu
        editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

        // View menu
        let viewMenuItem = NSMenuItem()
        mainMenu.addItem(viewMenuItem)
        let viewMenu = NSMenu(title: "View")
        viewMenuItem.submenu = viewMenu
        viewMenu.addItem(withTitle: "Toggle Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")

        // Window menu
        let windowMenuItem = NSMenuItem()
        mainMenu.addItem(windowMenuItem)
        let windowMenu = NSMenu(title: "Window")
        windowMenuItem.submenu = windowMenu
        windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.miniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Zoom", action: #selector(NSWindow.zoom(_:)), keyEquivalent: "")

        NSApp.mainMenu = mainMenu
    }

    private func startBackendServer() {
        let nodeCandidates = [
            "\(devRoot)/bin/node",
            "\(devRoot)/opt/node/bin/node",
            "\(devRoot)/homebrew/bin/node",
            "/usr/local/bin/node",
            "/opt/homebrew/bin/node"
        ]
        guard let nodeBin = nodeCandidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            showStartupError("Could not find Node.js runtime under \(devRoot)/bin/node")
            return
        }

        let serverScript = "\(devRoot)/opt/flipbook-reader/server.mjs"
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: nodeBin)
        proc.arguments = [serverScript, "--port", "0"]

        var env = ProcessInfo.processInfo.environment
        env["DEVELOPER_ROOT"] = devRoot
        proc.environment = env

        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = pipe

        let handle = pipe.fileHandleForReading
        var buffer = Data()
        handle.readabilityHandler = { [weak self] fh in
            let chunk = fh.availableData
            if chunk.isEmpty { return }
            buffer.append(chunk)
            guard let text = String(data: buffer, encoding: .utf8) else { return }
            if let range = text.range(of: #"FLIPBOOK_READY port=(\d+)"#, options: .regularExpression) {
                let line = String(text[range])
                let digits = line.replacingOccurrences(of: "FLIPBOOK_READY port=", with: "")
                if let port = Int(digits), port > 0 {
                    fh.readabilityHandler = nil
                    DispatchQueue.main.async {
                        self?.onServerReady(port: port)
                    }
                }
            }
        }

        do {
            try proc.run()
            self.serverProcess = proc
        } catch {
            showStartupError("Failed to start FlipBook server: \(error.localizedDescription)")
        }
    }

    private func onServerReady(port: Int) {
        serverPort = port
        if let firstFile = pendingFilePaths.last {
            pendingFilePaths.removeAll()
            registerAndLoad(filePath: firstFile)
        } else {
            loadUrl("http://127.0.0.1:\(port)/")
        }
    }

    private func loadUrl(_ urlStr: String) {
        guard let url = URL(string: urlStr) else { return }
        webView.load(URLRequest(url: url))
    }

    private func syncWindowChromeState(isFullScreen: Bool? = nil) {
        guard isWebLoaded else { return }
        let full = isFullScreen ?? window?.styleMask.contains(.fullScreen) ?? false
        webView.evaluateJavaScript(
            "document.documentElement.classList.add('mac-native-window'); document.documentElement.classList.toggle('mac-fullscreen', \(full ? "true" : "false"));",
            completionHandler: nil
        )
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isWebLoaded = true
        syncWindowChromeState()
    }

    func windowWillEnterFullScreen(_ notification: Notification) {
        syncWindowChromeState(isFullScreen: true)
    }

    func windowDidEnterFullScreen(_ notification: Notification) {
        syncWindowChromeState(isFullScreen: true)
    }

    func windowWillExitFullScreen(_ notification: Notification) {
        syncWindowChromeState(isFullScreen: false)
    }

    func windowDidExitFullScreen(_ notification: Notification) {
        syncWindowChromeState(isFullScreen: false)
    }

    private func openLocalPdfPath(_ path: String) {
        if serverPort == 0 {
            pendingFilePaths.append(path)
            return
        }
        registerAndLoad(filePath: path)
    }

    private func registerAndLoad(filePath: String) {
        guard serverPort > 0,
              let url = URL(string: "http://127.0.0.1:\(serverPort)/api/open") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload: [String: Any] = ["path": filePath]
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            guard let self, let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let id = json["id"] as? String else { return }
            DispatchQueue.main.async {
                if self.isWebLoaded {
                    let safeId = id.replacingOccurrences(of: "'", with: "")
                    self.webView.evaluateJavaScript(
                        "if (typeof window.openBookById === 'function') { window.openBookById('\(safeId)'); } else { window.location.href = '/?book=\(safeId)'; }",
                        completionHandler: nil
                    )
                } else {
                    self.loadUrl("http://127.0.0.1:\(self.serverPort)/?book=\(id)")
                }
            }
        }.resume()
    }

    @objc private func openFileDialog() {
        let panel = NSOpenPanel()
        panel.title = "Open PDF Book"
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.allowedContentTypes = [.pdf]
        if panel.runModal() == .OK, let url = panel.url {
            openLocalPdfPath(url.path)
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let action = dict["action"] as? String else { return }
        if action == "pickFile" {
            DispatchQueue.main.async { [weak self] in
                self?.openFileDialog()
            }
        } else if action == "toggleFullscreen" {
            DispatchQueue.main.async { [weak self] in
                self?.window?.toggleFullScreen(nil)
            }
        }
    }

    private func showStartupError(_ msg: String) {
        let alert = NSAlert()
        alert.messageText = "FlipBook Reader Error"
        alert.informativeText = msg
        alert.runModal()
    }
}

let app = NSApplication.shared
let delegate = FlipBookAppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
