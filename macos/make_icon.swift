import AppKit

let iconsetPath = CommandLine.arguments[1]
let sizes: [(Int, String)] = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]

func drawIcon(px: Int) -> Data? {
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: px,
        pixelsHigh: px,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    rep.size = NSSize(width: px, height: px)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    let s = CGFloat(px)
    let rect = NSRect(x: 0, y: 0, width: s, height: s)

    // Rounded dark charcoal squircle backdrop
    let pad = s * 0.08
    let bgRect = rect.insetBy(dx: pad, dy: pad)
    let bgPath = NSBezierPath(roundedRect: bgRect, xRadius: s * 0.2, yRadius: s * 0.2)
    let grad = NSGradient(colors: [
        NSColor(calibratedRed: 0.22, green: 0.22, blue: 0.24, alpha: 1.0),
        NSColor(calibratedRed: 0.13, green: 0.13, blue: 0.15, alpha: 1.0)
    ])!
    grad.draw(in: bgPath, angle: -90)

    NSColor(white: 1.0, alpha: 0.12).setStroke()
    bgPath.lineWidth = max(1, s * 0.012)
    bgPath.stroke()

    // Open white book pages
    let bx = s * 0.19
    let by = s * 0.24
    let bw = s * 0.62
    let bh = s * 0.50
    let midX = bx + bw * 0.5

    // Left page
    let leftPage = NSBezierPath()
    leftPage.move(to: NSPoint(x: midX, y: by))
    leftPage.line(to: NSPoint(x: bx, y: by + bh * 0.05))
    leftPage.line(to: NSPoint(x: bx, y: by + bh * 0.96))
    leftPage.curve(
        to: NSPoint(x: midX, y: by + bh * 0.90),
        controlPoint1: NSPoint(x: bx + bw * 0.22, y: by + bh * 1.02),
        controlPoint2: NSPoint(x: midX - bw * 0.08, y: by + bh * 0.94)
    )
    leftPage.close()
    NSColor(calibratedWhite: 0.95, alpha: 1.0).setFill()
    leftPage.fill()

    // Right page
    let rightPage = NSBezierPath()
    rightPage.move(to: NSPoint(x: midX, y: by))
    rightPage.line(to: NSPoint(x: bx + bw, y: by + bh * 0.05))
    rightPage.line(to: NSPoint(x: bx + bw, y: by + bh * 0.96))
    rightPage.curve(
        to: NSPoint(x: midX, y: by + bh * 0.90),
        controlPoint1: NSPoint(x: bx + bw * 0.78, y: by + bh * 1.02),
        controlPoint2: NSPoint(x: midX + bw * 0.08, y: by + bh * 0.94)
    )
    rightPage.close()
    NSColor(calibratedWhite: 0.99, alpha: 1.0).setFill()
    rightPage.fill()

    // Center spine shadow
    let spine = NSBezierPath(rect: NSRect(x: midX - s * 0.012, y: by, width: s * 0.024, height: bh * 0.91))
    NSColor(calibratedWhite: 0.0, alpha: 0.16).setFill()
    spine.fill()

    // Curled lifting corner page
    let curl = NSBezierPath()
    curl.move(to: NSPoint(x: midX, y: by + bh * 0.02))
    curl.curve(
        to: NSPoint(x: midX + bw * 0.34, y: by + bh * 0.36),
        controlPoint1: NSPoint(x: midX + bw * 0.16, y: by + bh * 0.18),
        controlPoint2: NSPoint(x: midX + bw * 0.24, y: by + bh * 0.34)
    )
    curl.line(to: NSPoint(x: midX + bw * 0.18, y: by + bh * 0.94))
    curl.curve(
        to: NSPoint(x: midX, y: by + bh * 0.90),
        controlPoint1: NSPoint(x: midX + bw * 0.10, y: by + bh * 0.95),
        controlPoint2: NSPoint(x: midX + bw * 0.04, y: by + bh * 0.92)
    )
    curl.close()
    NSColor(calibratedRed: 0.87, green: 0.90, blue: 0.96, alpha: 0.96).setFill()
    curl.fill()

    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])
}

for (sz, name) in sizes {
    if let data = drawIcon(px: sz) {
        let outUrl = URL(fileURLWithPath: iconsetPath).appendingPathComponent(name)
        try? data.write(to: outUrl)
    }
}
