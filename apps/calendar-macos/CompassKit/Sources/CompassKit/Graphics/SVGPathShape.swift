import CoreGraphics
import SwiftUI

/// Renders a Phosphor `regular` SVG path in a 256×256 view box.
public struct SVGPathShape: Shape {
    public let pathData: String

    public init(pathData: String) {
        self.pathData = pathData
    }

    public func path(in rect: CGRect) -> Path {
        let scaleX = rect.width / 256
        let scaleY = rect.height / 256
        let cgPath = SVGPathParser.makePath(d: pathData) { point in
            CGPoint(x: point.x * scaleX + rect.minX, y: point.y * scaleY + rect.minY)
        }
        return Path(cgPath)
    }
}

enum SVGPathParser {
    fileprivate struct Point {
        var x: Double
        var y: Double
    }

    fileprivate static func makePath(
        d: String,
        transform: (Point) -> CGPoint
    ) -> CGPath {
        let tokens = tokenize(d)
        var index = 0
        var current = Point(x: 0, y: 0)
        var start = Point(x: 0, y: 0)
        var lastControl = Point(x: 0, y: 0)
        /// Smooth commands (`S`, `T`) reflect the previous control point only
        /// when the previous segment was a curve of the matching kind.
        var previousCubic = false
        var previousQuad = false
        let path = CGMutablePath()

        func readDouble() -> Double {
            guard index < tokens.count else { return 0 }
            let token = tokens[index]
            index += 1
            return Double(token) ?? 0
        }

        func move(to point: Point) {
            current = point
            start = point
            path.move(to: transform(point))
        }

        func line(to point: Point) {
            current = point
            path.addLine(to: transform(point))
        }

        while index < tokens.count {
            let command = tokens[index]
            index += 1
            let wasCubic = previousCubic
            let wasQuad = previousQuad
            previousCubic = false
            previousQuad = false
            switch command {
            case "M":
                let x = readDouble()
                let y = readDouble()
                move(to: Point(x: x, y: y))
                while index < tokens.count, Double(tokens[index]) != nil {
                    let lx = readDouble()
                    let ly = readDouble()
                    line(to: Point(x: lx, y: ly))
                }
            case "m":
                let dx = readDouble()
                let dy = readDouble()
                move(to: Point(x: current.x + dx, y: current.y + dy))
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dx = readDouble()
                    let dy = readDouble()
                    line(to: Point(x: current.x + dx, y: current.y + dy))
                }
            case "L":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let x = readDouble()
                    let y = readDouble()
                    line(to: Point(x: x, y: y))
                }
            case "l":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dx = readDouble()
                    let dy = readDouble()
                    line(to: Point(x: current.x + dx, y: current.y + dy))
                }
            case "H":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let x = readDouble()
                    line(to: Point(x: x, y: current.y))
                }
            case "h":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dx = readDouble()
                    line(to: Point(x: current.x + dx, y: current.y))
                }
            case "V":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let y = readDouble()
                    line(to: Point(x: current.x, y: y))
                }
            case "v":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dy = readDouble()
                    line(to: Point(x: current.x, y: current.y + dy))
                }
            case "C":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let x1 = readDouble()
                    let y1 = readDouble()
                    let x2 = readDouble()
                    let y2 = readDouble()
                    let x = readDouble()
                    let y = readDouble()
                    lastControl = Point(x: x2, y: y2)
                    previousCubic = true
                    path.addCurve(
                        to: transform(Point(x: x, y: y)),
                        control1: transform(Point(x: x1, y: y1)),
                        control2: transform(Point(x: x2, y: y2)))
                    current = Point(x: x, y: y)
                }
            case "c":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dx1 = readDouble()
                    let dy1 = readDouble()
                    let dx2 = readDouble()
                    let dy2 = readDouble()
                    let dx = readDouble()
                    let dy = readDouble()
                    let c1 = Point(x: current.x + dx1, y: current.y + dy1)
                    let c2 = Point(x: current.x + dx2, y: current.y + dy2)
                    let end = Point(x: current.x + dx, y: current.y + dy)
                    lastControl = c2
                    previousCubic = true
                    path.addCurve(
                        to: transform(end),
                        control1: transform(c1),
                        control2: transform(c2))
                    current = end
                }
            case "S", "s":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let relative = command == "s"
                    let base = relative ? current : Point(x: 0, y: 0)
                    let c1 = (wasCubic || previousCubic)
                        ? Point(x: 2 * current.x - lastControl.x, y: 2 * current.y - lastControl.y)
                        : current
                    let c2 = Point(x: base.x + readDouble(), y: base.y + readDouble())
                    let end = Point(x: base.x + readDouble(), y: base.y + readDouble())
                    path.addCurve(to: transform(end), control1: transform(c1), control2: transform(c2))
                    lastControl = c2
                    current = end
                    previousCubic = true
                }
            case "Q", "q":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let relative = command == "q"
                    let base = relative ? current : Point(x: 0, y: 0)
                    let control = Point(x: base.x + readDouble(), y: base.y + readDouble())
                    let end = Point(x: base.x + readDouble(), y: base.y + readDouble())
                    path.addQuadCurve(to: transform(end), control: transform(control))
                    lastControl = control
                    current = end
                    previousQuad = true
                }
            case "T", "t":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let relative = command == "t"
                    let base = relative ? current : Point(x: 0, y: 0)
                    let control = (wasQuad || previousQuad)
                        ? Point(x: 2 * current.x - lastControl.x, y: 2 * current.y - lastControl.y)
                        : current
                    let end = Point(x: base.x + readDouble(), y: base.y + readDouble())
                    path.addQuadCurve(to: transform(end), control: transform(control))
                    lastControl = control
                    current = end
                    previousQuad = true
                }
            case "A", "a":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let rx = readDouble()
                    let ry = readDouble()
                    let rotation = readDouble()
                    let largeArc = readDouble() != 0
                    let sweep = readDouble() != 0
                    var end = Point(x: readDouble(), y: readDouble())
                    if command == "a" {
                        end = Point(x: current.x + end.x, y: current.y + end.y)
                    }
                    addArc(
                        to: path, from: current, to: end, rx: rx, ry: ry, rotation: rotation,
                        largeArc: largeArc, sweep: sweep, transform: transform)
                    current = end
                }
            case "Z", "z":
                path.closeSubpath()
                current = start
            default:
                break
            }
        }

        return path
    }

    /// SVG elliptical arc (endpoint form, spec F.6.5) as cubic Bezier segments of at most 90 degrees.
    fileprivate static func addArc(
        to path: CGMutablePath,
        from start: Point,
        to end: Point,
        rx rxIn: Double,
        ry ryIn: Double,
        rotation: Double,
        largeArc: Bool,
        sweep: Bool,
        transform: (Point) -> CGPoint
    ) {
        if start.x == end.x, start.y == end.y { return }
        var rx = abs(rxIn)
        var ry = abs(ryIn)
        guard rx > 0, ry > 0 else {
            path.addLine(to: transform(end))
            return
        }
        let phi = rotation * .pi / 180
        let cosPhi = cos(phi)
        let sinPhi = sin(phi)
        let dx = (start.x - end.x) / 2
        let dy = (start.y - end.y) / 2
        let x1p = cosPhi * dx + sinPhi * dy
        let y1p = -sinPhi * dx + cosPhi * dy
        let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
        if lambda > 1 {
            let scale = lambda.squareRoot()
            rx *= scale
            ry *= scale
        }
        let rx2 = rx * rx
        let ry2 = ry * ry
        let numerator = rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p
        let denominator = rx2 * y1p * y1p + ry2 * x1p * x1p
        let coefficient = denominator == 0 ? 0 : (max(0, numerator / denominator)).squareRoot()
        let sign: Double = largeArc == sweep ? -1 : 1
        let cxp = sign * coefficient * (rx * y1p / ry)
        let cyp = sign * coefficient * (-ry * x1p / rx)
        let cx = cosPhi * cxp - sinPhi * cyp + (start.x + end.x) / 2
        let cy = sinPhi * cxp + cosPhi * cyp + (start.y + end.y) / 2

        func angle(_ ux: Double, _ uy: Double, _ vx: Double, _ vy: Double) -> Double {
            let dot = ux * vx + uy * vy
            let length = (ux * ux + uy * uy).squareRoot() * (vx * vx + vy * vy).squareRoot()
            var value = acos(max(-1, min(1, dot / length)))
            if ux * vy - uy * vx < 0 { value = -value }
            return value
        }
        let theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
        var delta = angle(
            (x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
        if !sweep, delta > 0 { delta -= 2 * .pi }
        if sweep, delta < 0 { delta += 2 * .pi }

        let segments = max(1, Int((abs(delta) / (.pi / 2)).rounded(.up)))
        let step = delta / Double(segments)
        let handle = 4.0 / 3.0 * tan(step / 4)
        var theta = theta1
        func ellipsePoint(_ t: Double) -> Point {
            let x = rx * cos(t)
            let y = ry * sin(t)
            return Point(x: cosPhi * x - sinPhi * y + cx, y: sinPhi * x + cosPhi * y + cy)
        }
        func ellipseTangent(_ t: Double) -> Point {
            let x = -rx * sin(t)
            let y = ry * cos(t)
            return Point(x: cosPhi * x - sinPhi * y, y: sinPhi * x + cosPhi * y)
        }
        for _ in 0 ..< segments {
            let from = ellipsePoint(theta)
            let next = theta + step
            let to = ellipsePoint(next)
            let startTangent = ellipseTangent(theta)
            let endTangent = ellipseTangent(next)
            path.addCurve(
                to: transform(to),
                control1: transform(Point(x: from.x + handle * startTangent.x, y: from.y + handle * startTangent.y)),
                control2: transform(Point(x: to.x - handle * endTangent.x, y: to.y - handle * endTangent.y)))
            theta = next
        }
    }

    private static func tokenize(_ d: String) -> [String] {
        var tokens: [String] = []
        var current = ""
        for character in d {
            if character.isLetter {
                if !current.isEmpty {
                    tokens.append(current)
                    current = ""
                }
                tokens.append(String(character))
            } else if character == "," || character == " " || character == "\n" || character == "\t" {
                if !current.isEmpty {
                    tokens.append(current)
                    current = ""
                }
            } else if character == "-" && !current.isEmpty {
                tokens.append(current)
                current = String(character)
            } else if character == "." && current.contains(".") {
                // "1.5.5" is two numbers, 1.5 and .5.
                tokens.append(current)
                current = "."
            } else {
                current.append(character)
            }
        }
        if !current.isEmpty { tokens.append(current) }
        return tokens
    }
}
