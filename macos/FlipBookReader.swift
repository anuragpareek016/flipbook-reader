import AppKit
import WebKit
import AVFoundation
import Foundation
import UniformTypeIdentifiers

/// Native AVAudioPlayer pool with sleep/wake recovery so WKWebView process throttling never silences page turns.
final class NativeFlipSoundEngine {
    private let publicDir: URL
    private let audioQueue = DispatchQueue(label: "dev.openfrontierlabs.flipbook.audio", qos: .userInteractive)
    private var voicesByPreset: [String: [AVAudioPlayer]] = [:]
    private var voiceCursors: [String: Int] = [:]
    private var synthWavData: Data?
    private let poolSize = 3

    init(publicDir: URL) {
        self.publicDir = publicDir
        self.synthWavData = Self.makePaperSynthWavData()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSystemWake),
            name: NSWorkspace.didWakeNotification,
            object: nil
        )
        audioQueue.async { [weak self] in
            self?.warmupAllPresets()
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func handleSystemWake(_ note: Notification) {
        audioQueue.async { [weak self] in
            self?.reloadAllPresets()
        }
    }

    func prepare(presetId: String? = nil) {
        audioQueue.async { [weak self] in
            guard let self else { return }
            if let id = presetId {
                _ = self.ensureVoices(for: id)
            } else {
                self.warmupAllPresets()
            }
        }
    }

    func play(presetId: String, volume: Float) {
        let clampedVol = max(0.0, min(1.0, volume))
        audioQueue.async { [weak self] in
            guard let self else { return }
            var pool = self.ensureVoices(for: presetId)
            if pool.isEmpty { return }

            let cursor = self.voiceCursors[presetId] ?? 0
            let chosenIdx = pool.firstIndex(where: { !$0.isPlaying }) ?? (cursor % pool.count)
            self.voiceCursors[presetId] = (chosenIdx + 1) % pool.count

            var player = pool[chosenIdx]
            Self.configureAndStart(player: player, volume: clampedVol)

            // If macOS audio hardware re-routed or suspended this player, rebuild the pool seamlessly and retry.
            if !player.isPlaying {
                pool = self.rebuildVoices(for: presetId)
                if let fresh = pool.first {
                    player = fresh
                    Self.configureAndStart(player: player, volume: clampedVol)
                }
            }
        }
    }

    private static func configureAndStart(player: AVAudioPlayer, volume: Float) {
        if player.isPlaying {
            player.stop()
        }
        player.currentTime = 0
        player.volume = volume
        player.enableRate = true
        player.rate = Float.random(in: 0.98...1.02)
        player.prepareToPlay()
        player.play()
    }

    private func warmupAllPresets() {
        for id in ["uppbeat-book", "small-page", "classic-synth"] {
            _ = ensureVoices(for: id)
        }
    }

    private func reloadAllPresets() {
        for id in ["uppbeat-book", "small-page", "classic-synth"] {
            _ = rebuildVoices(for: id)
        }
    }

    private func ensureVoices(for presetId: String) -> [AVAudioPlayer] {
        if let existing = voicesByPreset[presetId], !existing.isEmpty {
            return existing
        }
        return rebuildVoices(for: presetId)
    }

    private func rebuildVoices(for presetId: String) -> [AVAudioPlayer] {
        var created: [AVAudioPlayer] = []
        for _ in 0..<poolSize {
            if let player = makePlayer(for: presetId) {
                player.enableRate = true
                player.prepareToPlay()
                created.append(player)
            }
        }
        voicesByPreset[presetId] = created
        return created
    }

    private func makePlayer(for presetId: String) -> AVAudioPlayer? {
        if presetId == "classic-synth" {
            guard let data = synthWavData else { return nil }
            return try? AVAudioPlayer(data: data)
        }
        let filename = presetId == "small-page" ? "flipsound.mp3" : "flipsound-uppbeat.mp3"
        let url = publicDir.appendingPathComponent(filename)
        guard FileManager.default.fileExists(atPath: url.path) else {
            return synthWavData.flatMap { try? AVAudioPlayer(data: $0) }
        }
        return try? AVAudioPlayer(contentsOf: url)
    }

    private static func makePaperSynthWavData() -> Data? {
        let sampleRate = 44100.0
        let dur = 0.78
        let len = Int(sampleRate * dur)
        var samples = [Int16](repeating: 0, count: len)

        var seed: UInt64 = 0x9E3779B97F4A7C15
        var pink = 0.0
        var lp1 = 0.0
        var bp1 = 0.0
        var lp2 = 0.0
        var bp2 = 0.0

        for i in 0..<len {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            let u = Double((seed >> 11) & 0x1FFFFF) / Double(0x1FFFFF)
            let w = u * 2.0 - 1.0
            pink = (pink + 0.15 * w) / 1.15
            let raw = w * 0.65 + pink * 0.85

            let t = Double(i) / sampleRate
            var env = 0.0
            if t < 0.24 {
                env = 0.03 + 0.08 * (t / 0.24)
            } else if t < 0.31 {
                let dt = (t - 0.275) / 0.016
                env = 0.06 + 0.42 * exp(-dt * dt)
            } else if t < 0.54 {
                let p = (t - 0.31) / 0.23
                env = 0.20 * sin(Double.pi * p) + 0.03
            } else if t < 0.78 {
                let dt = (t - 0.66) / 0.045
                let tailFade = max(0.0, 1.0 - (t - 0.54) / 0.24)
                env = (0.09 * exp(-dt * dt) + 0.025) * tailFade
            }

            let fc1 = t < 0.33 ? 5400.0 - 1800.0 * (t / 0.33) : max(2200.0, 4800.0 - 2400.0 * ((t - 0.33) / 0.40))
            let f1 = 2.0 * sin((Double.pi * min(fc1, sampleRate * 0.42)) / sampleRate)
            let hp1 = raw - lp1 - 0.62 * bp1
            bp1 += f1 * hp1
            lp1 += f1 * bp1

            let f2 = 2.0 * sin((Double.pi * min(6800.0, sampleRate * 0.42)) / sampleRate)
            let hp2 = raw - lp2 - 0.8 * bp2
            bp2 += f2 * hp2
            lp2 += f2 * bp2

            let val = max(-0.95, min(0.95, (bp1 * 0.85 + bp2 * 0.35) * env))
            samples[i] = Int16(val * 32767.0)
        }

        let dataSize = UInt32(len * 2)
        let riffSize = UInt32(36) + dataSize
        var data = Data()
        data.append(contentsOf: "RIFF".utf8)
        withUnsafeBytes(of: riffSize.littleEndian) { data.append(contentsOf: $0) }
        data.append(contentsOf: "WAVEfmt ".utf8)
        withUnsafeBytes(of: UInt32(16).littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: UInt16(1).littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: UInt16(1).littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: UInt32(44100).littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: UInt32(88200).littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: UInt16(2).littleEndian) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: UInt16(16).littleEndian) { data.append(contentsOf: $0) }
        data.append(contentsOf: "data".utf8)
        withUnsafeBytes(of: dataSize.littleEndian) { data.append(contentsOf: $0) }
        samples.withUnsafeBytes { data.append(contentsOf: $0) }
        return data
    }
}

/// Native AVAudioPlayer ambient soundscape engine playing macOS ComfortSounds natively with seamless looping.
final class NativeAmbientSoundEngine {
    private let comfortDir = URL(fileURLWithPath: "/System/Library/PrivateFrameworks/HearingUtilities.framework/Resources", isDirectory: true)
    private let allowedPresets: Set<String> = [
        "Rain", "RainOnRoof", "Stream", "Ocean", "Fire", "Night", "QuietNight",
        "Steam", "BrownNoise", "PinkNoise", "WhiteNoise", "Train", "Airplane",
        "Boat", "Bus", "Babble"
    ]
    private let audioQueue = DispatchQueue(label: "dev.openfrontierlabs.flipbook.ambient", qos: .userInitiated)
    private var currentPreset: String = "off"
    private var targetVolume: Float = 0.0
    private var player: AVAudioPlayer?

    init() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSystemWake),
            name: NSWorkspace.didWakeNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        player?.stop()
    }

    @objc private func handleSystemWake(_ note: Notification) {
        audioQueue.async { [weak self] in
            guard let self, self.currentPreset != "off", let p = self.player else { return }
            if !p.isPlaying {
                p.prepareToPlay()
                p.play()
                p.volume = self.linearGain(self.targetVolume)
            }
        }
    }

    private func linearGain(_ volPercent: Float) -> Float {
        let clamped = max(0.0, min(100.0, volPercent))
        if clamped <= 0 { return 0 }
        return pow(clamped / 100.0, 1.35) * 0.88
    }

    func setAmbient(preset: String, volume: Float) {
        let norm = allowedPresets.contains(preset) ? preset : "off"
        audioQueue.async { [weak self] in
            guard let self else { return }
            self.targetVolume = max(0.0, min(100.0, volume))
            let gain = self.linearGain(self.targetVolume)

            if norm == "off" {
                self.currentPreset = "off"
                if let existing = self.player {
                    existing.setVolume(0, fadeDuration: 0.14)
                    DispatchQueue.global().asyncAfter(deadline: .now() + 0.16) { [weak self] in
                        self?.audioQueue.async {
                            guard let self, self.currentPreset == "off" else { return }
                            self.player?.stop()
                            self.player = nil
                        }
                    }
                }
                return
            }

            if self.currentPreset == norm, let existing = self.player {
                if !existing.isPlaying {
                    existing.prepareToPlay()
                    existing.play()
                }
                existing.setVolume(gain, fadeDuration: 0.08)
                return
            }

            self.currentPreset = norm
            self.player?.stop()
            self.player = nil

            let url = self.comfortDir.appendingPathComponent("\(norm).m4a")
            guard FileManager.default.fileExists(atPath: url.path),
                  let nextPlayer = try? AVAudioPlayer(contentsOf: url) else {
                return
            }
            nextPlayer.numberOfLoops = -1
            nextPlayer.volume = 0
            nextPlayer.prepareToPlay()
            if nextPlayer.play() {
                nextPlayer.setVolume(gain, fadeDuration: 0.18)
                self.player = nextPlayer
            }
        }
    }

    func setVolume(_ volume: Float) {
        audioQueue.async { [weak self] in
            guard let self else { return }
            self.targetVolume = max(0.0, min(100.0, volume))
            guard self.currentPreset != "off", let p = self.player else { return }
            p.setVolume(self.linearGain(self.targetVolume), fadeDuration: 0.06)
        }
    }
}

/// Subclassed WKWebView forwarding macOS trackpad two-finger double-tap (Smart Zoom) cleanly into FlipBook JS.
final class FlipBookWebView: WKWebView {
    override func smartMagnify(with event: NSEvent) {
        let loc = convert(event.locationInWindow, from: nil)
        let y = isFlipped ? loc.y : (bounds.height - loc.y)
        let js = "window.__flipbookHandleTwoFingerZoom && window.__flipbookHandleTwoFingerZoom(\(Double(loc.x)), \(Double(y)));"
        evaluateJavaScript(js, completionHandler: nil)
    }
}

final class FlipBookAppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var serverProcess: Process?
    private var serverPort: Int = 0
    private var pendingFilePaths: [String] = []
    private var isWebLoaded = false
    private var appActivity: NSObjectProtocol?
    private var soundEngine: NativeFlipSoundEngine?
    private var ambientEngine: NativeAmbientSoundEngine?

    private let devRoot = ProcessInfo.processInfo.environment["DEVELOPER_ROOT"] ?? "/Users/openfrontierlabs/Developer"

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Keep timers & audio responsive even after idle reading intervals (prevent macOS App Nap suspension).
        appActivity = ProcessInfo.processInfo.beginActivity(
            options: [.userInitiatedAllowingIdleSystemSleep, .latencyCritical],
            reason: "Interactive FlipBook reading and sound effects"
        )
        soundEngine = NativeFlipSoundEngine(
            publicDir: URL(fileURLWithPath: "\(devRoot)/opt/flipbook-reader/public", isDirectory: true)
        )
        ambientEngine = NativeAmbientSoundEngine()
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
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = FlipBookWebView(frame: rect, configuration: config)
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

    private func resolveNativeJsCallback(_ callbackId: String?, ok: Bool) {
        guard let id = callbackId, !id.isEmpty else { return }
        let safeId = id
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(
                "window.__flipbookResolveNative && window.__flipbookResolveNative('\(safeId)', \(ok ? "true" : "false"));",
                completionHandler: nil
            )
        }
    }

    private func saveFileWithPanel(filename: String, data: Data, ext: String, callbackId: String?) {
        let panel = NSSavePanel()
        panel.title = ext == "png" ? "Save Snip PNG" : "Save File"
        panel.nameFieldStringValue = filename
        panel.canCreateDirectories = true
        if !ext.isEmpty, let ut = UTType(filenameExtension: ext) {
            panel.allowedContentTypes = [ut]
        }
        let handleResponse: (NSApplication.ModalResponse) -> Void = { [weak self] resp in
            guard resp == .OK, let dest = panel.url else {
                self?.resolveNativeJsCallback(callbackId, ok: false)
                return
            }
            do {
                try data.write(to: dest, options: .atomic)
                self?.resolveNativeJsCallback(callbackId, ok: true)
            } catch {
                self?.resolveNativeJsCallback(callbackId, ok: false)
            }
        }
        if let win = window {
            panel.beginSheetModal(for: win, completionHandler: handleResponse)
        } else {
            handleResponse(panel.runModal())
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let action = dict["action"] as? String else { return }
        let callbackId = dict["callbackId"] as? String
        if action == "pickFile" {
            DispatchQueue.main.async { [weak self] in
                self?.openFileDialog()
            }
        } else if action == "toggleFullscreen" {
            DispatchQueue.main.async { [weak self] in
                self?.window?.toggleFullScreen(nil)
            }
        } else if action == "playSound" {
            let preset = (dict["preset"] as? String) ?? "uppbeat-book"
            let volume = (dict["volume"] as? NSNumber)?.floatValue ?? 0.84
            soundEngine?.play(presetId: preset, volume: volume)
        } else if action == "prepareSound" {
            let preset = dict["preset"] as? String
            soundEngine?.prepare(presetId: preset)
        } else if action == "setAmbient" {
            let preset = (dict["preset"] as? String) ?? "off"
            let volume = (dict["volume"] as? NSNumber)?.floatValue ?? 30.0
            ambientEngine?.setAmbient(preset: preset, volume: volume)
        } else if action == "setAmbientVolume" {
            let volume = (dict["volume"] as? NSNumber)?.floatValue ?? 30.0
            ambientEngine?.setVolume(volume)
        } else if action == "copyPng" {
            let raw = (dict["dataUrl"] as? String) ?? ""
            let b64 = raw.components(separatedBy: ",").last ?? raw
            guard let pngData = Data(base64Encoded: b64) else {
                resolveNativeJsCallback(callbackId, ok: false)
                return
            }
            DispatchQueue.main.async { [weak self] in
                let pb = NSPasteboard.general
                pb.clearContents()
                var ok = pb.setData(pngData, forType: .png)
                if !ok, let img = NSImage(data: pngData) {
                    ok = pb.writeObjects([img])
                }
                self?.resolveNativeJsCallback(callbackId, ok: ok)
            }
        } else if action == "copyText" {
            let text = (dict["text"] as? String) ?? ""
            DispatchQueue.main.async { [weak self] in
                let pb = NSPasteboard.general
                pb.clearContents()
                let ok = pb.setString(text, forType: .string)
                self?.resolveNativeJsCallback(callbackId, ok: ok)
            }
        } else if action == "saveFile" {
            let filename = (dict["filename"] as? String) ?? "export.bin"
            let ext = (dict["ext"] as? String) ?? ""
            var fileData: Data?
            if let b64 = dict["dataBase64"] as? String {
                let clean = b64.components(separatedBy: ",").last ?? b64
                fileData = Data(base64Encoded: clean)
            } else if let txt = dict["text"] as? String {
                fileData = txt.data(using: .utf8)
            }
            guard let dataToWrite = fileData else {
                resolveNativeJsCallback(callbackId, ok: false)
                return
            }
            DispatchQueue.main.async { [weak self] in
                self?.saveFileWithPanel(filename: filename, data: dataToWrite, ext: ext, callbackId: callbackId)
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
